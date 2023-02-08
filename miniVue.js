function Vue(options) {
  const vm = this
  const { el, data, template } = options

  // 数据劫持
  observe()

  // 数据代理
  proxy()

  // 模板编译
  const element = document.querySelector(el)
  const tmp = template || element.outerHTML
  // 1. 将html字符串转为ast抽象语法树
  const ast = parseHTML(tmp)
  // 2. 将ast转换为render函数
  const render = codeGen(ast)
  // 3. 创建vnode
  const vnode = render.call(vm)

  // 渲染元素
  patch(element, vnode)

  function observe() {
    Object.keys(data).forEach(k => {
      let val = data[k]
      Object.defineProperty(data, k, {
        get() {
          return val
        },
        set(nv) {
          val = nv
        }
      })
    })
  }

  function proxy() {
    for (const k in data) {
      Object.defineProperty(vm, k, {
        get() {
          return data[k]
        },
        set(nv) {
          data[k] = nv
        }
      })
    }
  }

  // 解析html字符串为ast
  function parseHTML(tmp) {
    return {
      tag: 'div',
      type: 1,
      attrs: [{ name: 'id', value: 'app' }],
      children: [{
        tag: undefined,
        type: 3,
        attrs: undefined,
        children: [],
        text: '{{name}}',
        // 指向父级
        parent: '...',
      }],
      text: undefined,
      parent: null,
    }
  }

  // 生成render函数
  function codeGen(ast) {
    const code = `_c('div', {id:"app"}, _v(_s(name)))`
    return new Function(`with(this) {return ${code}}`)
  }

  // 更新元素
  function patch(oldNode, vnode) {
    const parentElm = oldNode.parentNode
    const newElm = createElm(vnode)
    parentElm.insertBefore(newElm, oldNode.nextSibling)
    parentElm.removeChild(oldNode)
  }

  // 创建真实DOM元素
  function createElm(vnode) {
    let { tag, children, text } = vnode
    if (tag) {
      vnode.el = document.createElement(tag)
      children.forEach(child => vnode.el.appendChild(createElm(child)))
    } else {
      vnode.el = document.createTextNode(text)
    }
    return vnode.el
  }
}

function initMixin(Vue) {
  Vue.prototype._c = function(tag, data, ...children) {
    return {
      tag,
      data,
      children,
      text: undefined,
    }
  }
  Vue.prototype._v = function(text) {
    return {
      tag: undefined,
      data: undefined,
      children: undefined,
      text,
    }
  }
  Vue.prototype._s = function(value) {
    return value
  }
}

initMixin(Vue)
