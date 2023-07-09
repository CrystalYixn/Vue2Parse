const isReservedTag = (tag) => {
  return ['a', 'div', 'p', 'button', 'ul', 'li', 'span'].includes(tag)
}
/** 创建虚拟元素节点 */
export function createElementVNode(vm, tag, data, ...children) {
  const { attr: attrs = {} } = data
  const { key } = attrs
  key && delete attrs.key
  if (isReservedTag(tag)) {
    return VNode(vm, tag, key, data, children)
  } else {
    const Ctor = vm.$options.components[tag]
    return createComponentVnode(vm, tag, key, data, children, Ctor)
  }
}

function createComponentVnode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === 'object') {
    Ctor = vm.$options._base.extend(Ctor)
  }

  let asyncFactory
  // 异步组件没有cid
  if (typeof Ctor.cid === 'undefined') {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory)
    if (typeof Ctor === 'undefined') {
      return createTextVNode(vm, '')
    }
  }
  const listeners = data.on
  data.on = data.nativeOn
  // 手动增加一个attribute, 方便在patch时回调
  data.hook = {
    init(vnode) {
      // 在vnode上增加一个属性保存组件实例
      let instance = vnode.componentInstance = new vnode.componentOptions.Ctor({
        _isComponent: true,
        _parentVnode: vnode,
      })
      // 在实例的$el上保存组件对应的真实dom
      instance.$mount()
    },
    prepatch(propsData, oldVnode, vnode) {
      const vm = vnode.componentInstance = oldVnode.componentInstance
      for (const key in propsData) {
        vm._props[key] = propsData[key]
      }
    }
  }

  function resolveAsyncComponent(factory) {
    if (factory.resolved) {
      return factory.resolved
    }

    const contexts = factory.contexts = [vm]
    const res = factory()
    // promise
    if (typeof res.then) {
      if (typeof factory.resolved === 'undefined') {
        res.then(resolve, err => { console.log(err) })
      }
    }

    function resolve(res) {
      factory.resolved = vm.$options._base.extend(res)
      forceRender()
    }

    function forceRender() {
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }
    }

    return factory.resolved
  }
  
  const propsData = extractPropsFromVnodeData(data, Ctor)
  return VNode(vm, tag, key, data, children, null, { Ctor, propsData, listeners })
}

/** 分离props和attrs */
function extractPropsFromVnodeData(data, Ctor) {
  const res = {}
  const propKeys = Ctor.options.props || []
  if (!propKeys.length) return
  propKeys.forEach(k => {
    if (k in data) {
      res[k] = data[k]
      delete data[k]
    }
  })
  return res
}

/** 创建虚拟文本节点 */
export function createTextVNode(vm, text) {
  return VNode(vm, undefined, undefined, undefined, undefined, text)
}

function VNode(vm, tag, key, data, children, text, componentOptions) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text,
    componentOptions
  }
}

export function isSameVnode(vnode1, vnode2) {
  return vnode1.tag === vnode2.tag && vnode1.key === vnode2.key
}