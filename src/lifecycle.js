import Watcher from "./observe/watcher"
import { createElementVNode, createTextVNode } from "./vdom/index"
import { patch } from "./vdom/patch"

export function mountComponent(vm, el) {
  // 1. 调用 render 方法产生虚拟 DOM
  vm.$el = el
  const updateComponent = () => {
    // 2. 根据虚拟 DOM 产生真实 DOM
    const vnode = vm._render()
    // 3. 插入到 el 元素中
    vm._update(vnode)
  }
  new Watcher(vm, updateComponent, true)
}

export function initLifecycle(Vue) {
  Vue.prototype._update = function(vnode) {
    const el = this.$el
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

export function callHook(vm, hook) {
  const handlers = vm.$options[hook]
  if (handlers) {
    handlers.forEach(handler => handler.call(vm))
  }
}