import { mergeOptions } from "./utils"

export function initGlobalAPI(Vue) {
  Vue.options = {
    _base: Vue
  }
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
  Vue.extend = function(options) {
    function Sub(options = {}) {
      this._init(options)
    }
    // Sub.prototype = Object.create(Vue.prototype)
    Sub.prototype = new Vue({})
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(Vue.options, options)
    return Sub
  }
  Vue.options.components = {}
  Vue.components = function(id, definition) {
    Vue.options.components[id] = typeof definition === 'function' ? definition : Vue.extend(definition)
  }
}
