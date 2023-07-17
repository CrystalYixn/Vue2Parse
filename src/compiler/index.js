import { parseHTML } from "./parse";
// 匹配 mustache 语法
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

export function compileToFunction(template) {
  // 1. 解析 Ast
  let ast = parseHTML(template)
  // 2. 生成 render 函数
  let code = genElement(ast)
  code = `with(this){return ${code}}`
  let render = new Function(code)
  return render
}

/** ast转为字符串 */
function genElement(el) {
  if (el.for && !el.forProcessed) {
    return genFor(el)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el)
  } else if (el.tag === 'template' && !el.slotTarget) {
    return genChildren(el) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el)
  }
  let children = genChildren(el)
  let code = `_c('${el.tag}', ${genData(el)}${ el.children.length ? `, ${children}` : '' })`
  return code
}

/**  */
function genFor(ast) {
  ast.forProcessed = true
  // 此处跟vue不同, vue调用函数传递的是children数组, 此处需要展开以便createElementVNode接收
  return `..._l((${ast.for}), function(${ast.alias}) {
    return ${genElement(ast)}
  })`
}

/**  */
function genIf(ast) {
  ast.ifProcessed = true
  if (!ast.ifConditions.length) return `_v('')`
  const condition = ast.ifConditions.shift()
  // v-if=表达式需要递归
  if (condition.exp) {
    return `(${condition.exp})?${
      genElement(condition.block)
    }:${
      genIf(ast)
    }`
  } else {
    return `${genElement(condition.block)}`
  }
}

function genSlot(el) {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el)
  let res = `_t(${slotName}${children ? `, ${children}` : ''}`
  const attrs = el.attrs && `{${el.attrs.map(i => `"${i.name}":${i.value}`).join(',')}}`
  if (attrs) {
    res += `,${attrs}`
  }
  return res + ')'
}

function genData(el) {
  let data = '{'
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`
  }
  if (el.events) {
    data += `${genHandlers(el.events)},`
  }
  if (el.scopedSlots) {
    data += `${genScopedSlots(el.scopedSlots)},`
  }
  data += '}'
  return data
}

/** 返回形如  的字符串 */
function genScopedSlots(slots) {
  return `scopedSlots:_u([
    ${Object.keys(slots).map(key => {
      const el = slots[key]
      const fn = `function(${el.slotScope}){
        return ${el.tag === 'template'
          ? genChildren(el)
          : genElement(el)
        }
      }`
      return `{key:${el.slotTarget || '"default"'}, fn:${fn}}`
      // return 
    }).join(',')}
  ])`
  // 采用此方案则不再需要vm._u, 唯一不同在于没有对slot进行递归处理
  // return `scopedSlots: {
  //   ${Object.keys(slots).map(key => {
  //     const el = slots[key]
  //     const fn = `function(${el.slotScope}){
  //       return ${el.tag === 'template'
  //         ? genChildren(el)
  //         : genElement(el)
  //       }
  //     }`
  //     return `${el.slotTarget || '"default"'}:${fn}`
  //   }).join(',')}
  // }`
}

/** 返回形如 on:{"click":myMethod} 的字符串 */
function genHandlers(events) {
  const prefix = 'on:'
  let staticHandlers = ''
  for (const name in events) {
    const handlerCode = events[name].value
    staticHandlers += `"${name}":${handlerCode},`
  }
  staticHandlers = `{${staticHandlers.slice(0, -1)}}`
  return prefix + staticHandlers
}

/** 返回形如 { id:'app', style: {margin: 'top'} }的字符串 */
function genProps(attrs) {
  let str = ''
  attrs.forEach(attr => {
    // style会转换为 { margin: 'top', display: 'block' } 形式对象
    if (attr.name === 'style') {
      attr.value = attr.value.split(';').filter(i => i).reduce((preVal, curVal) => {
        const [key, val] = curVal.split(':')
        preVal[key] = val
        return preVal
      }, {})
    }
    str += `${attr.name}:${attr.value},`
  })
  // 去除末尾逗号
  return `{${str.slice(0, -1)}}`
}

/** 返回形如"[_v("年龄" + _s(age)), _c("div", null)]" 的字符串 */
function genChildren(el) {
  const { children } = el
  if (children?.length) {
    return `[${children.map(child => gen(child)).join(', ')}]`
  }
}

/** 根据nodeType返回形如 '_v("年龄:"+_s(age))' 的字符串 */
function gen(node) {
  if (node.type === 1) {
    return genElement(node)
  } else {
    const { text } = node
    if (defaultTagRE.test(text)) {
      // 存放分段 ['"年龄:"', '_s(age)']
      let tokens = []
      let match
      // 已消耗的字符数量
      let lastIndex = 0
      // 重置Reg对象的指针位置
      defaultTagRE.lastIndex = 0
      // 循环找出所有模板变量
      while (match = defaultTagRE.exec(text)) {
        let index = match.index
        // 如果下一个模板变量的起始位置大于上次的结尾，则证明模板变量前有普通字符串
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)))
        }
        tokens.push(`_s(${match[1].trim()})`)
        lastIndex = index + match[0].length
      }
      // 末尾还有普通字符串
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
      }
      return `_v(${ tokens.join('+') })`
    } else {
      return `_v(${JSON.stringify(text)})`
    }
  }
}