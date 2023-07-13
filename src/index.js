import { initGlobalAPI } from "./globalAPI"
import { initMixin } from "./init"
import { eventsMixin } from "./events"
import { lifecycleMixin } from "./lifecycle"
import { initStateMixin } from "./state"

function Vue(options) {
  this._init(options)
}

initMixin(Vue) // 挂载_init, $set, $mount
eventsMixin(Vue) // 挂载$on, $emit
lifecycleMixin(Vue) // 挂载_update, _c, _v等方法
initGlobalAPI(Vue) // 挂载全局静态方法extend, component, mixin
initStateMixin(Vue) // 挂载$watch, $nextTick

export default Vue