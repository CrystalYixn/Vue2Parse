/* 初始化与更新 */
export function patch(oldVNode, vnode) {
  const isRealElement = oldVNode.nodeType
  if (isRealElement) {
    const elm = oldVNode
    const parentElm = elm.parentNode
    const newElm = createElm(vnode)
    parentElm.insertBefore(newElm, elm.nextSibling)
    parentElm.removeChild(elm)
    return newElm
  } else {

  }
}

export function createElm(vnode) {
  let { tag, data, children, text } = vnode
  if (typeof tag === 'string') {
    vnode.el = document.createElement(tag) // 放在 vnode 上为后续 diff 算法做对比使用
    patchProps(vnode.el, data)
    children.forEach(child => vnode.el.appendChild(createElm(child)))
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

export function patchProps(el, props) {
  for (let key in props) {
    if (key === 'style') {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName]
      }
    } else {
      el.setAttribute(key, props[key])
    }
  }
}