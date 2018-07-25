import { intersection } from 'lodash'
// TODO: replace with http://2ality.com/2015/01/es6-set-operations.html
import Vue from 'vue'

// lodash replacements
export function pickBy (obj, fn) {
  return Object.entries(obj).filter(fn)
    .reduce((obj, [k, v]) => Object.assign(obj, {[k]: v}), {})
}

export function pick (obj, ...keys) {
  return pickBy(obj, ([k, v]) => keys.includes(k))
}

export function omit (obj, ...keys) {
  return pickBy(obj, ([k, v]) => !keys.includes(k))
}

export function deepCopy (obj) {
  return JSON.parse(JSON.stringify(obj))
}

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

export function range (start, stop, step = 1) {
  if (!stop) {
    stop = start
    start = 0
  }
  return Array.from(new Array(parseInt((stop - start) / step)),
                    (x, i) => start + i * step)
}

export function capitalize (value) {
  // https://stackoverflow.com/a/38530325/450103
  return value.replace(/\b\w/g, l => l.toUpperCase())
}

export function parseFlaskSession (data) {
  // Parse encoded flask session cookie with signature.
  return JSON.parse(window.atob(data.substr(0, data.indexOf('.'))))
}

export function cssTimeToMilliseconds (timeString) {
  // based on https://gist.github.com/jakebellacera/9261266
  const num = parseFloat(timeString, 10)
  let unit = timeString.match(/m?s/)
  if (unit) unit = unit[0]
  if (unit === 's') return num * 1000
  if (unit === 'ms') return num
  throw new Error(`Unable to parse css time ${timeString} due unknown unit`)
}

export function getNavigatorLanguages () {
  // eslint-disable-next-line
  // https://github.com/i18next/i18next-browser-languageDetector/blob/master/src/browserLookups/navigator.js
  if (typeof navigator !== 'undefined') {
    if (navigator.languages) return navigator.languages
    if (navigator.userLanguage) return [navigator.userLanguage]
    if (navigator.language) return [navigator.language]
  }
  return []
}

export function guessLanguage (availableLanguages, acceptLanguages = []) {
  let languages = intersection(
    acceptLanguages.map((v) => v.split('-')[0].split('_')[0]),
    availableLanguages
  )
  if (languages.length) return languages[0]

  languages = intersection(
    getNavigatorLanguages().map((v) => v.split('-')[0].split('_')[0]),
    availableLanguages
  )
  if (languages.length) return languages[0]
}

// export function isNoU (value) {
//   // remove it, check related code and use == null
// }

export function injectComponentOptionsData (vm, data) {
  // TODO: DEPRECATED: instead of this Vue.util.defineReactive should be used
  // This should be used only in beforeCreate
  console.log('injectComponentOptionsData deprecated')
  const optionsData = vm.$options.data
  vm.$options.data = function () {
    const result = (
      (typeof optionsData === 'function')
        ? optionsData.call(this)
        : optionsData
    ) || {}
    Object.assign(result, data)
    return result
  }
}

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

export function geolocationPromise (defaultLatLng = null) {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        console.debug('Geolocation resolved', position)
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      }, () => {
        console.debug('Geolocation rejected')
        if (defaultLatLng) resolve(defaultLatLng)
        else reject(new Error('Geolocation rejected'))
      })
    } else {
      console.debug('Geolocation not supported')
      if (defaultLatLng) resolve(defaultLatLng)
      else reject(new Error('Geolocation rejected'))
    }
  })
}

export function isElementInViewport (el) {
  // see https://stackoverflow.com/a/7557433/450103
  var rect = el.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

export function domFromString (html) {
  // TODO: works only with root element
  const div = document.createElement('div')
  div.innerHTML = html
  return div.firstChild
}

export const EMAIL_REGEXP = /\S+@\S+\.\S+/
export const PHONE_REGEXP = /\+[1-9]{1}[0-9]{3,14}/
