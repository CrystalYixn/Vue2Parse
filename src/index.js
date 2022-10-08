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

const render1 = compileToFunciton(`<ul key="a" style="color: blue;">
  <li key="a">a</li>
  <li key="b">b</li>
  <li key="c">c</li>
</ul>`)
const prevVnode = render1.call(new Vue({ data: { name: 'honi' } }))
console.log(prevVnode)

const el = createElm(prevVnode)
document.body.appendChild(el)

const render2 = compileToFunciton(`<ul key="a" style="color: red;">
  <li key="a">a</li>
  <li key="b">b</li>
  <li key="c">c</li>
  <li key="d">d</li>
</ul>`)
const nextVnode = render2.call(new Vue({ data: { name: 'honi' } }))
console.log(nextVnode)

const newEl = createElm(nextVnode)
setTimeout(() => {
  patch(prevVnode, nextVnode)
}, 1000);

export default Vue