import { createElementVNode, createTextVNode } from "./vdom/index"

function patch(oldVNode, vnode) {
  const isRealElement = oldVNode.nodeType
  if (isRealElement) {
    const elm = oldVNode
    const parentElm = elm.parentNode
    const newElm = createElm(vnode)
    console.log(newElm)
    parentElm.insertBefore(newElm, elm.nextSibling)
    parentElm.removeChild(elm)
    return newElm
  } else {

  }
}

function createElm(vnode) {
  let { tag, data, children, text } = vnode
  if (typeof tag === 'string') {
    vnode.el = document.createElement(tag) // 放在 vnode 上为后续 diff 算法做对比使用
    patchProps(vnode.el, data)
    children.forEach(child => vnode.el.appendChild(createElm(child)))
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

function patchProps(el, props) {
  for (let key in props) {
    if (key === 'style') {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName]
      }
    } else {
      el.setAttribute(key, props[key])
    }
  }
}

export function mountComponent(vm, el) {
  // 1. 调用 render 方法产生虚拟 DOM
  const vnode = vm._render()
  vm.$el = el
  // 2. 根据虚拟 DOM 产生真实 DOM
  vm._update(vnode)
  // 3. 插入到 el 元素中
}

export function initLifecycle(Vue) {
  Vue.prototype._update = function(vnode) {
    const el = this.$el
    // 初始化与更新
    this.$el = patch(el, vnode)
  }
  Vue.prototype._render = function() {
    return this.$options.render.call(this)
  }
  Vue.prototype._c = function() {
    return createElementVNode(this, ...arguments)
  }
  Vue.prototype._v = function() {
    return createTextVNode(this, ...arguments)
  }
  Vue.prototype._s = function(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value)
    } else {
      return value
    }
  }
}