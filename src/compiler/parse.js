// 匹配合法的标签名称，允许以_开头，中部允许使用- my-div
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`
// 捕获一个合法标签名组成的分组，允许使用命名空间:符号 my-div:test
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 匹配开始标签 <my-div:test
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配一个结束标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
/** 匹配绑定属性或事件或修饰符 */
const dirRE = /^v-|^@|^:|^\./
/** 匹配绑定属性 */
const bindRE = /^:|^\.|^v-bind:/
/** 匹配绑定事件 */
const onRE = /^@|^v-on:/
/** 匹配 v-slot: 或 v-slot$ 或 # 开头 */
const slotRE = /^v-slot(:|$)|^#/
/** 匹配for表达式 */
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
// 匹配属性，支持不带值或者单引号或者不带引号外的内容
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
// 匹配开始标签对应的结束标签，支持自闭合标签
const startTagClose = /^\s*(\/?)>/

export function parseHTML(html) {
  const ELEMENT_TYPE = 1
  const TEXT_TYPE = 3
  // 用于存放内部标签的栈，用于步进时结束一个标签后确定上一个父级
  const stack = []
  // 用于步进时确定当前在哪个标签内部
  let currentParent
  // 最终返回结果，从根节点开始的ast树
  let root
  while(html) {
    // 为 0 代表开始或结束标签，大于 0 代表文本结束位置
    let textEnd = html.indexOf('<')
    if (textEnd === 0) {
      const startTagMatch = parseStartTag()
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs)
        continue
      }
      const endTagMatch = html.match(endTag)
      if (endTagMatch) {
        end(endTagMatch[1])
        advance(endTagMatch[0].length)
      }
    } else if (textEnd > 0) {
      const text = html.substring(0, textEnd)
      chars(text)
      advance(text.length)
    }
  }
  return root

  function stackPop() {
    stack.pop()
    currentParent = stack[stack.length - 1]
  }

  function stackPush(node) {
    stack.push(node)
    currentParent = node
  }

  function createAstElement(tag, attrs, text) {
    return {
      tag,
      type: text ? TEXT_TYPE : ELEMENT_TYPE,
      attrsList: attrs, // 仅在parse阶段使用, generator阶段使用attrs
      attrsMap: makeAttrsMap(attrs), // 避免遍历查找
      children: [],
      text,
      parent: currentParent || null,
    }
  }

  /*  */
  function start(tag, attrs, text) {
    const node = createAstElement(...arguments)
    processFor(node)
    processIf(node)
    if (!root) {
      root = node
    }
    stackPush(node)
  }

  /*  */
  function chars(text) {
    text = text.replace(/\s/g, '')
    if (text) {
      start(undefined, undefined, text)
      end()
    }
  }

  /*  */
  function end() {
    const element = stack[stack.length - 1]
    stackPop()
    processKey(element)
    processRef(element)
    processSlotContent(element)
    processSlotOutlet(element)
    processComponent(element)
    processAttrs(element)
    if (currentParent) {
      if (element.slotScope) {
        const name = element.slotTarget || '"default"'
        // 设置父元素, 拥有的所有插槽
        ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element
      }
      currentParent.children.push(element)
      element.parent = currentParent
    }
    // 过滤 template
    element.children = element.children.filter(c => !c.slotScope)
  }

  function processKey(el) {
    const exp = getBindingAttr(el, 'key')
    if (exp) {
      el.key = exp
    }
  }

  function processRef(el) {
    const ref = getBindingAttr(el, 'ref')
    if (ref) {
      el.ref = ref
    }
  }

  /** 处理template插槽子元素, 赋值槽名称, 作用域变量 */
  function processSlotContent(el) {
    if (el.tag === 'template') {
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        // 插入的槽对象名称
        el.slotTarget = `"${slotBinding.name.replace(slotRE, '')}"`
        // 作用域变量
        el.slotScope = slotBinding.value || '_'
      }
    }
  }

  function processSlotOutlet(el) {
    if (el.tag === 'slot') {
      // slot插槽的名称
      el.slotName = getBindingAttr(el, 'name')
    }
  }

  function processComponent(el) {
    let binding
    if (binding = getBindingAttr(el, 'is')) {
      el.component = binding
    }
  }

  /**  */
  function processAttrs(el) {
    const { attrsList = [] } = el
    if (!attrsList.length) return
    const attrs = (el.attrs || (el.attrs = []))
    attrsList.forEach(i => {
      const { name, value } = i
      // 是否为事件或指令
      if (dirRE.test(name)) {
        if (bindRE.test(name)) {
          attrs.push({ name: name.replace(bindRE, ''), value })
        } else if (onRE.test(name)) {
          i.name = name.replace(onRE, '')
          let events = el.events || (el.events = {})
          events[i.name] = {
            value: i.value
          }
        } else {
          i.name = name.replace(dirRE, '')
        }
      } else {
        // 保存 genCode 阶段使用的属性
        attrs.push({ name, value: JSON.stringify(value) })
      }
    })
  }

  function processFor(node) {
    const exp = getAndRemoveAttr(node, 'v-for', true)
    if (exp) {
      const matchRes = exp.match(forAliasRE)
      if (!matchRes) return
      node.for = matchRes[2].trim()
      const alias = matchRes[1].trim()
      node.alias = alias
    }
  }

  function processIf(node) {
    const exp = getAndRemoveAttr(node, 'v-if', true)
    if (exp) {
      node.if = exp
      if (!node.ifConditions) {
        node.ifConditions = []
      }
      node.ifConditions.push({
        exp,
        block: node
      })
    }
  }

  /** 通过正则获取并在原对象中移除对应名称属性, 返回{name:xx,value:xx} */
  function getAndRemoveAttrByRegex(el, name) {
    const list = el.attrsList
    for (const i in list) {
      const attr = list[i]
      if (name.test(attr.name)) {
        list.splice(i, 1)
        return attr
      }
    }
  }

  function makeAttrsMap(attrs) {
    const map = {}
    attrs?.forEach(i => {
      map[i.name] = i.value
    })
    return map
  }

  function getBindingAttr(el, name) {
    const dynamicValue = getAndRemoveAttr(el, ':' + name)
    if (dynamicValue) {
      return dynamicValue
    } else {
      return JSON.stringify(getAndRemoveAttr(el, name, true))
    }
  }

  function getAndRemoveAttr(el, name, removeFromMap) {
    let val
    if ((val = el.attrsMap[name]) != null) {
      const list = el.attrsList
      for (let i = 0; i < list.length; i++) {
        if (list[i].name === name) {
          list.splice(i, 1)
          break
        }
      }
    }
    if (removeFromMap) {
      delete el.attrsMap[name]
    }
    return val
  }

  /* 处理开始标签 */
  function parseStartTag() {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
      }
      advance(start[0].length)
      let attr, end
      // 匹配标签属性直到开始标签结束，如果没匹配到开始标签对应的结束标签 && 继续匹配属性
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length)
        match.attrs.push({ name: attr[1], value: attr[3] || attr[4] || attr[5] })
      }
      if (end) {
        advance(end[0].length)
      }
      return match
    }
    return false
  }

  // 步进字符串
  function advance(n) {
    html = html.substring(n)
  }
}