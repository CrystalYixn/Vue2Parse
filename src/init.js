import { initState } from "./state"

export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    const vm = this
    vm.$options = options // 初始化时将用户选项挂载到实例上，方便其他扩展方法读取

    initState(vm)
  }
}
