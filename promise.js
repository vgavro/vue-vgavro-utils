export function timeoutPromise (time, value) {
  let timeout
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

export function makeCancelable (promise, reason = 'cancel') {
  // Poorly based on https://stackoverflow.com/a/37492399/450103
  if (promise.cancel) return promise
  const wrapper = defer()
  let canceled = false
  promise.then(
    (val) => canceled ? wrapper.reject(reason) : wrapper.resolve(val),
    (err) => canceled ? wrapper.reject(reason) : wrapper.reject(err),
  )
  wrapper.promise.cancel = () => {
    canceled = true
    if (promise.cancel) promise.cancel()
    wrapper.reject(reason)
  }
  return wrapper.promise
}

export function createSingular () {
  // ensures that always only one promise is processing by key
  // if cancel is true - cancels promises with other keys
  function singular (createPromise, key = '', cancel = false) {
    if (singular.promises[key]) {
      return singular.promises[key]
    }
    if (cancel) {
      Object.keys(singular.promises).forEach(k => {
        k !== key && singular.promises[k].cancel()
      })
    }
    return singular.promises[key] = makeCancelable(createPromise().then(
      (val) => {
        delete singular.promises[key]
        return val
      },
      (err) => {
        delete singular.promises[key]
        throw err
      }
    ))
  }
  singular.promises = {}
  return singular
}

export function createDelayed () {
  function delayed (createPromise, timeout) {
    delayed.promise.cancel()
    delayed.promise = timeoutPromise(timeout)
    return delayed.promise.then(createPromise)
  }
  delayed.promise = timeoutPromise(0)
  return delayed
}

export function createCachable (cache, defaultTimeout = null) {
  function maybeCache (isCachable, ok, val, key) {
    if (isCachable(ok, val, key)) cache.set(key, [ok, val, new Date().valueOf()])
    return ok ? Promise.resolve(val) : Promise.reject(val)
  }

  return function cachable (createPromise, key = '', isCachable = true,
                            timeout = defaultTimeout) {
    const cached = cache.get(key)
    if (cached) {
      const [ok, val, time] = cached
      if (!timeout || ((new Date().valueOf() - time) <= timeout)) {
        return ok ? Promise.resolve(val) : Promise.reject(val)
      }
    }

    if (isCachable === true) isCachable = (ok) => ok
    return createPromise().then(
      data => maybeCache(isCachable, true, data, key),
      err => maybeCache(isCachable, false, err, key),
    )
  }
}
