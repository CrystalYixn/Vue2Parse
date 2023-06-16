import { parseHTML } from "./parse";
// 匹配 mustach 语法
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

export function compileToFunction(template) {
  // 1. 解析 Ast
  let ast = parseHTML(template)
  // 2. 生成 render 函数
  let code = codegen(ast)
  code = `with(this){return ${code}}`
  let render = new Function(code)
  return render
}

function codegen(ast) {
  let children = genChildren(ast.children)
  let code = `_c('${ast.tag}', ${ ast.attrs.length ? genProps(ast.attrs) : 'null' }${ ast.children.length ? `, ${children}` : '' })`
  return code
}

function genProps(attrs) {
  let str = ''
  attrs.forEach(attr => {
    if (attr.name === 'style') {
      attr.value = attr.value.split(';').filter(i => i).reduce((preVal, curVal) => {
        const [key, val] = curVal.split(':')
        preVal[key] = val
        return preVal
      }, {})
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  })
  return `{${str.slice(0, -1)}}`
}

function genChildren(children) {
  if (children) {
    return children.map(child => gen(child)).join(',')
  }
}

function gen(node) {
  if (node.type === 1) {
    return codegen(node)
  } else {
    const { text } = node
    if (defaultTagRE.test(text)) {
      let tokens = []
      let match
      let lastIndex = 0
      defaultTagRE.lastIndex = 0
      while (match = defaultTagRE.exec(text)) {
        let index = match.index
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)))
        }
        tokens.push(`_s(${match[1].trim()})`)
        lastIndex = index + match[0].length
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
      }
      return `_v(${ tokens.join('+') })`
    } else {
      return `_v(${JSON.stringify(text)})`
    }
  }
}