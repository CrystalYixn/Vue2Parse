class Observe {
  constructor(data) {
    this.walk(data)
  }

  // 循环对象对属性依次劫持
  walk(data) {
    // 重新定义属性（性能开销高，瓶颈之一）
    Object.keys(data).forEach(key => {
      defineReactive(data, key, data[key])
    })
  }
}

export function defineReactive(target, key, value) {
  // 递归劫持
  observe(value)
  Object.defineProperty(target, key, {
    get() {
      return value
    },
    set(newValue) {
      console.log('数据劫持', value)
      if (newValue === value) return
      // 没明白这里的 value 不应该是一个值吗，为什么还能进行赋值操作？
      value = newValue
    }
  })
}

export function observe(data) {
  // 只对对象进行劫持
  if (typeof data !== 'object' || data === null) {
    return
  }

  // 判断对象是否被劫持过
  return new Observe(data)
}