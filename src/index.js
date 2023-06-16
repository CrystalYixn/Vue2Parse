import { initGlobalAPI } from "./globalAPI"
import { initMixin } from "./init"
import { initLifecycle } from "./lifecycle"
import { initStateMixin } from "./state"

function Vue(options) {
  this._init(options)
}

initMixin(Vue)
initLifecycle(Vue)
initGlobalAPI(Vue)
initStateMixin(Vue)

export default Vue