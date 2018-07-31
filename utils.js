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

export function isArrayEqual (arr1, arr2) {
  // Scalar strict compare
  return arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i])
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

export function intersection (arr1, arr2) {
  return arr1.filter((x) => arr2.includes(x))
}

export function resolveObjectPath (obj, path) {
  // https://stackoverflow.com/a/8817473/450103
  for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
    obj = obj[path[i]]
  }
  return obj
}
