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
    // 创建了一个空对象作为原型对象，由于Object.create更改了构造函数的prototype，显示对象的实例类型时会去读取原型的构造函数，所以显示为一个Vue对象，空对象的__proto__指向Vue.prototype
    Sub.prototype = Object.create(Vue.prototype)
    // 更改的是空对象的constructor属性，而不是空对象的原型上的
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
