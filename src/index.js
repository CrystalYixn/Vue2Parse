import { compileToFunciton } from "./compiler/index"
import { initGlobalAPI } from "./globalAPI"
import { initMixin } from "./init"
import { initLifecycle } from "./lifecycle"
import { initStateMixin } from "./state"
import { createElm, patch } from "./vdom/patch"

function Vue(options) {
  this._init(options)
}

initMixin(Vue)
initLifecycle(Vue)
initGlobalAPI(Vue)
initStateMixin(Vue)

export default Vue