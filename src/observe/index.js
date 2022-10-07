import { newPrototype } from './array'
import Dep from './dep'

class Observe {
  constructor(data) {
    this.dep = new Dep()
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

function dependArray(value) {
  value.forEach(i => {
    i.__ob__?.dep.depend()
    if (Array.isArray(i)) {
      dependArray(i)
    }
  })
}

export function defineReactive(target, key, value) {
  // 递归劫持
  const childOb = observe(value)
  const dep = new Dep()
  Object.defineProperty(target, key, {
    get() {
      if (Dep.target) {
        // 收集属性依赖
        dep.depend()
        // 如果当前属性的值是一个对象(每次修改一个未被收集依赖的属性前都会访问对象获取地址，只要访问对象则将对象作为依赖收集起来)
        if (childOb) {
          // 收集对象依赖，将当前属性的值也作为依赖收集起来，如调用数组变异方法时再通知观察者更新
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 将所有子数组进行依赖收集(因为是通过访问父数组下标的方式直接修改子数组，导致子数组未收集到依赖)
            dependArray(value)
          }
        }
      }
      return value
    },
    set(newValue) {
      if (newValue === value) return
      observe(newValue)
      // value 是一个引用地址，每次访问数组索引前都会触发getter返回数组内存地址，再访问下标
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