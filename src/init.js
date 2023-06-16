import { initState } from "./state"
import { compileToFunction } from "./compiler/index"
import { callHook, mountComponent } from "./lifecycle"
import { mergeOptions } from "./utils"

export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    const vm = this
    vm.$options = mergeOptions(this.constructor.options, options) // 初始化时将用户选项挂载到实例上，方便其他扩展方法读取
    callHook(vm, 'beforeCreate')
    initState(vm)
    callHook(vm, 'created')
    if (options.el) {
      vm.$mount(options.el)
    }
  }

  Vue.prototype.$mount = function(el) {
    const vm = this
    el = document.querySelector(el)
    const ops = vm.$options
    if (!ops.render) {
      let template
      if (ops.template) {
        template = ops.template
      } else if (el) {
        template = el.outerHTML
      }
      ops.render = compileToFunction(template)
    }
    mountComponent(vm, el)
  }
}
