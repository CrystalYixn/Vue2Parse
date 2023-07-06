import Dep from "./observe/dep"
import { defineReactive, observe } from "./observe/index"
import Watcher, { nextTick } from "./observe/watcher"

export function initState(vm) {
  const opts = vm.$options
  // 初始化组件, 包括从父亲继承来的props
  if (opts._isComponent) initInternalComponent(vm, opts)
  // 初始化props, 变为响应式
  if (opts.props) initProps(vm)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) initData(vm)
  if (opts.computed) initComputed(vm)
  if (opts.watch) initWatch(vm)
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

function initInternalComponent(vm, options) {
  // 定义propsData存储解析的数据, props则用于记录用户的传入选项
  // _parentVnode指向的是父级, 因为tag:my
  vm.$options.propsData = options._parentVnode.componentOptions.propsData
}

function initMethods(vm, methods) {
  for (const key in methods) {
    vm[key] = methods[key].bind(vm)
  }
}

function initProps(vm) {
  const propsData = vm.$options.propsData || {}
  // vm._props用作私有属性代理屏蔽层
  const props = vm._props = {}
  for (const key in propsData) {
    const value = propsData[key]
    defineReactive(props, key, value)
    proxy(vm, '_props', key)
  }
}

function initWatch(vm) {
  const { watch } = vm.$options
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      handler.forEach(h => vm.createWatcher(vm, key, h))
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher(vm, key, handler) {
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(key, handler)
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
    watchers[key] = new Watcher(vm, fn, null, { lazy: true })
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

export function initStateMixin(Vue) {
  Vue.prototype.$watch = function(expOrFn, cb, options = {}) {
    new Watcher(this, expOrFn, cb, { user: true })
  }
  Vue.prototype.$nextTick = nextTick
}