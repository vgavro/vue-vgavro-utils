import { pickBy, fromPairs, mapValues, entries } from 'lodash'

function injectOptionsData (vm, data) {
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

export const RequestsMixin = {
  beforeCreate () {
    injectOptionsData(this, mapValues(
      this.$options.requests,
      (value, key) => createRequest(this, key, value)
    ))
  },
}

const DEFAULT_ERROR_MESSAGES = {
  FIELD_REQUIRED: 'FIELD_REQUIRED',
  WRONG_FORMAT: 'WRONG_FORMAT',
  MIN_LENGTH_REQUIRED: (length) => `MIN_LENGTH_REQUIRED(${length})`,
  MAX_LENGTH_REQUIRED: (length) => `MAX_LENGTH_REQUIRED(${length})`,
}

export const EMAIL_REGEXP = /\S+@\S+\.\S+/

export class Field {
  constructor (vm, name, params) {
    console.log(params)
    this._vm = vm
    this._name = name
    this._watchData = params.watchData || null
    this.initial = params.initial || null
    this.required = params.required || false

    this._enabled = params.enabled || null
    this.enabled = true

    this.getCoerce = params.getCoerce || ((v) => v)
    this.setCoerce = params.setCoerce || ((v) => v)

    this.errorMessages = Object.assign({}, DEFAULT_ERROR_MESSAGES,
                                       params.errorMessages || {})
    this.validators = params.validators || []

    if (this.required) this.validators.push((value) => {
      if (value === null || value === undefined) return this.errorMessages.FIELD_REQUIRED
    })
    if (params.regexp) {
      const regexp = (params.regexp instanceof RegExp) ? params.regexp : new RegExp(params.regexp)
      this.validators.push((value) => {
        if (value && !regexp.test(this.data)) return this.errorMessages.WRONG_FORMAT
      })
    }
    if (params.min_length) this.validators.push((value) => {
      if (value.length < params.min_length) return this.errorMessages.MIN_LENGTH_REQUIRED(params.min_length)
    })
    if (params.max_length) this.validators.push((value) => {
      if (value.length > params.max_length) return this.errorMessages.MAX_LENGTH_REQUIRED(params.max_length)
    })

    console.log(name, params, this.validators, params.min_length, params.max_length)

    // TODO: change logic for extra bindings
    this.choices = params.choices
    this.label = params.label
    this.help = params.help
    this.type = params.type

    this.reset()
  }

  reset () {
    this.data = this.initial
    this.touched = false
    this.errors = []
    this.enabled = true
  }

  getData () {
    return this.getCoerce(this.data)
  }

  setData (data) {
    this.data = this.setCoerce(data)
  }

  get error () {
    return this.errors.length > 0 && this.errors[0] || null
  }

  validate (force = false) {
    if (this._enabled) {
      this.enabled = this._enabled.call(this._vm)
      if (!this.enabled) {
        this.errors = []
        return
      }
    }

    if (!force && !this.touched) return

    this.errors = []
    this.validators.forEach(validator => {
      const error = validator.call(this._vm, this.data)
      if (error) {
        if (error instanceof Array) this.errors = this.errors.concat(error)
        else this.errors.push(error)
      }
    })
  }
}

export class Form {
  constructor (vm, name, params) {
    this._vm = vm
    this._name = name
    this._watchers = []
    this.touched = false
    this.errors = []
    this.loading = false

    this.fields = []
    // TODO: parse fields from array
    entries(params.fields).forEach(([name, params]) => {
      params.formatError = params.formatError || this.formatError
      const field = new Field(vm, name, params)
      this[name] = field
      this.fields.push(field)
    })

    this._submit = params.submit || null
    this._validate = params.validate || null
    this._watchFields = params.watchFields || null
    params.onCreate && params.onCreate.call(this._vm, this)
  }

  submit () {
    this.loading = true;
    const result = this._submit.call(this._vm, this.getData(true))
    setTimeout(() => {
      this.loading = false
    if (result) {
      result.catch(error => {
        this.errors = [error.message]
        this.onSubmitRejected(error)
      })

      result.then((data) => {
        this.errors = [data.message ? data.message : 'Done!']
      })
    }
    }, 2000)
    return result
  }

  validate (force = false) {
    if (!force && !this.touched) return
    this.fields.forEach(field => field.validate(force))
    if (this._validate) {
      const error = this._validate.call(this._vm, this.getData())
      if (error) {
        if (error instanceof Promise) {
          error.catch(error_ => {
            if (error_ instanceof Array) this.errors = error_
            else this.errors = [error_]
          })
        } else {
          if (error instanceof Array) this.errors = error
          else this.errors = [error]
        }
      } else {
        this.errors = []
      }
    }
  }

  watch () {
    this._watchers = this.fields.map(field => {
      if (field._enabled) field.enabled = field._enabled.call(this._vm)
      let expr = `${this._name}.${field._name}.data`
      return this._vm.$watch(expr, (newVal, oldVal) => {
        if (field._watchData) {
          if (field._watchData.call(this._vm, newVal, oldVal)) return
        }
        if (this._watchFields) {
          if (this._watchFields.call(this._vm, field, newVal, oldVal)) return
        }
        field.touched = true
        field.errors = []
        this.touched = true
        this.errors = []
        this.validate()
      })
    })
  }

  unwatch () {
    this._watchers.map(unwatch => unwatch())
    this._watchers = []
  }

  reset () {
    this.unwatch()
    this.touched = false
    this.errors = []
    this.fields.map((field) => field.reset())
    this.watch()
  }

  getErrors () {
    return this.errors.concat(...this.fields.map(field => field.errors))
  }

  get error () {
    if (this.errors.length > 0) return this.errors[0]
    let field = this.fields.find(f => f.error)
    return field && field.error || null
  }

  get isReady () {
    if (this.errors.length > 0) return false
    return !this.fields.some(f => {
      return (f.error || (f.required && (f.data === null || f.data === undefined)))
    })
  }

  formatError (error) {
    // TODO
    return String(error)
  }

  setErrors (formErrors, fieldErrors = {}) {
    this.errors = formErrors
    this.fields.map(field => {
      field.errors = fieldErrors[field._name] || []
    })
  }

  clearErrors () {
    this.errors = []
    this.fields.map(field => {
      field.errors = []
    })
  }

  getData (onlyEnabled = false) {
    let fields = this.fields
    if (onlyEnabled) fields = fields.filter((f) => f.enabled)
    return fromPairs(fields.map(field => {
      return [field._name, field.getData()]
    }))
  }

  setData (data) {
    this.unwatch()
    this.touched = false
    this.errors = []
    this.fields.map((field) => {
      field.reset()
      if (data.hasOwnProperty(field._name)) {
        field.setData(data[field._name])
      }
    })
    this.watch()
  }

  onSubmitRejected (error) {
    if ([422, 400].includes(error.code) && error.errors) {
      // http://parker0phil.com/img/posts/4xx-status-codes/unprocessable-entity.jpg
      this.setErrors(
        error.errors[''] || [],
        pickBy(error.errors, (value, key) => key)
      )
    }
  }
}

export const FormsMixin = {
  beforeCreate () {
    injectOptionsData(this, fromPairs(_.map(
      entries(this.$options.forms),
      ([name, form]) => [name, new Form(this, name, form)]
    )))
  },

  created () {
    for (let formName in this.$options.forms) {
      this[formName].watch()
    }
  },
}
