import { newPrototype } from './array'
import Dep from './dep'

class Observe {
  constructor(data) {
    // 定义为不可枚举，避免死循环
    Object.defineProperty(data, '__ob__', {
      value: this,
      enumerable: false
    })
    if (Array.isArray(data)) {
      data.__proto__ = newPrototype
      // 数组中的元素如果是对象也进行劫持，非对象不进行劫持提高性能（因为很少使用索引下标直接修改数组）
      this.observeArray(data)
    } else {
      this.walk(data)
    }
  }

  // 循环对象对属性依次劫持
  walk(data) {
    // 重新定义属性（性能开销高，瓶颈之一）
    Object.keys(data).forEach(key => {
      defineReactive(data, key, data[key])
    })
  }

  observeArray(data) {
    data.forEach(i => observe(i))
  }
}

export function defineReactive(target, key, value) {
  // 递归劫持
  observe(value)
  const dep = new Dep()
  Object.defineProperty(target, key, {
    get() {
      if (Dep.target) {
        dep.depend()
      }
      return value
    },
    set(newValue) {
      if (newValue === value) return
      observe(newValue)
      // FIXME 没明白这里的 value 不应该是一个值吗，为什么还能进行赋值操作？
      value = newValue
      dep.notify()
    }
  })
}

export function observe(data) {
  // 只对对象进行劫持
  if (typeof data !== 'object' || data === null) {
    return
  }
  // 判断对象是否被劫持过
  if (data.__ob__ instanceof Observe) return data.__ob__
  return new Observe(data)
}