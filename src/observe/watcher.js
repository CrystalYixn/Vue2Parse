import Dep from "./dep"

let id = 0
let queue = []
let has = {}
let pendding = false

class Watcher {
  constructor(vm, fn, option) {
    this.id = id++
    this.renderWatcher = option
    this.getter = fn
    // 计算属性与清理时使用
    this.deps = []
    this.depsId = new Set()
    this.get()
  }

  get() {
    Dep.target = this
    this.getter()
    Dep.target = null
  }

  addDepend(dep) {
    const { id } = dep
    if (!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)
    }
  }

  update() {
    queueWatcher(this)
  }

  run() {
    this.get()
  }
}

function flushScheduleQueue() {
  queue.forEach(watcher => watcher.run())
  queue = []
  has = {}
  pendding = false
}

function queueWatcher(watcher) {
  const { id } = watcher
  if (!has[id]) {
    queue.push(watcher)
    has[id] = true

    if (!pendding) {
      nextTick(flushScheduleQueue, 0);
      pendding = true
    }
  }
}

let callbacks = []
let waiting = false
let timeFunc
if (Promise) {
  timeFunc = () => {
    Promise.resolve().then(flushCallbacks)
  }
} else if (MutationObserver) {
  let observer = new MutationObserver(flushCallbacks)
  let textNode = document.createTextNode(1)
  observer.observe(textNode, {
    characterData: true
  })
  timeFunc = () => {
    textNode.textContent = 2
  }
} else if (setImmediate) {
  timeFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  timeFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}
export function nextTick(cb) {
  callbacks.push(cb)
  if (!waiting) {
    waiting = true
    timeFunc();
  }
}

function flushCallbacks() {
  callbacks.forEach(cb => cb())
  waiting = false
  callbacks = []
}

export default Watcher