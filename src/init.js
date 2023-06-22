import { initState } from "./state"
import { compileToFunction } from "./compiler/index"
import { callHook, mountComponent } from "./lifecycle"
import { mergeOptions } from "./utils"
import { defineReactive } from "./observe/index"

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
      template && (ops.render = compileToFunction(template))
    }
    mountComponent(vm, el)
  }

  Vue.prototype.$set = function(target, key, val) {
    target[key] = val
    if (typeof val === 'object') {
      defineReactive(val)
    }
    target.__ob__.dep.notify()
  }
}
