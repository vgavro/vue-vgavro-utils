import { intersection } from 'lodash'
import Vue from 'vue'

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

export function isNoU (value) {
  // TODO: remove it, check related code and use == null
  // (as it works as expected and don't break eqeqeq rule)
  // DEPRECATED NOTE: You can use == undefined, but it's not obvious and breaks eslint rule "eqeqeq"
  return (value === null || value === undefined)
}

export function injectComponentOptionsData (vm, data) {
  // This should be used only in beforeCreate
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

export function vNodeToElement (vNode) {
  const vm = new Vue({functional: true, render: () => vNode[0]})
  vm.$mount()
  return vm.$el
}

export const EMAIL_REGEXP = /\S+@\S+\.\S+/
export const PHONE_REGEXP = /\+[1-9]{1}[0-9]{3,14}/
