import Dep from "./observe/dep"
import { observe } from "./observe/index"
import Watcher from "./observe/watcher"

export function initState(vm) {
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  }
  if (opts.computed) {
    initComputed(vm)
  }
}

function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key]
    },
    set(val) {
      vm[target][key] = val
    }
  })
}

function initData(vm) {
  let data = vm.$options.data
  data = typeof data === 'function' ? data.call(vm) : data
  
  vm._data = data
  // 数据劫持
  observe(data)
  // 数据代理
  for (const key in data) {
    proxy(vm, '_data', key)
  }
}

function initComputed(vm) {
  const computed = vm.$options.computed
  const watchers = vm._computedWatchers = {}
  for (const key in computed) {
    let userDef = computed[key]
    const fn = typeof userDef === 'function' ? userDef : userDef.get
    watchers[key] = new Watcher(vm, fn, { lazy: true })
    defineComputed(vm, key, userDef)
  }
}

function defineComputed(target, key, userDef) {
  const setter = userDef.set || (() => {})
  Object.defineProperty(target, key, {
    get: createComputedGetter(key),
    set: setter
  })
}

function createComputedGetter(key) {
  return function() {
    const watcher = this._computedWatchers[key]
    if (watcher.dirty) {
      watcher.evaluate()
    }
    // 让依赖的属性继续收集上层Watcher，一般这才是渲染Watcher
    if (Dep.target) {
      watcher.depend()
    }
    return watcher.value
  }
}