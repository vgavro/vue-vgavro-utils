export const routeTo = {
  // For usage with custom button components, for example.
  // TODO: Implement interface as in router-link
  bind: function (el, binding, vnode) {
    el.onclick = () => vnode.context.$router.push(binding.value)
  },

  update: function (el, binding, vnode) {
    el.onclick = () => vnode.context.$router.push(binding.value)
  },
}
