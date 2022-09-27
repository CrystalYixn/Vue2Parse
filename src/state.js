export function initState(vm) {
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  }
}

function initData(vm) {
  let data = vm.$options.data
  console.log(2, vm)
  data = typeof data === 'function' ? data.call(vm) : data
  debugger
  console.log(3, data)
}