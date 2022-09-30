
let oldPrototype = Array.prototype
// 在原型上进行修改，而不是覆盖
export const newPrototype = Object.create(oldPrototype)
// 找到所有的变异（改变原数组）方法
let methods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'reverse',
  'sort',
  'splice',
]

methods.forEach(method => {
  newPrototype[method] = function(...args) {
    const result = oldPrototype[method].call(this, ...args)
    // 需要对新增的数据再次做劫持
    let inserted
    let ob = this.__ob__
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
      default:
        break
    }
    if (inserted) {
      ob.observeArray(inserted)
    }
    console.log(method + '劫持')
    return result
  }
})
  