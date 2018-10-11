import humps from 'humps'
import { timeoutPromise, createCachable } from './promise'
import { LRUMap } from './lru'

export function encodeURIObject (qs) {
  return Object
    .keys(qs)
    .filter(k => qs[k] != null)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]))
    .join('&')
}

function _joinURL (base, path) {
  if (base.endsWith('/')) {
    if (path.startsWith('/')) return base + path.substring(1)
  } else if (!path.startsWith('/')) return base + '/' + path
  return base + path
}

export function joinURL (...urls) {
  let result = ''
  urls.forEach((url) => result = (result ? _joinURL(result, url) : url))
  return result
}

export const CODE_TYPES = {
  '-1': 'REQUEST ERROR',
  '200': 'OK',
  '202': 'ACCEPTED',
  '403': 'FORBIDDEN',
  '404': 'NOT FOUND',
  '422': 'UNPROCESSABLE ENTITY',
  '500': 'INTERNAL SERVER ERROR',
  '502': 'BAD GATEWAY',
  '504': 'GATEWAY TIMEOUT',
  '600': 'TASK TIMEOUT', // on exceeded retries of checking async task
}

export class ApiError extends Error {
  constructor (code, message, data) {
    super(message)
    this.code = code
    this.message = message
    this.codeType = CODE_TYPES[code] || null
    Object.assign(this, data || {})
  }
}

export default class Api {
  constructor (config, prefix = '', errorClass = ApiError, errorHandlers = []) {
    this.taskRetries = {}

    this.cache = new LRUMap(256)
    this.cachable = createCachable(this.cache)
    this.Error = errorClass
    this.errorHandlers = errorHandlers
    this.configure(config, prefix)
  }

  configure (settings, prefix = '') {
    // es6 vs lodash or ramda? haha :-(
    settings = Object.assign({}, ...Object.entries(settings).map(([k, v]) => {
      if (k.startsWith(prefix)) return {[k.substr(prefix.length)]: v}
    }))
    // TODO: create and subclass Configurable to allow inheritance and later configuration

    this.BASE_URL = settings.BASE_URL

    const _set = (name, default_) => {
      this[name] = settings[name] != null ? settings[name] : default_
    }
    _set('MODE', 'cors')
    _set('CREDENTIALS_MODE', 'include')
    _set('TASK_MAX_RETRIES', 10)
    _set('TASK_WAIT_TIMEOUT', 1500)
    _set('HUMPS', true)
  }

