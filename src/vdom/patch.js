import { isSameVnode } from "./index"

/* 初始化与更新 */
export function patch(oldVNode, vnode) {
  // 没有oldVnode时一定为组件初始化
  // 普通挂载oldVnode为真实元素, 更新时oldVnode为vnode
  if (!oldVNode) {
    return createElm(vnode)
  }
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

// 创建组件节点时回调初始化函数
function createComponent(vnode) {
  let i = vnode.data
  if ((i = i.hook) && (i = i.init)) {
    i(vnode)
  }
  // 回调函数执行成功后会挂载属性
  if (vnode.componentInstance) {
    return true
  }
}

/* 根据vnode创建真实DOM */
export function createElm(vnode) {
  let { tag, data, children, text } = vnode
  if (typeof tag === 'string') {
    // 创建元素节点时增加创建组件节点的判断
    if (createComponent(vnode)) { return vnode.componentInstance.$el }
    vnode.el = document.createElement(tag) // 放在 vnode 上为后续 diff 算法做对比使用
    patchProps(vnode.el, {}, data)
    // children.forEach(child => vnode.el.appendChild(createElm(child)))
    children.forEach(child => {
      const element = createElm(child)
      vnode.el.appendChild(element)
    })
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

/* 将所有属性设置到DOM元素上 */
export function patchProps(el, oldProps = {}, props = {}) {
  const oldStyles = oldProps.style
  const newStyles = props.style
  // 移除旧节点中有，新节点没有的样式
  for (const key in oldStyles) {
    if (!newStyles[key]) {
      el.style[key] = ''
    }
  }
  // 移除旧节点中有，新节点没有的属性
  for (const key in oldProps) {
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

/* 更新DOM渲染 */
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

  let oldStartVnode = oldChildren[0]
  let newStartVnode = newChildren[0]
  let oldEndVnode = oldChildren[oldEndIndex]
  let newEndVnode = newChildren[newEndIndex]

  const map = makeIndexByKey(oldChildren)

  // 双方有一方头指针大于尾指针则停止循环
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex]
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    } else if (isSameVnode(oldStartVnode, newStartVnode)) {
      // 头指针步进，处理push
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      // 尾指针步进，处理unshift
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      // 交叉对比，处理reverse或sort情况
      patchVnode(oldEndVnode, newStartVnode)
      // 将旧的尾巴移动到旧的前面
      el.insertBefore(oldEndVnode.el, oldStartVnode.el)
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      // 交叉对比，处理reverse或sort情况
      patchVnode(oldStartVnode, newEndVnode)
      el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else {
      // 处理乱序情况
      // 根据老列表做映射关系，在旧的中找(根据key找)，找到则移动到当前旧头指针前(并标记旧的元素已被处理)，找不到则插入(旧头指针前)，多余的删除
      let moveIndex = map[newStartVnode.key]
      if (moveIndex !== undefined) {
        let moveVnode = oldChildren[moveIndex]
        el.insertBefore(moveVnode.el, oldStartVnode.el)
        oldChildren[moveIndex] = undefined
        patchVnode(moveVnode, newStartVnode)
      } else {
        el.insertBefore(createElm(newStartVnode), oldStartVnode.el)
      }
      newStartVnode = newChildren[++newStartIndex]
    }
  }
  // 处理所有新children中未被遍历到的元素(追加、插入)
  if (newStartIndex <= newEndIndex) {
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      const childEl = createElm(newChildren[i])
      // 如果获取到了下一个元素，则证明尾指针有移动，一定是插入
      const anchor = newChildren[newEndIndex + 1] ? newChildren[newEndIndex + 1].el : null
      // 如果anchor为null则视为appendChild
      el.insertBefore(childEl, anchor)
    }
  }
  // 删除所有旧children中未被遍历到的元素
  if (oldStartIndex <= oldEndIndex) {
    const children = []
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      if (oldChildren[i]) {
        children.push(oldChildren[i])
      }
    }
    children.forEach(child => el.removeChild(child.el))
  }
}

function makeIndexByKey(children) {
  const map = {}
  children.forEach((child, index) => {
    map[child.key] = index
  })
  return map
}