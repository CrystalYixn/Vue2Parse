import { mergeOptions } from "./utils"

export function initGlobalAPI(Vue) {
  Vue.options = {
    _base: Vue
  }
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }

  /* 获得一个继承Vue的子组件构造函数，可以挂载元素 */
  Vue.extend = function(options) {
    function Sub(options = {}) {
      this._init(options)
    }
    Sub.prototype = Object.create(Vue.prototype)
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(Vue.options, options)
    return Sub
  }

  Vue.options.components = {}
  Vue.component = function(id, definition) {
    definition = typeof definition === 'function' ? definition : Vue.extend(definition)
    Vue.options.components[id] = definition
  }
}
