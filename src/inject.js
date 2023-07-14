import { defineReactive } from "./observe/index"

export function initInjections(vm) {
  const { inject } = vm.$options
  if (!inject) return

  const keys = Object.keys(inject)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const provideKey = inject[key]
    let source = vm
    while (source) {
      const provided = source._provided
      if (provided && provideKey in provided) {
        defineReactive(vm, provideKey, provided[provideKey])
        break
      }
      source = source.$parent
    }
  }
}

export function initProvide(vm) {
  const { provide } = vm.$options
  if (provide) {
    vm._provided = provide
  }
}