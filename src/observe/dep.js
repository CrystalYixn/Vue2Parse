let id = 0

class Dep {
  constructor() {
    this.id = id++
    // 属性在值变化时通知需要重新渲染的视图
    this.subs = []
  }

  depend() {
    Dep.target.addDepend(this)
  }

  addSub(watcher) {
    this.subs.push(watcher)
  }

  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}
Dep.target = null

let stack = []
export function pushTarget(watcher) {
  stack.push(watcher)
  Dep.target = watcher
}

export function popTarget() {
  stack.pop()
  Dep.target = stack[stack.length - 1]
}


export default Dep