  request (method, url, {qs = null, data = null, taskWaitTimeout = null,
                         taskMaxRetries = null, humps = null} = {}) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = joinURL(this.BASE_URL, url)
    }

    const options = {
      method,
      mode: this.MODE,
      credentials: this.CREDENTIALS_MODE,
      headers: {},
    }

    if (qs) {
      // qs = JSON.parse(JSON.stringify(qs)) // clone before decamelize
      if (humps != null ? humps : this.HUMPS) {
        qs = this.decamelizeKeys(qs)
      }
      url = url + '?' + encodeURIObject(qs)
    }

    if (data) {
      // data = JSON.parse(JSON.stringify(data)) // clone before decamelize
      if (humps != null ? humps : this.HUMPS) {
        data = this.decamelizeKeys(data)
      }
      options.body = JSON.stringify(data)
      options.headers['Content-Type'] = 'application/json; charset=UTF-8'
    }

    if (this.accessToken) options.headers['Authorization'] = this.accessToken

    return window.fetch(url, options).then(response => {
      if (response.status === 200 &&
          response.headers.get('Content-Type') !== 'application/json') {
        const disposition = response.headers.get('Content-Disposition') || ''
        if (disposition && disposition.startsWith('attachment;')) {
          // Getting filename
          let filename = 'attachment'
          // https://stackoverflow.com/a/40940790/450103
          const filenameRegexp = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          const matches = filenameRegexp.exec(disposition)
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '')
          }
          // Downloading attached file
          // TODO: most comprehensive solution with explicit content-type, charset and
          // possible some browser compatibility may be found here
          // https://stackoverflow.com/q/37095233/450103
          return response.blob().then((data) => {
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(data)
            link.download = filename
            link.click()
            return data
          })
        }
        return response.blob().then(data => {
          if (data.type !== 'application/json') return data
          const reader = new window.FileReader()
          return new Promise((resolve, reject) => {
            reader.onload = function () {
              resolve(JSON.parse(this.result))
            }
            reader.readAsText(data)
          })
        })
      }

      if (response.status === 202) {
        return response.json().then(data => {
          if (humps != null ? humps : this.HUMPS) {
            data = this.camelizeKeys(data)
          }
          taskWaitTimeout = data.waitTimeout != null ? data.waitTimeout : taskWaitTimeout
          taskMaxRetries = data.maxRetries != null ? data.maxRetries : taskMaxRetries
          return this.getTask(data.taskUrl, taskWaitTimeout, taskMaxRetries)
        })
      }

      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          if (humps != null ? humps : this.HUMPS) {
            return this.camelizeKeys(data)
          }
          return data
        })
      }

      return response.json().then(data => {
        if (humps != null ? humps : this.HUMPS) {
          data = this.camelizeKeys(data)
        }
        Object.assign(data, {fetch: {url, options}})
        if (data.status === 'ERROR') {
          return this.error(data.code, data.message, data)
        } else {
          return this.error(response.status, response.statusText, data)
        }
      }, (decodeError) => {
        const data = Object.assign(decodeError, {fetch: {url, options}})
        return this.error(response.status, response.statusText, data)
      })
    }, (error) => {
      // network-related problems
      return this.error(-1, error.message, {fetch: {url, options}})
    })
  }

  error (code, message, data = {}) {
    // console.log(`API error ${code}: ${message}`, data)
    Object.assign(data, {code, message})
    const error = new this.Error(code, message, data)
    this.errorHandlers.forEach((callback) => callback(error))
    return Promise.reject(error)
  }

  get (url, qs, { cache = false, cacheTimeout = null, humps = null } = {}) {
    if (cache) {
      return this.cachable(
        () => this.request('get', url, {qs, humps}),
        url + JSON.stringify(qs), cache, cacheTimeout
      )
    }
    return this.request('get', url, {qs})
  }
  post (url, payload) {
    return this.request('post', url, {data: payload})
  }
  put (url, payload) {
    return this.request('put', url, {data: payload})
  }
  delete (url, payload) {
    return this.request('delete', url, {data: payload})
  }

  getTask (taskUrl, waitTimeout, maxRetries) {
    waitTimeout = waitTimeout != null ? waitTimeout : this.TASK_WAIT_TIMEOUT
    maxRetries = maxRetries != null ? maxRetries : this.TASK_MAX_RETRIES

    if (this.taskRetries[taskUrl] === 0) {
      delete this.taskRetries[taskUrl]
      return this.error(600, `Max task request retries exceeded for ${taskUrl}`)
    } else if (!this.taskRetries[taskUrl]) {
      this.taskRetries[taskUrl] = maxRetries
    }
    this.taskRetries[taskUrl] -= 1

    return timeoutPromise(waitTimeout).then(() => {
      return this.request('get', taskUrl, {waitTimeout: waitTimeout})
    })
  }

  getAsyncStatsForObjects (objects, statsMap, statsRequest, callback, idAttr = 'id', qsKey = 'ids', dataKey) {
    let ids = objects.map((obj) => idAttr ? String(obj[idAttr]) : String(obj))
    Object.entries(statsMap).forEach(([id, stats]) => callback(id, stats))
    ids = ids.filter(id => statsMap[id] === undefined)
    return this.getAsyncStats(ids, statsRequest, callback, true, qsKey, dataKey)
  }

  getAsyncStats (ids, statsRequest, callback, firstFetchWait = true, qsKey = 'ids', dataKey) {
    // callback will be invoked for each stats per id or with ApiError instance
    // (fail may be only on retries exceeded for now)
    // TODO: return stats promises
    if (!ids.length) return

    if (typeof statsRequest === 'string' || statsRequest instanceof String) {
      const url = statsRequest
      statsRequest = (ids) => this.get(url, {[qsKey]: ids.join(',')})
    }
    let retriesLeft = this.TASK_MAX_RETRIES

    const request = () => {
      return statsRequest(ids).then(statsMap => {
        Object.entries(dataKey ? statsMap[dataKey] : statsMap).forEach(([id, stats]) => {
          callback(id, stats || new this.Error(700, 'Fetch error'))
        })
        ids = ids.filter(id => {
          return (dataKey ? statsMap[dataKey][id] : statsMap[id]) === undefined
        })

        retriesLeft -= 1
        if (retriesLeft > 0 && ids.length) {
          setTimeout(request, this.TASK_WAIT_TIMEOUT)
        } else {
          ids.forEach(id => callback(id, new this.Error(600, 'Stats timeout')))
        }
      })
    }

    if (firstFetchWait) setTimeout(request, this.TASK_WAIT_TIMEOUT)
    else request()
  }

  camelizeKeys (data) {
    return humps.camelizeKeys(data, function (key, convert) {
      return /^[A-Z0-9_]+$/.test(key) ? key : convert(key)
    })
  }

  decamelizeKeys (data) {
    return humps.decamelizeKeys(data, function (key, convert, options) {
      return /^[A-Z0-9_]+$/.test(key) ? key : convert(key, options)
    })
  }
}
