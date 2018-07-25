import Vue from 'vue'

import { timeoutPromise } from '../promise.js'

function createRequest (vm, name, request) {
  const rv = function () {
    rv.delayPromise.cancel()
    const result = request.apply(vm, arguments)
    if (!result) return
    rv.loading += 1
    rv.error = null
    const promise = result.then(
      (data) => {
        rv.loading -= 1
        rv.data = data
        rv.error = null
        return data
      },
      (error) => {
        rv.loading -= 1
        rv.data = null
        rv.error = error || true // empty reject? shame on you!
        return Promise.reject(error)
      }
    )
    rv.promise = promise
    return promise
  }
  Vue.util.defineReactive(rv, 'loading', 0)
  Vue.util.defineReactive(rv, 'data', null)
  Vue.util.defineReactive(rv, 'error', null)

  rv.delayPromise = timeoutPromise(0)
  rv.delay = function (timeout) {
    rv.delayPromise.cancel()
    rv.delayPromise = timeoutPromise(timeout)
    return function () {
      const arguments_ = arguments
      return rv.delayPromise.then(function () {
        return rv.apply(null, arguments_)
      })
    }
  }
  return rv
}

export default {
  beforeCreate () {
    Object.entries(this.$options.requests || {}).forEach(([key, value]) => {
      this[key] = createRequest(this, key, value)
    })
  },
}
