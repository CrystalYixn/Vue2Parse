// 匹配合法的标签名称，允许以_开头，中部允许使用- my-div
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`
// 捕获一个合法标签名组成的分组，允许使用命名空间:符号 my-div:test
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 匹配开始标签 <my-div:test
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配一个结束标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
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
    currentParent && currentParent.children.push(node)
    currentParent = node
  }

  function createAstElement(tag, attrs, text) {
    return {
      tag,
      type: text ? TEXT_TYPE : ELEMENT_TYPE,
      attrs,
      children: [],
      text,
      parent: currentParent || null,
    }
  }

  /*  */
  function start(tag, attrs, text) {
    const node = createAstElement(...arguments)
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
    stackPop()
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