import { mapValues } from 'lodash'
import { injectComponentOptionsData } from './utils'

function createRequest (vm, name, request) {
  return {
    inProgress: 0,
    payload: null,
    error: null,
    data: null,

    call (payload) {
      const result = request.call(vm, payload)
      if (result) {
        const self = vm[name]

        self.inProgress += 1
        self.error = null
        self.payload = payload

        return result
          .then(data => {
            self.inProgress -= 1
            self.data = data
            self.error = null
            return data
          })

          .catch(error => {
            self.inProgress -= 1
            self.data = null
            self.error = error
            return Promise.reject(error)
          })
      }
    },
  }
}

export default {
  beforeCreate () {
    injectComponentOptionsData(this, mapValues(
      this.$options.requests,
      (value, key) => createRequest(this, key, value)
    ))
  },
}
