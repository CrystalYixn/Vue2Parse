const isReservedTag = (tag) => {
  return ['a', 'div', 'p', 'button', 'ul', 'li', 'span'].includes(tag)
}
/** 创建虚拟元素节点 */
export function createElementVNode(vm, tag, attr, ...children) {
  if (attr == null) {
    attr = {}
  }
  const { key } = attr
  key && delete attr.key
  if (isReservedTag(tag)) {
    return vnode(vm, tag, key, attr, children)
  } else {
    const ctor = vm.$options.components[tag]
    return createComponentVnode(vm, tag, key, attr, children, ctor)
  }
}

function createComponentVnode(vm, tag, key, data, children, ctor) {
  if (typeof ctor === 'object') {
    ctor = vm.$options._base.extend(ctor)
  }
  // FIXME 此处不是覆盖了DOM上的hook属性？
  // 手动增加一个attribute, 方便在patch时回调
  data.hook = {
    init(vnode) {
      // 在vnode上增加一个属性保存组件实例
      let instance = vnode.componentInstance = new vnode.componentOptions.ctor({
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
  const propsData = extractPropsFromVnodeData(data, ctor)
  return vnode(vm, tag, key, data, children, null, { ctor, propsData })
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
  return vnode(vm, undefined, undefined, undefined, undefined, text)
}

function vnode(vm, tag, key, data, children, text, componentOptions) {
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