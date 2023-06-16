const isReservedTag = (tag) => {
  return ['div', 'a', 'p', 'button', 'ul', 'li', 'span'].includes(tag)
}
export function createElementVNode(vm, tag, data, ...children) {
  if (data == null) {
    data = {}
  }
  const { key } = data
  key && delete data.key
  if (isReservedTag(tag)) {
    return vnode(vm, tag, key, data, children)
  } else {
    let Ctor = vm.$options.components[tag]
    return createComponentVnode(vm, tag, key, data, children, Ctor)
  }
}

function createComponentVnode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === 'object') {
    Ctor = vm.$options._base.extend(Ctor)
  }
  return vnode(vm, tag, key, data, children, null, { Ctor })
}

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
    componentOptions,
  }
}

export function isSameVnode(vnode1, vnode2) {
  return vnode1.tag === vnode2.tag && vnode1.key === vnode2.key
}