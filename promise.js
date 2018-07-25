export function timeoutPromise (time, value) {
  let timeout = null

  const promise = makeCancelable(new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      if (typeof value === 'function') value = value()
      resolve(value)
    }, time)
  }))

  const _cancel = promise.cancel
  promise.cancel = () => {
    // trick not to invoke function if canceled,
    // instead of just reject with "cancel" reason
    clearTimeout(timeout)
    _cancel()
  }
  return promise
}

export function defer () {
  const deferred = {}
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve
    deferred.reject = reject
  })
  return deferred
}

export function makeCancelable (promise, reason = {canceled: true}) {
// From https://stackoverflow.com/a/37492399/450103
  let canceled = false

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then((val) =>
      canceled ? reject(reason) : resolve(val)
    )
    promise.catch((error) =>
      canceled ? reject(reason) : reject(error)
    )
  })

  wrappedPromise.cancel = () => canceled = true
  return wrappedPromise
}
