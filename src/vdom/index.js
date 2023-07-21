import { callHook, resolveSlots } from "../lifecycle"

const isReservedTag = (tag) => {
  return ['a', 'div', 'p', 'button', 'ul', 'li', 'span'].includes(tag)
}
/** 创建虚拟元素节点 */
export function createElementVNode(context, tag, data, children) {
  children = simpleNormalizeChildren(children)
  if (isReservedTag(tag)) {
    return VNode(tag, data, children, undefined, undefined, context)
  } else {
    const Ctor = context.$options.components[tag]
    return createComponentVnode(Ctor, data, context, children, tag)
  }
}

function createComponentVnode(Ctor, data, context, children, tag) {
  if (typeof Ctor === 'object') {
    Ctor = context.$options._base.extend(Ctor)
  }

  let asyncFactory
  // 异步组件没有cid
  if (typeof Ctor.cid === 'undefined') {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory)
    if (typeof Ctor === 'undefined') {
      return createTextVNode(context, '')
    }
  }
  const listeners = data.on
  data.on = data.nativeOn
  // 手动增加一个attribute, 方便在patch时回调
  const componentVNodeHooks = {
    init(vnode, parent) {
      // 被缓存过
      if (vnode.componentInstance && vnode.data.keepAlive) {
        componentVNodeHooks.prepatch(vnode, vnode)
      } else {
        // 在vnode上增加一个属性保存组件实例
        let instance = vnode.componentInstance = new vnode.componentOptions.Ctor({
          _isComponent: true,
          _parentVnode: vnode,
          parent,
        })
        // 在实例的$el上保存组件对应的真实dom
        instance.$mount()
      }
    },
    prepatch(oldVnode, vnode) {
      const options = vnode.componentOptions
      const { propsData, listeners } = options
      const child = vnode.componentInstance = oldVnode.componentInstance
      updateChildComponent(child, propsData, listeners, vnode, options.children)
    },
    insert(vnode) {
      const { componentInstance } = vnode
      if (!componentInstance._isMounted) {
        componentInstance._isMounted = true
        callHook(componentInstance, 'mounted')
      }
    }
  }
  data.hook = componentVNodeHooks

  function resolveAsyncComponent(factory) {
    if (factory.resolved) {
      return factory.resolved
    }

    const contexts = factory.contexts = [context]
    const res = factory()
    // promise
    if (typeof res.then) {
      if (typeof factory.resolved === 'undefined') {
        res.then(resolve, err => { console.log(err) })
      }
    }

    function resolve(res) {
      factory.resolved = context.$options._base.extend(res)
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
  return VNode(tag, data, undefined, null, undefined, context, { Ctor, propsData, listeners, tag, children })
}

function updateChildComponent(vm, propsData, listeners, parentVnode, renderChildren) {
  // 更新 props
  for (const key in propsData) {
    vm._props[key] = propsData[key]
  }
  // 更新 slots
  vm.$slots = resolveSlots(renderChildren, parentVnode.context)
  vm.$forceUpdate()
}

function simpleNormalizeChildren(children) {
  if (Array.isArray(children?.[0])) {
    children = Array.prototype.concat.apply([], children)
    return simpleNormalizeChildren(children)
  } else {
    return children
  }
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
  return VNode(undefined, undefined, undefined, text, undefined, vm, undefined)
}

function VNode(tag, data, children, text, elm, context, componentOptions) {
  const key = data?.key
  return {
    tag,
    data,
    children,
    text,
    context,
    key,
    componentOptions,
  }
}

export function isSameVnode(vnode1, vnode2) {
  return vnode1.tag === vnode2.tag && vnode1.key === vnode2.key
}