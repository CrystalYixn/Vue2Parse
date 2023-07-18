import { activeInstance } from "../lifecycle"
import { isSameVnode } from "./index"

// 用户的dom操作与属性操作, 分为内核中定义的逻辑与针对平台(浏览器)的逻辑
let cbs = {
  create: [updateDOMListeners, registerRef]
}

/* 初始化与更新, 只有真实tag会进入patch */
export function patch(oldVNode, vnode) {
  let isInitialPatch = false
  const insertedVnodeQueue = []
  // 没有oldVnode时一定为组件的tag初始化
  if (!oldVNode) {
    isInitialPatch = true
    createElm(vnode, insertedVnodeQueue)
  } else {
    // 普通挂载oldVnode为真实元素, 更新时oldVnode为vnode
    const isRealElement = oldVNode.nodeType
    // 视为初始化
    if (isRealElement) {
      const elm = oldVNode
      const parentElm = elm.parentNode
      const newElm = createElm(vnode, insertedVnodeQueue)
      parentElm.insertBefore(newElm, elm.nextSibling)
      parentElm.removeChild(elm)
    } else {
      patchVnode(oldVNode, vnode, insertedVnodeQueue)
    }
  }
  invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
  return vnode.el
}

// 标准的栈结构, 子组件执行函数时添加自己到队列, 直到父组件真正初始化完成时全部出栈
function invokeInsertHook(vnode, queue, isInit) {
  // 是否为组件内部结构初始化时调用
  if (isInit && vnode.parent) {
    // vnode.parent.data.pendingInsert = queue
  } else {
    for (let i = 0; i < queue; i++) {
      // 遍历子组件 insert 钩子
      queue[i].data.hook.insert(queue[i])
    }
  }
}

// 创建组件节点时回调初始化函数
function createComponent(vnode, insertedVnodeQueue) {
  let i = vnode.data
  if ((i = i.hook) && (i = i.init)) {
    i(vnode, activeInstance)
  }
  // 回调函数执行成功后会挂载属性
  if (vnode.componentInstance) {
    // if (vnode.data.pendingInsert) {
    //   insertedVnodeQueue.push(...vnode.data.pendingInsert)
    //   vnode.data.pendingInsert = null
    // }
    invokeCreateHooks(vnode)
    insertedVnodeQueue.push(vnode)
    return true
  }
}

/* 根据vnode创建真实DOM */
export function createElm(vnode, insertedVnodeQueue) {
  let { tag, data, children, text } = vnode
  if (typeof tag === 'string') {
    // 创建元素节点时增加创建组件节点的判断
    if (createComponent(vnode, insertedVnodeQueue)) return (vnode.el = vnode.componentInstance.$el)
    vnode.el = document.createElement(tag) // 放在 vnode 上为后续 diff 算法做对比使用
    patchProps(vnode.el, {}, data.attrs)
    children?.forEach(child => {
      const element = createElm(child, insertedVnodeQueue)
      vnode.el.appendChild(element)
    })
    if (data) {
      invokeCreateHooks(vnode)
    }
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

function invokeCreateHooks(vnode) {
  for (let i = 0;i < cbs.create.length; i++) {
    cbs.create[i](vnode)
  }
}
function updateDOMListeners(vnode) {
  const { on } = vnode.data
  for (const name in on) {
    vnode.el.addEventListener(name, on[name])
  }
}

function registerRef(vnode) {
  const { ref: key } = vnode.data
  if (!key) return
  const vm = vnode.context
  const ref = vnode.componentInstance || vnode.el
  const refs = vm.$refs
  refs[key] = ref
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
function patchVnode(oldVNode, vnode, insertedVnodeQueue) {
  // 两个节点的tag与key相同则视为同一个节点
  if (!isSameVnode(oldVNode, vnode)) {
    return oldVNode.el.parentNode.replaceChild(createElm(vnode, insertedVnodeQueue), oldVNode.el)
  }
  const el = vnode.el = oldVNode.el
  // 文本节点
  if (!oldVNode.tag) {
    if (oldVNode.text !== vnode.text) {
      oldVNode.el.textContent = vnode.text
    }
  }
  vnode.data?.hook?.prepatch(vnode.componentOptions.propsData, oldVNode, vnode)
  patchProps(el, oldVNode.data, vnode.data)
  const oldChildren = oldVNode.children || []
  const newChildren = vnode.children || []
  // 需要完整的diff算法
  if (oldChildren.length && newChildren.length) {
    updateChildren(el, oldChildren, newChildren, insertedVnodeQueue)
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

function updateChildren(el, oldChildren, newChildren, insertedVnodeQueue) {
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
      patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      // 尾指针步进，处理unshift
      patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      // 交叉对比，处理reverse或sort情况
      patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
      // 将旧的尾巴移动到旧的前面
      el.insertBefore(oldEndVnode.el, oldStartVnode.el)
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      // 交叉对比，处理reverse或sort情况
      patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
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
        patchVnode(moveVnode, newStartVnode, insertedVnodeQueue)
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