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

export function deepMerge (...objects) {
  // Also concatenates arrays in object keys
  // https://stackoverflow.com/a/48218209/450103
  const isObject = obj => obj && typeof obj === 'object'

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key]
      const oVal = obj[key]

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal)
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = deepMerge(pVal, oVal)
      } else {
        prev[key] = oVal
      }
    })

    return prev
  }, {})
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

// TODO: wtf it's doing here?
export const EMAIL_REGEXP = /\S+@\S+\.\S+/
export const PHONE_REGEXP = /\+[1-9]{1}[0-9]{3,14}/
