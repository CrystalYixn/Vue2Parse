import { initState } from "./state"
import { initEvents } from "./events"
import { compileToFunction } from "./compiler/index"
import { callHook, initLifecycle, mountComponent, initRender } from "./lifecycle"
import { initInjections, initProvide } from "./inject"
import { mergeOptions } from "./utils"
import { defineReactive } from "./observe/index"

export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    const vm = this
    // 初始化组件, 包括从父亲继承来的props, 此处的options可能是创建组件时的特殊对象而不是用户传入的标准对象
    if (options._isComponent) {
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(this.constructor.options, options)
    }
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm)
    initState(vm)
    initProvide(vm)
    callHook(vm, 'created')
    if (options.el) {
      vm.$mount(options.el)
    }

    function initInternalComponent(vm, options) {
      // 定义propsData存储解析的数据, props则用于记录用户的传入选项
      // _parentVnode指向的是自定义标签的vnode, 而当前vnode则是实际的标签vnode, 所以需要从父vnode上获取props等信息
      const vnodeComponentOptions = options._parentVnode.componentOptions
      const opts = vm.$options = vm.constructor.options
      opts.parent = options.parent
      opts.propsData = vnodeComponentOptions.propsData
      opts._parentListeners = vnodeComponentOptions.listeners
      opts._renderChildren = vnodeComponentOptions.children
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
