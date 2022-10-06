import Dep from "./dep"

let id = 0

class Watcher {
  constructor(vm, fn, option) {
    this.id = id++
    this.renderWatcher = option
    this.getter = fn
    // 计算属性与清理时使用
    this.deps = []
    this.depsId = new Set()
    this.get()
  }

  get() {
    Dep.target = this
    this.getter()
    Dep.target = null
  }

  addDepend(dep) {
    const { id } = dep
    if (!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)
    }
  }

  update() {
    this.get()
  }
}

export default Watcher