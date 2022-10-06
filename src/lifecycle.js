export function mountComponent(vm, el) {
  // 1. 调用 render 方法产生虚拟 DOM
  vm._render()
  // 2. 根据虚拟 DOM 产生真实 DOM
  vm._update()
  // 3. 插入到 el 元素中
}

export function initLifecycle(Vue) {
  Vue.prototype._update = function() {
    
  }
  Vue.prototype._render = function() {
    
  }
}