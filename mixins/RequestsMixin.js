import Vue from 'vue'

import { createSingular, createDelayed } from '../promise.js'

function createRequest (vm, name, request) {
  // exposes vm[name] function:
  // (...arguments) send request
  // data: last request result (reactive)
  // error: last request error (if any) (reactive)
  // loading: integer with current active requests (reactive)
  // args: last request call arguments
  // promise: last request promise
  // request({delayed: false, singular: false})(...argumets)
  //   send request with options:
  //     delayed: milliseconds
  //       new delay or direct call cancels previously delayed
  //     singular: Boolean
  //       call new request or return waiting with same
  //       arguments, and cancel others (skip cancel with 'no-cancel')

  const req = function () {
    delayed.promise.cancel()
    req.args = Array.from(arguments)
    const result = request.apply(vm, arguments)
    if (!result) return Promise.resolve(result)
    req.loading += 1
    req.error = null
    req.promise = result.then(
      (data) => {
        req.loading -= 1
        req.data = data
        req.error = null
        return data
      },
      (error) => {
        req.loading -= 1
        req.data = null
        req.error = error || true // empty reject? shame on you!
        return Promise.reject(error)
      }
    )
    return req.promise
  }
  Vue.util.defineReactive(req, 'loading', 0)
  Vue.util.defineReactive(req, 'data', null)
  Vue.util.defineReactive(req, 'error', null)

  const delayed = createDelayed()
  const singular = createSingular()

  req.request = function (options = {singular: false, delayed: false}) {
    return function () {
      let createPromise
      if (options.singular) {
        createPromise = () => singular(
          () => req.apply(null, arguments),
          JSON.stringify(Array.from(arguments)),
          options.singular !== 'no-cancel'
        )
      } else createPromise = () => req.apply(null, arguments)
      if (options.delayed) {
        return delayed(createPromise, options.delayed)
      } else return createPromise()
    }
  }

  return req
}

export default {
  beforeCreate () {
    Object.entries(this.$options.requests || {}).forEach(([key, value]) => {
      this[key] = createRequest(this, key, value)
    })
  },
}
