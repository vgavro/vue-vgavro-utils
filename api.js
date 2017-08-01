import humps from 'humps'
import { timeoutPromise, isNoU } from './utils'

const CODE_TYPES = {
  '-1': 'REQUEST ERROR',
  '200': 'OK',
  '202': 'ACCEPTED',
  '403': 'FORBIDDEN',
  '404': 'NOT FOUND',
  '422': 'UNPROCESSABLE ENTITY',
  '500': 'INTERNAL SERVER ERROR',
  '502': 'BAD GATEWAY',
  '504': 'GATEWAY TIMEOUT',
  '600': 'TASK RETRIES EXCEEDED',
}

function encodeURIObject (qs) {
  return Object.keys(qs)
               .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]))
               .join('&')
}

function _joinURL (base, path) {
  if (base.endsWith('/')) {
    if (path.startsWith('/')) return base + path.substring(1)
  } else if (!path.startsWith('/')) return base + '/' + path
  return base + path
}

function joinURL (...urls) {
  let result = ''
  urls.forEach((url) => result = (result && _joinURL(result, url) || url))
  return result
}

function getFlaskDebugURL (flaskDebuggerURL, fetchOptions) {
  const debugPayload = {
    url: fetchOptions.url,
    method: fetchOptions.options.method,
  }
  if (fetchOptions.options.body) debugPayload.data = fetchOptions.options.body
  return flaskDebuggerURL + '?' + encodeURIObject(debugPayload)
}

export default class Api {
  constructor (settings) {
    this.taskRetries = {}
    this.errorHandlers = []
    this.config(settings)
  }

  config (settings) {
    this.DEBUG = settings.DEBUG
    this.API_URL = settings.API_URL
    this.API_MODE = settings.API_MODE
    this.API_CREDENTIALS_MODE = settings.API_CREDENTIALS_MODE
    this.TASK_URL = settings.TASK_URL
    this.TASK_REQUEST_MAX_RETRIES = settings.TASK_REQUEST_MAX_RETRIES
    this.TASK_REQUEST_WAIT_TIMEOUT = settings.TASK_REQUEST_WAIT_TIMEOUT
  }

  request (method, url, {qs = null, data = null, taskWaitTimeout = null,
                         taskMaxRetries = null} = {}) {
    const options = {
      method,
      mode: this.API_MODE,
      credentials: this.API_CREDENTIALS_MODE,
    }

    if (qs) {
      qs = JSON.parse(JSON.stringify(qs))  // clone before decamelize
      humps.decamelizeKeys(qs)
      url = url + '?' + encodeURIObject(qs)
    }

    if (data) {
      data = JSON.parse(JSON.stringify(data)) // clone before decamelize
      humps.decamelizeKeys(data)
      options.body = JSON.stringify(data)
      options.headers = new window.Headers({
        'Content-Type': 'application/json; charset=UTF-8',
      })
    }

    const fetchErrorOptions = { fetch: { url: joinURL(this.API_URL, url), options: options } }
    if (this.DEBUG) {
      Object.assign(fetchErrorOptions.fetch, {
        flaskDebugURL: getFlaskDebugURL(joinURL(this.API_URL, 'flask_debugger'),
                                        fetchErrorOptions.fetch)
      })
    }

    return window.fetch(joinURL(this.API_URL, url), options).then(response => {
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
        const data = humps.camelizeKeys(data)
        taskWaitTimeout = !isNoU(data.waitTimeout) ? data.waitTimeout : taskWaitTimeout
        taskMaxRetries = !isNoU(data.maxRetries) ? data.maxRetries : taskMaxRetries
        return this.getTask(data.taskId, taskWaitTimeout, taskMaxRetries)
      }

      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          return humps.camelizeKeys(data)
        })
      }

      return response.json().then(data => {
        data = humps.camelizeKeys(data)
        if (data.error) {
          Object.assign(data.error, fetchErrorOptions)
          return this.error(data.error.code, data.error.message, data.error)
        }
        Object.assign(data, fetchErrorOptions)
        return this.error(response.status, response.statusText, data)
      }, (decodeError) => {
        const data = {decodeError, ...fetchErrorOptions}
        return this.error(response.status, response.statusText, data)
      })
    }, (error) => {
      // network-related problems
      return this.error(-1, error.message, fetchErrorOptions)
    })
  }

  error (code, message, data = {}) {
    console.log(`API error ${code}: ${message}`, data)
    data.codeType = data.codeType || CODE_TYPES[code] || null
    Object.assign(data, {code, message})

    let reject = true
    this.errorHandlers.forEach((callback) => {
      if (callback(data) && reject) reject = false
    })
    if (reject) return Promise.reject(data)
    // We should reject anyway, because otherwise
    // it would be interpreted as fulfilled
    return Promise.reject(null)
  }

  get (url, payload) {
    return this.request('get', url, {qs: payload})
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
    waitTimeout = !isNoU(waitTimeout) ? waitTimeout : this.TASK_REQUEST_WAIT_TIMEOUT
    maxRetries = !isNoU(maxRetries) ? maxRetries : this.TASK_REQUEST_MAX_RETRIES

    if (this.taskRetries[taskId] === 0) {
      delete this.taskRetries[taskId]
      return this.error(600, `Max task request retries exceeded for ${taskId}`)
    } else if (!this.taskRetries[taskId]) {
      this.taskRetries[taskId] = maxRetries
    }
    this.taskRetries[taskId] -= 1

    return timeoutPromise(waitTimeout).then(() => {
      return this.get(this.TASK_URL + taskId, {waitTimeout: waitTimeout})
    })
  }
}
