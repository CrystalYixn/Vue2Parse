function Vue(options) {
  const vm = this
  const { el, data, template, computed = {}, watch = {} } = options

  // 数据初始化
  // 1. 数据劫持
  observe()
  // 2. 数据代理
  proxy()
  // 初始化计算属性
  initComputed()
  initWatch()

  // 模板编译
  const element = document.querySelector(el)
  const tmp = template || element.outerHTML
  const render = compileToFunction(tmp)

  // 渲染元素
  // 初始化$el
  vm.$el = element
  vm._update = () => {
    // 1. 创建vnode
    const vnode = render.call(vm)
    // 2. 更新DOM元素
    vm.$el = patch(vm.$el, vnode)
  }
  new Watcher(vm, vm._update)

  function observe() {
    const dep = new Dep()
    Object.keys(data).forEach(k => {
      let val = data[k]
      Object.defineProperty(data, k, {
        get() {
          // 依赖收集
          if (Dep.target) {
            dep.subs.push(Dep.target)
            Dep.target.deps.push(dep)
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

  function initComputed() {
    Object.keys(computed).forEach(key => {
      const fn = computed[key]
      let watcher = new Watcher(vm, fn, { lazy: true })
      Object.defineProperty(vm, key, {
        get() {
          if (watcher.dirty) {
            watcher.evaluate()
          }
          // 继续向上收集依赖
          if (Dep.target) {
            watcher.deps.forEach(i => {
              i.subs.push(Dep.target)
              Dep.target.deps.push(i)
            })
          }
          return watcher.value
        }
      })
    })
  }

  function initWatch() {
    Object.keys(watch).forEach(k => {
      const cb = watch[k]
      new Watcher(vm, k, { user: true }, cb)
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

  function compileToFunction(template) {
    // 1. 解析 Ast
    let ast = parseHTML(template)
    // 2. 生成 render 函数
    let code = codegen(ast)
    code = `with(this){return ${code}}`
    let render = new Function(code)
    return render
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
const depStack = []
// 存放当前正在渲染的 更新触发器
Dep.prototype.target = null

// 更新触发器对象，每个更新触发器都保存一个执行函数（组件更新、计算属性更新）
function Watcher(vm, expOrFn, option = {}, cb) {
  const { lazy, user } = option
  this.lazy = lazy
  this.dirty = lazy
  this.deps = []
  this.user = user
  this.cb = cb
  const fn = user ? () => vm[expOrFn] : expOrFn
  this.get = () => {
    depStack.push(this)
    Dep.target = this
    const value = fn.call(vm)
    depStack.pop()
    Dep.target = depStack[depStack.length - 1]
    return value
  }
  this.update = () => {
    const ov = this.value
    // 如果是计算属性
    if (this.lazy) {
      this.dirty = true
    } else {
      this.value = this.get()
    }
    if (this.user) {
      cb.call(vm, this.value, ov)
    }
  }
  this.evaluate = () => {
    this.value = this.get()
  }
  this.value = this.lazy ? undefined : this.get()
}

initMixin(Vue)