import { observe } from "./observe/index"

export function initState(vm) {
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
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