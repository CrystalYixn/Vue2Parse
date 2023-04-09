function Vue(options = {}) {
  const vm = this
  const { el, data = {}, template, computed = {}, watch = {} } = options

  // 数据初始化
  // 1. 数据劫持
  observe()
  // 2. 数据代理
  proxy()
  // 初始化计算属性
  initComputed()
  initWatch()

  // 模板编译
  if (el) {

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
  }


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
  // 如果有nodeType属性则为真实节点，否则为VNode
  if (oldNode.nodeType) {
    const parentElm = oldNode.parentNode
    const newElm = createElm(vnode)
    parentElm.insertBefore(newElm, oldNode.nextSibling)
    parentElm.removeChild(oldNode)
    return newElm
  } else {
    return patchVNode(oldNode, vnode)
  }
}

function isSameNode(oldNode, vnode) {
  const { data: oData, tag: oTag } = oldNode
  const { data, tag: tag } = vnode
  const oKey = oData?.key
  const key = data?.key
  return oKey === key && oTag === tag
}

// 创建真实DOM元素
function createElm(vnode) {
  console.log('createElm')
  let { tag, children, text } = vnode
  if (tag) {
    vnode.el = document.createElement(tag)
    children.forEach(child => vnode.el.appendChild(createElm(child)))
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

// diff算法, 比较两个vnode
function patchVNode(oldNode, vnode) {
  const el = vnode.el = oldNode.el
  // 新旧节点相同则直接替换
  if (!isSameNode(oldNode, vnode)) {
    return oldNode.el.parentNode.replaceChild(createElm(vnode), oldNode.el)
  }
  // FIX 文本节点不是触发了上面然后return了吗？
  // 文本节点处理
  if (!vnode.tag) {
    oldNode.el.textContext = vnode.text
  }
  const oldChildren = oldNode.children || []
  const children = vnode.children || []

  const map = Object.fromEntries(oldChildren.map((i, idx) => [i.data?.key, idx]))
  // 旧列表头尾双指针
  let oldStartIndex = 0
  let oldEndIndex = oldChildren.length - 1
  let oldStartNode = oldChildren[oldStartIndex]
  let oldEndNode = oldChildren[oldEndIndex]
  // 新列表头尾双指针
  let startIndex = 0
  let endIndex = children.length - 1
  let startNode = children[startIndex]
  let endNode = children[endIndex]
  // 判断完所有新元素或判断完所有旧元素则循环终止
  while(oldStartIndex <= oldEndIndex && startIndex <= endIndex) {
    // 如果元素已被移动则跳至下一个
    if (!oldStartNode) {
      oldStartNode = oldChildren[++oldStartIndex]
    } else if (!oldEndNode) {
      oldEndNode = oldChildren[--oldEndIndex]
    } else if (isSameNode(oldStartNode, startNode)) {
      // push情况
      oldStartNode = oldChildren[++oldStartIndex]
      startNode = children[++startIndex]
    } else if (isSameNode(oldEndNode, endNode)) {
      // unshift情况
      oldEndNode = oldChildren[--oldEndIndex]
      endNode = children[--endIndex]
    } else if (isSameNode(oldStartNode, endNode)) { // sort与reverse
      el.insertBefore(oldStartNode.el, oldEndNode.el.nextSibling)
      oldStartNode = oldChildren[++oldStartIndex]
      endNode = children[--endIndex]
    } else if (isSameNode(oldEndNode, startNode)) {
      // 为什么需要相似的头尾与尾头比较? ——在sort情况下可能出现某个头元素移动到末尾的情况时与顺序比对结合使用能得出最少的更新方式
      // a b c d ->  b x d v
      el.insertBefore(oldEndNode.el, oldStartNode.el)
      oldEndNode = oldChildren[--oldEndIndex]
      startNode = children[++startIndex]
    } else if (startNode.data?.key in map) {
      const moveIndex = map[startNode.data?.key]
      const moveNode = oldChildren[moveIndex]
      el.insertBefore(moveNode.el, oldStartNode.el)
      // 标识旧列表中原先顺序位置的元素已被移动
      oldChildren[moveIndex] = undefined
      startNode = children[++startIndex]
    } else {
      el.insertBefore(createElm(startNode), oldStartNode.el)
      startNode = children[++startIndex]
    }
  }
  // 遍历所有未判断到的新列表元素, 需要追加或插入元素
  if (startIndex <= endIndex) {
    for (let i = startIndex; i <= endIndex; ++i) {
      // 尾指针的后一个元素存在时为插入操作, 否则为追加操作
      if (children[endIndex + 1]) {
        // 已知尾指针指向不是最后一个元素
        // 推导得新列表最后一个元素在旧列表中存在, 新列表最后一个元素不用追加或插入, 追加操作一定是将元素添加到末尾
        // 结论一定是插入操作

        // 要插入的点一定是有真实元素的点, 因此用oldChildren
        el.insertBefore(createElm(children[i]), oldChildren[oldEndIndex + 1].el)
      } else {
        // 已知只有新旧列表有相同元素时尾指针才会移动, 
        // 设尾指针指向最后一个元素, 可以推断出尾指针没有移动, 再推断出新旧列表末尾元素不同, 得到结论需要追加不同的元素
        el.appendChild(createElm(children[i]))
      }
    }
  }
  // 遍历所有未判断到的旧列表元素, 需要移除元素
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      const node = oldChildren[i]
      if (node) {
        el.removeChild(node.el)
      }
    }
  }
  return el
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
