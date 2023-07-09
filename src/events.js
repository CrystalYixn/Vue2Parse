export function initEvents(vm) {
  vm._events = {}
  // 如果是组件则尝试从父级vnode上获取绑定的事件
  const listeners = vm.$options._parentListeners
  if (listeners) {
    for (const name in listeners) {
      // 事件实际绑定在了子组件上, 触发也是在子组件上触发, 不过执行的方法是父对象的方法
      vm.$on(name, listeners[name])
    }
  }
}

export function eventsMixin(Vue) {
  Vue.prototype.$on = function(event, fn) {
    const vm = this;
    (vm._events[event] || (vm._events[event] = [])).push(fn)
  }

  Vue.prototype.$emit = function(event) {
    const vm = this
    let cbs = vm._events[event]
    for (let i = 0, l = cbs.length; i < l; i++) {
      cbs[i]()
    }
  }
}