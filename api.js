import { timeoutPromise } from './utils'

const CODE_TYPES = {
  '-1': 'REQUEST_ERROR',
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

  request (method, url, {qs = null, data = null}) {
    const options = {
      method,
      mode: this.API_MODE,
      credentials: this.API_CREDENTIALS_MODE,
    }

    if (qs) {
      const esc = encodeURIComponent
      let query = Object.keys(qs)
                        .map(k => esc(k) + '=' + esc(qs[k]))
                        .join('&')
      url = url + '?' + query
    }

    if (data) {
      options.body = JSON.stringify(data)
      options.headers = new window.Headers({
        'Content-Type': 'application/json; charset=UTF-8',
      })
    }

    return window.fetch(this.API_URL + url, options).then(response => {
      if (response.status === 202) {
        return this.getTask(response.data)
      }

      if (response.status === 200 && response.headers.get('Content-Type') !== 'application/json') {
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
          response.blob().then((data) => {
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(data)
            link.download = filename
            link.click()
          })
        }

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
      return this.error(-1, `REQUEST_ERROR: ${error.message}`)
    })
  }

  error (code, message, data = {}) {
    console.log(`API error ${code}: ${message}`, data)
    data.code_type = data.code_type || CODE_TYPES[code] || null
    Object.assign(data, {code, message})
    return Promise.reject(data)
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
