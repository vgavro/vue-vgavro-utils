import { entries, fromPairs, pickBy } from 'lodash'
import { injectComponentOptionsData, isNoU } from '../utils'

const ERROR_MESSAGES = {
  REQUIRED: 'REQUIRED',
  INVALID: 'INVALID',
  MIN_LENGTH: (length) => `MIN_LENGTH(${length})`,
  MAX_LENGTH: (length) => `MAX_LENGTH(${length})`,
  MIN_VALUE: (value) => `MIN_VALUE(${value})`,
  MAX_VALUE: (value) => `MAX_VALUE(${value})`,
}

export const REQUIRED_STRICT = 'strict'

export class Field {
  constructor (vm, name, {watchData = null, initial = null, required = false, enabled = null,
                          getCoerce = null, setCoerce = null, validators = [], regexp = null,
                          minLength = null, maxLength = null, minValue = null, maxValue = null,
                          errorMessages = {}, ...meta}) {
    this._vm = vm
    this._name = name
    this._watchData = watchData
    this.initial = initial
    this.required = required

    this._enabled = enabled
    this.enabled = true

    this.getCoerce = getCoerce || ((v) => v)
    this.setCoerce = setCoerce || ((v) => v)

    this.errorMessages = {...ERROR_MESSAGES, ...errorMessages}
    this.validators = validators

    if (this.required) {
      this.validators.push((value) => {
        if ((this.required === true && !value) ||
            (this.required === REQUIRED_STRICT && isNoU(value))) {
          return this.errorMessages.REQUIRED
        }
      })
    }
    if (regexp) {
      this.regexp = (regexp instanceof RegExp) ? regexp : new RegExp(regexp)
      this.validators.push((value) => {
        if (value && !this.regexp.test(this.data)) return this.errorMessages.INVALID
      })
    }
    this.minLength = minLength
    !isNoU(minLength) && this.validators.push((value) => {
      if (value.length < this.minLength) {
        return this.errorMessages.MIN_LENGTH(this.minLength)
      }
    })
    this.maxLength = maxLength
    !isNoU(maxLength) && this.validators.push((value) => {
      if (value.length > this.maxLength) {
        return this.errorMessages.MAX_LENGTH(this.maxLength)
      }
    })
    this.minValue = minValue
    !isNoU(minValue) && this.validators.push((value) => {
      if (this.getCoerce(value) > this.minValue) {
        return this.errorMessages.MIN_VALUE(this.minValue)
      }
    })
    this.maxValue = maxValue
    !isNoU(maxValue) && this.validators.push((value) => {
      if (this.getCoerce(value) > this.maxValue) {
        return this.errorMessages.MAX_VALUE(this.maxValue)
      }
    })

    this.meta = meta
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
  constructor (vm, name, {fields = {}, submit = null, submitRejected = null,
                          validate = null, watchFields = null, onCreate = null}) {
    this._vm = vm
    this._name = name
    this._watchers = []
    this.touched = false
    this.errors = []
    this.loading = false

    this.fields = []
    // TODO: parse fields from array, with name attribute
    entries(fields).forEach(([name, params]) => {
      // I guess we don't need this
      // params.formatError = params.formatError || this.formatError
      const field = new Field(vm, name, params)
      // TODO: throw error if name is already defined on form
      // For names same as form public attributes or methods, or duplicates
      // if we're populating array
      this[name] = field
      this.fields.push(field)
    })

    this._submit = submit
    this._submitRejected = submitRejected
    this._validate = validate
    this._watchFields = watchFields
    onCreate && onCreate.call(this._vm, this)
  }

  submit () {
    const result = this._submit.call(this._vm, this.getData(true))
    if (result) {
      this.loading = true
      return result.then((data) => {
        this.loading = false
        return data
      }, (error) => {
        this.loading = false
        if (!this.submitRejected(error)) return Promise.reject(error)
      })
    }
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
      return (f.error || (f.required === true && !f.data) ||
              (f.required === REQUIRED_STRICT && isNoU(f.data)))
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

  submitRejected (error) {
    if ([422, 400].includes(error ? error.code : null) && error.errors) {
      // http://parker0phil.com/img/posts/4xx-status-codes/unprocessable-entity.jpg
      this.setErrors(
        error.errors[''] || [],
        pickBy(error.errors, (value, key) => key)
      )
      return true
    } else if (this._submitRejected) {
      return this._submitRejected.call(this._vm, error)
    }
  }
}

export const FormsMixin = {
  beforeCreate () {
    injectComponentOptionsData(this, fromPairs(_.map(
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

export default FormsMixin
