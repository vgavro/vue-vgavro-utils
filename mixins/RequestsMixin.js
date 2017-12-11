import Vue from 'vue'

function createRequest (vm, name, request) {
  const request_ = function () {
    const result = request.apply(vm, arguments)
    if (!result) return
    request_.loading += 1
    request_.error = null
    return result
      .then(data => {
        request_.loading -= 1
        request_.data = data
        request_.error = null
        return data
      })
      .catch(error => {
        request_.loading -= 1
        request_.data = null
        request_.error = error || true // empty reject? shame on you!
        return Promise.reject(error)
      })
  }
  Vue.util.defineReactive(request_, 'loading', 0)
  Vue.util.defineReactive(request_, 'data', null)
  Vue.util.defineReactive(request_, 'error', null)
  return request_
}

export default {
  beforeCreate () {
    Object.entries(this.$options.requests).forEach(([key, value]) => {
      this[key] = createRequest(this, key, value)
    })
  },
}
