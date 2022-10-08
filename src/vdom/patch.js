import { isSameVnode } from "./index"

/* 初始化与更新 */
export function patch(oldVNode, vnode) {
  const isRealElement = oldVNode.nodeType
  // 视为初始化
  if (isRealElement) {
    const elm = oldVNode
    const parentElm = elm.parentNode
    const newElm = createElm(vnode)
    parentElm.insertBefore(newElm, elm.nextSibling)
    parentElm.removeChild(elm)
    return newElm
  } else {
    patchVnode(oldVNode, vnode)
  }
}

/* 根据vnode创建真实DOM */
export function createElm(vnode) {
  let { tag, data, children, text } = vnode
  if (typeof tag === 'string') {
    vnode.el = document.createElement(tag) // 放在 vnode 上为后续 diff 算法做对比使用
    patchProps(vnode.el, {}, data)
    children.forEach(child => vnode.el.appendChild(createElm(child)))
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

/* 将所有属性设置到DOM元素上 */
export function patchProps(el, oldProprs, props) {
  const oldStyles = oldProprs.style
  const newStyles = props.style
  // 移除旧节点中有，新节点没有的样式
  for (const key in oldStyles) {
    if (!newStyles[key]) {
      el.style[key] = ''
    }
  }
  // 移除旧节点中有，新节点没有的属性
  for (const key in oldProprs) {
    if (!props[key]) {
      el.removeAttribute(key)
    }
  }
  // 用新值覆盖旧值
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

function patchVnode(oldVNode, vnode) {
  // 两个节点的tag与key相同则视为同一个节点
  if (!isSameVnode(oldVNode, vnode)) {
    return oldVNode.el.parentNode.replaceChild(createElm(vnode), oldVNode.el)
  }
  const el = vnode.el = oldVNode.el
  // 文本节点
  if (!oldVNode.tag) {
    if (oldVNode.text !== vnode.text) {
      oldVNode.el.textContent = vnode.text
    }
  }
  patchProps(el, oldVNode.data, vnode.data)
  const oldChildren = oldVNode.children || []
  const newChildren = vnode.children || []
  // 需要完整的diff算法
  if (oldChildren.length && newChildren.length) {
    updateChildren(el, oldChildren, newChildren)
  } else if (oldChildren.length) {
    el.innerHTML = ''
  } else if (newChildren.length) {
    mountChildren(el, newChildren)
  } else {

  }
  return el
}

function mountChildren(el, newChildren) {
  newChildren.forEach(child => el.appendChild(createElm(child)))
}

function updateChildren(el, oldChildren, newChildren) {
  // 双指针方式
  let oldStartIndex = 0
  let newStartIndex = 0
  let oldEndIndex = oldChildren.length - 1
  let newEndIndex = newChildren.length - 1

  let oldStartChildren = oldChildren[0]
  let newStartChildren = newChildren[0]
  let oldEndChildren = oldChildren[oldEndIndex]
  let newEndChildren = newChildren[newEndIndex]

  // 双方有一方头指针大于尾指针则停止循环
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    
  }
}