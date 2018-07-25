export function vNodeToElement (vnode) {
  const vm = new Vue({functional: true, render: () => vnode[0]})
  vm.$mount()
  return vm.$el
}

export function removeProp (vm, name, options = true) {
  // Helper to remove prop from created component
  if (options) {
    // if you want just to override vm[value], don't delete it from options,
    // or you get TypeError: Cannot read property 'type' of undefined
    delete vm.$options.props[name] // supress warning "use $prop instead"
  }
  delete vm.$props[name] // do not invoke error message on update
  vm.$options._propKeys = // remove this parameter not to update from parent
    vm.$options._propKeys.filter(k => k !== name)
}
