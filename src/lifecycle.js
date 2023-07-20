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
  vm.$scopedSlots = {}

}

/** 解析默认插槽 */
export function resolveSlots(children) {
  // 具名插槽与作用域插槽没有孩子
  if (!children?.length) return {}
  const slots = {}
  children.forEach(child => {
    (slots.default || (slots.default = [])).push(child)
  })
  return slots
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
    const { _parentVnode } = this.$options
    if (_parentVnode) {
      // 两者基本等价
      // this.$scopedSlots = _parentVnode.data.scopedSlots
      this.$scopedSlots = normalizeScopedSlots(_parentVnode.data.scopedSlots, this.$slots)
    }
    this.$vnode = _parentVnode
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
  function renderSlot(name, props) {
    const scopedSlotFn = this.$scopedSlots[name]
    let nodes
    if (scopedSlotFn) {
      nodes = scopedSlotFn(props)
    } else {
      nodes = this.$slots[name]
    }
    return nodes
  }
  /** 解析作用域插槽为一个对象, 保存在 vnode.data.scopedSlots 中 */
  Vue.prototype._u = resolveScopedSlots
  function resolveScopedSlots(fns, res = {}) {
    for (let i = 0; i < fns.length; i++) {
      const slot = fns[i]
      // 如果此处不需要递归则可以直接在 generate 阶段生成对象, 不再需要vm._c
      if (Array.isArray(slot)) {
        resolveScopedSlots(slot, res)
      } else if (slot) {
        res[slot.key] = slot.fn
      }
    }
    return res
  }
}

/** 获取具名插槽并包装函数作用域 */
export function normalizeScopedSlots(slots, normalSlots) {
  let res = {}
  if (!slots) return res
  for (const key in slots) {
    // 原方案
    // res[key] = normalizeScopedSlot(normalSlots, key, slots[key])
    res[key] = slots[key]
  }
  // for (const key in normalSlots) {
  //   if (!(key in res)) {
  //     res[key] = () => normalSlots[key]
  //   }
  // }
  return res
}

// /** 包装函数作用域, 进行插槽代理 */
// function normalizeScopedSlot(normalSlots, key, fn) {
//   const normalized = (scope = {}) => {
//     const res = fn(scope)
//     return [res]
//   }
//   if (!(key in normalSlots)) {
//     Object.defineProperty(normalSlots, key, {
//       get: normalized
//     })
//   }
//   return normalized
// }

export function callHook(vm, hook) {
  const handlers = vm.$options[hook]
  if (handlers) {
    handlers.forEach(handler => handler.call(vm))
  }
}