export default {
  name: 'keep-alive',
  created() {
    this.cache = {}
    this.keys = []
  },
  render() {
    const slot = this.$slots.default
    const vnode = slot[0]
    if (vnode) {
      const { componentOptions } = vnode
      const { cache, keys } = this
      const key = vnode.key == null
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key

      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance
        // LRU(least recently used)
        removeFromArray(keys, key)
        keys.push(key)
      } else {
        cache[key] = vnode
        keys.push(key)
      }

      vnode.data.keepAlive = true
    }

    return vnode
  },
}

function removeFromArray(list, item) {
  if (list.length) {
    const index = list.indexOf(item)
    if (index > -1) {
      return list.splice(index, 1)
    }
  }
}
