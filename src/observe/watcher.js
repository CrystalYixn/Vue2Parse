import Dep, { popTarget, pushTarget } from "./dep"

let id = 0
let queue = []
let has = {}
let pending = false

class Watcher {
  constructor(vm, expOrFn, options, cb) {
    this.id = id++
    this.vm = vm
    this.renderWatcher = options
    this.lazy = options.lazy
    this.user = options.user
    this.dirty = this.lazy
    if (typeof expOrFn === 'string') {
      this.getter = function() {
        return vm[expOrFn]
      }
    } else {
      this.getter = expOrFn
    }
    this.cb = cb
    // 计算属性与清理时使用
    this.deps = []
    this.depsId = new Set()
    this.value = this.lazy ? undefined : this.get()
  }

  get() {
    pushTarget(this)
    const val = this.getter.call(this.vm)
    popTarget()
    return val
  }

  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  addDepend(dep) {
    const { id } = dep
    if (!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)
    }
  }

  depend() {
    this.deps.forEach(i => i.depend())
  }

  update() {
    // 将拥有lazy的都视为计算属性
    if (this.lazy) {
      // 属性收集了计算watcher的依赖，触发update则认为计算属性依赖的某些值被改变
      this.dirty = true
    } else {
      queueWatcher(this)
    }
  }

  run() {
    const ov = this.value
    const nv = this.get()
    if (this.user) {
      this.cb.call(this.vm, nv, ov)
    }
  }
}

function flushScheduleQueue() {
  // 不要使用 foreach 因为会有缓存, 在 watcher run 的过程中可能会动态追加 watcher
  // 只有实时访问 queue.length 才能拿到真实长度
  // queue.forEach(watcher => watcher.run())
  for (let i = 0; i < queue.length; ++i) {
    const watcher = queue[i]
    watcher.run()
  }
  queue = []
  has = {}
  pending = false
}

function queueWatcher(watcher) {
  const { id } = watcher
  if (!has[id]) {
    queue.push(watcher)
    has[id] = true

    if (!pending) {
      nextTick(flushScheduleQueue, 0);
      // 同步方便调试
      // flushScheduleQueue()
      pending = true
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