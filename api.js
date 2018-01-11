import humps from 'humps'
import { timeoutPromise } from './utils'
import _ from 'lodash'

export function encodeURIObject (qs) {
  return Object
    .keys(qs)
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
  constructor (settings, prefix = '', errorClass = ApiError, errorHandlers = []) {
    this.taskRetries = {}
    this.cache = {}
    this.Error = errorClass
    this.errorHandlers = errorHandlers
    this.config(settings, prefix)
  }

  config (settings, prefix = '') {
    // es6 vs lodash or ramda? haha :-(
    settings = Object.assign({}, ...Object.entries(settings).map(([k, v]) => {
      if (k.startsWith(prefix)) return {[k.substr(prefix.length)]: v}
    }))

    this.BASE_URL = settings.BASE_URL
    this.MODE = settings.MODE
    this.CREDENTIALS_MODE = settings.CREDENTIALS_MODE
    this.TASK_URL = settings.TASK_URL
    this.TASK_MAX_RETRIES = settings.TASK_MAX_RETRIES
    this.TASK_WAIT_TIMEOUT = settings.TASK_WAIT_TIMEOUT
    this.STATS_MAX_RETRIES = (settings.STATS_MAX_RETRIES || settings.TASK_MAX_RETRIES)
    this.STATS_WAIT_TIMEOUT = (settings.STATS_WAIT_TIMEOUT || settings.TASK_WAIT_TIMEOUT)
  }

  request (method, url, {qs = null, data = null, taskWaitTimeout = null,
                         taskMaxRetries = null} = {}) {
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
      qs = this.decamelizeKeys(qs)
      url = url + '?' + encodeURIObject(qs)
    }

    if (data) {
      // data = JSON.parse(JSON.stringify(data)) // clone before decamelize
      data = this.decamelizeKeys(data)
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
        return response.blob()
      }

      if (response.status === 202) {
        return response.json().then(data => {
          data = this.camelizeKeys(data)
          taskWaitTimeout = data.waitTimeout != null ? data.waitTimeout : taskWaitTimeout
          taskMaxRetries = data.maxRetries != null ? data.maxRetries : taskMaxRetries
          return this.getTask(data.taskId, taskWaitTimeout, taskMaxRetries)
        })
      }

      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          return this.camelizeKeys(data)
        })
      }

      return response.json().then(data => {
        data = this.camelizeKeys(data)
        if (data.error) {
          Object.assign(data.error, {fetch: {url, options}})
          return this.error(data.error.code, data.error.message, data.error)
        }
        Object.assign(data, {fetch: {url, options}})
        return this.error(response.status, response.statusText, data)
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

  get (url, payload, cache = false) {
    if (cache) {
      cache = url + JSON.stringify(payload)
      if (this.cache[cache] !== undefined) {
        return Promise.resolve(this.cache[cache])
      }
    }
    return this.request('get', url, {qs: payload}).then(data => {
      if (cache) this.cache[cache] = data
      return data
    })
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

  getTask (taskId, waitTimeout, maxRetries) {
    waitTimeout = waitTimeout != null ? waitTimeout : this.TASK_WAIT_TIMEOUT
    maxRetries = maxRetries != null ? maxRetries : this.TASK_MAX_RETRIES

    if (this.taskRetries[taskId] === 0) {
      delete this.taskRetries[taskId]
      return this.error(600, `Max task request retries exceeded for ${taskId}`)
    } else if (!this.taskRetries[taskId]) {
      this.taskRetries[taskId] = maxRetries
    }
    this.taskRetries[taskId] -= 1

    return timeoutPromise(waitTimeout).then(() => {
      return this.request('get', this.TASK_URL + taskId, {waitTimeout: waitTimeout})
    })
  }

  getAsyncStatsForObjects (objects, statsMap, statsRequest, callback, idAttr = 'id') {
    let ids = objects.map((obj) => idAttr ? String(obj[idAttr]) : String(obj))
    _.each(statsMap, (stats, id) => callback(id, stats))
    ids = _.difference(ids, _.keys(statsMap))
    return this.getAsyncStats(ids, statsRequest, callback, true)
  }

  getAsyncStats (ids, statsRequest, callback, firstFetchWait = true) {
    // callback will be invoked for each stats per id or with ApiError instance
    // (fail may be only on retries exceeded for now)
    // TODO: return stats promises
    if (!ids.length) return

    if (typeof statsRequest === 'string' || statsRequest instanceof String) {
      const url = statsRequest
      statsRequest = (ids) => this.get(url, {ids: ids.join(',')})
    }
    let retriesLeft = this.STATS_MAX_RETRIES

    const request = () => {
      return statsRequest(ids).then(statsMap => {
        _.each(statsMap, (stats, id) => callback(id, stats))
        ids = _.difference(ids, _.keys(statsMap))

        retriesLeft -= 1
        if (retriesLeft > 0 && ids.length) {
          setTimeout(request, this.STATS_WAIT_TIMEOUT)
        } else {
          _.each(ids, (id) => callback(id, new this.Error(600, 'Stats timeout')))
        }
      })
    }

    if (firstFetchWait) setTimeout(request, this.STATS_WAIT_TIMEOUT)
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
