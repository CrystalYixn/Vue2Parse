function Vue(options) {
  const vm = this
  const { el, data, template } = options

  // 数据初始化
  // 1. 数据劫持
  observe()
  // 2. 数据代理
  proxy()

  // 模板编译
  const element = document.querySelector(el)
  const tmp = template || element.outerHTML
  // 1. 将html字符串转为ast抽象语法树
  const ast = parseHTML(tmp)
  // 2. 将ast转换为render函数
  const render = codeGen(ast)

  // 渲染元素
  // 初始化$el
  vm.$el = element
  vm._update = () => {
    // 1. 创建vnode
    const vnode = render.call(vm)
    // 2. 更新DOM元素
    vm.$el = patch(vm.$el, vnode)
  }
  new Watcher(vm._update)

  function observe() {
    const dep = new Dep()
    Object.keys(data).forEach(k => {
      let val = data[k]
      Object.defineProperty(data, k, {
        get() {
          // 依赖收集
          if (Dep.target) {
            dep.subs.push(Dep.target)
          }
          return val
        },
        set(nv) {
          val = nv
          // 更新派发
          dep.subs.forEach(w => w.update())
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
    return newElm
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
  // 创建标签vnode
  Vue.prototype._c = function(tag, data, ...children) {
    return {
      tag,
      data,
      children,
      text: undefined,
    }
  }
  // 创建文本vnode
  Vue.prototype._v = function(text) {
    return {
      tag: undefined,
      data: undefined,
      children: undefined,
      text,
    }
  }
  // 渲染文本内容
  Vue.prototype._s = function(value) {
    return value
  }
}

// 依赖处理对象
function Dep() {
  // 存放更新触发器
  this.subs = []
}
// 存放当前正在渲染的 更新触发器
Dep.prototype.target = null

// 更新触发器对象，每个组件绑定一个更新触发器，用于保存渲染函数
function Watcher(fn) {
  this.update = () => {
    Dep.target = this
    // 组件渲染方法
    fn()
    Dep.target = null
  }
  this.update()
}

initMixin(Vue)