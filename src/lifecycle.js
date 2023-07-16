import Watcher from "./observe/watcher"
import { createElementVNode, createTextVNode } from "./vdom/index"
import { patch } from "./vdom/patch"

/** 方便一部分方法获取实例, 而不需要传入参数 */
export let activeInstance = null

export function setActiveInstance(vm) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}

export function mountComponent(vm, el) {
  // 1. 调用 render 方法产生虚拟 DOM
  vm.$el = el
  const updateComponent = () => {
    // 2. 创建 VNode
    const vnode = vm._render()
    // 3. 根据虚拟 DOM 产生真实 DOM，插入到 el 元素中
    vm._update(vnode)
  }
  new Watcher(vm, updateComponent, null, null, true)
  if (!vm.$vnode) {
    // 根组件调用
    callHook(vm, 'mounted')
  }
}

export function initLifecycle(vm) {
  let parent = vm.$options.parent
  if (parent) {
    parent.$children.push(vm)
  }
  vm.$refs = {}
  vm.$parent = parent
  vm.$children = []
}

export function initRender(vm) {
  const opts = vm.$options
  vm.$slots = resolveSlots(opts._renderChildren)

  function resolveSlots(children) {
    if (!children?.length) return {}
    const slots = {}
    children.forEach(child => {
      (slots.default || (slots.default = [])).push(child)
    })
    return slots
  }
}

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function(vnode) {
    const restoreActiveInstance = setActiveInstance(this)
    const prevVnode = this._vnode
    // 将组件产生的虚拟节点保存
    this._vnode = vnode
    if (prevVnode) {
      // 直接对比两个vnode，尽量复用$el部分更新
      this.$el = patch(prevVnode, vnode)
    } else {
      // 视为初始化，直接替换$el的内容
      this.$el = patch(this.$el, vnode)
    }
    restoreActiveInstance()
  }
  Vue.prototype._render = function() {
    this.$vnode = this.$options._parentVnode
    const vnode = this.$options.render.call(this)
    vnode.parent = this.$vnode
    return vnode 
  }
  Vue.prototype._c = function() {
    return createElementVNode(this, ...arguments)
  }
  Vue.prototype._v = function() {
    return createTextVNode(this, ...arguments)
  }
  Vue.prototype.$forceUpdate = function () {
    const vm = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }
  /** 创建 mustache 内容 */
  Vue.prototype._s = function(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value)
    } else {
      return value
    }
  }
  /** 创建重复循环内容 */
  Vue.prototype._l = renderList
  function renderList(val, render) {
    let ret = []
    if (typeof val === 'number') {
      ret = new Array(val)
      for (let i = 0; i < val; i++) {
        ret[i] = render(i + 1, i)
      }
    }
    return ret
  }
  /** 创建插槽内容 */
  Vue.prototype._t = renderSlot
  function renderSlot(name) {
    let nodes
    nodes = this.$slots[name]
    return nodes
  }
}

export function callHook(vm, hook) {
  const handlers = vm.$options[hook]
  if (handlers) {
    handlers.forEach(handler => handler.call(vm))
  }
}