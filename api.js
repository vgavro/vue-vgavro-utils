import { timeoutPromise } from './utils'

const CODE_TYPES = {
  '-1': 'CONNECTION_ERROR',
  '200': 'OK',
  '202': 'ACCEPTED',
  '403': 'FORBIDDEN',
  '404': 'NOT_FOUND',
  '422': 'UNPROCESSABLE_ENTITY',
  '500': 'INTERNAL_SERVER_ERROR',
}

export default class Api {
  constructor (settings) {
    this.taskRetries = {}
    this.config(settings)
  }

  config (settings) {
    [
      'API_URL',
      'API_MODE',
      'API_CREDENTIALS_MODE',
      'TASK_URL',
      'TASK_REQUEST_MAX_RETRIES',
      'TASK_REQUEST_WAIT_TIMEOUT',
    ].map(key => {
      this[key] = settings[key]
    })
  }

  request (url, method, payload) {
    const options = {
      method,
      mode: this.API_MODE,
      credentials: this.API_CREDENTIALS_MODE,
    }

    if (payload) {
      if (method === 'get' || method === 'head') {
        const esc = encodeURIComponent
        let query = Object.keys(payload)
                          .map(k => esc(k) + '=' + esc(payload[k]))
                          .join('&')
        url = url + '?' + query
      } else {
        options.body = JSON.stringify(payload)
        options.headers = new window.Headers({
          'Content-Type': 'application/json; charset=UTF-8',
        })
      }
    }

    return window.fetch(this.API_URL + url, options).then(response => {
      if (response.status === 202) {
        return this.getTask(response.data)
      }
      if (response.status === 200 && response.headers.get('Content-Type') !== 'application/json') {
        return response.blob()
      }
      if (response.status === 200 || response.status === 201) {
        return response.json()
      }
      return response.json().then(data => {
        if (data.error) {
          return this.error(data.error.code, data.error.message, data.error)
        }
        return this.error(response.status, response.statusText, data)
      }, () => {
        return this.error(response.status, response.statusText)
      })
    }, (error) => {
      // network-related problems
      return this.error(-1, `CONNECTION_ERROR: ${error.message}`)
    })
  }

  error (code, message, data = {}) {
    console.log(`API error ${code}: ${message}`, data)
    data.code_type = data.code_type || CODE_TYPES[code] || null
    Object.assign(data, {code, message})
    return Promise.reject(data)
  }

  get (url, payload) {
    return this.request(url, 'get', payload)
  }
  post (url, payload) {
    return this.request(url, 'post', payload)
  }
  put (url, payload) {
    return this.request(url, 'put', payload)
  }
  delete (url, payload) {
    return this.request(url, 'delete', payload)
  }

  getTask (taskId) {
    if (this.taskRetries[taskId] === 0) {
      delete this.taskRetries[taskId]
      return this.error(600, `Max task request retries exceeded for ${taskId}`)
    }
    if (!this.taskRetries[taskId]) {
      this.taskRetries[taskId] = this.TASK_REQUEST_MAX_RETRIES
    }
    this.taskRetries[taskId] -= 1

    return timeoutPromise(this.TASK_REQUEST_WAIT_TIMEOUT).then(() => {
      return this.get(this.TASK_URL + taskId)
    })
  }
}
