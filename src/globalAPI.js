import KeepAlive from "./keep-alive"
import { mergeOptions } from "./utils"

export function initGlobalAPI(Vue) {
  Vue.cid = 0
  let cid = 1

  Vue.options = {
    _base: Vue
  }
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }

  /* 获得一个继承Vue的子组件构造函数，可以挂载元素 */
  Vue.extend = function(options) {
    const SuperId = Vue.cid
    // 缓存过的组件选项对象上会添加一个_Ctor属性
    const cachedCtors = options._Ctor || (options._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    function Sub(options = {}) {
      this._init(options)
    }
    // 创建了一个空对象作为原型对象，由于Object.create更改了构造函数的prototype，显示对象的实例类型时会去读取原型的构造函数，所以显示为一个Vue对象，空对象的__proto__指向Vue.prototype
    Sub.prototype = Object.create(Vue.prototype)
    // 更改的是空对象的constructor属性，而不是空对象的原型上的
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(Vue.options, options)

    cachedCtors[SuperId] = Sub
    return Sub
  }

  Vue.options.components = {}
  Vue.options.components['keep-alive'] = KeepAlive
  Vue.component = function(id, definition) {
    definition = typeof definition === 'function' ? definition : Vue.extend(definition)
    Vue.options.components[id] = definition
  }
}
