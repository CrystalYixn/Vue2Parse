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
function genElement(ast) {
  if (ast.for && !ast.forProcessed) {
    return genFor(ast)
  } else if (ast.if && !ast.ifProcessed) {
    return genIf(ast)
  }
  let children = genChildren(ast.children)
  let code = `_c('${ast.tag}', ${ ast.attrs.length ? genProps(ast.attrs) : 'null' }${ ast.children.length ? `, ${children}` : '' })`
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

/** 返回形如"_v("年龄" + _s(age)), _c("div", null)" 的字符串 */
function genChildren(children) {
  if (children) {
    return children.map(child => gen(child)).join(',')
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