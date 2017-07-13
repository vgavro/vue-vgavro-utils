<template lang="pug">
  input.input-sm.form-control(type="tel", @keyup="input")
</template>

<script>
import jQuery from 'jquery'

let LIBPHONENUMBER_UTILS_LOADED = false

export default {
  /*
   *  https://github.com/jackocnr/intl-tel-input#options
   */
  props: {
    options: {
      type: Object,
      default: () => {}
    },
    initial: {
      type: String,
      default: ''
    },
    emitValidOnly: {
      type: Boolean,
      default: false
    },
    value: {
      type: String,
      default: ''
    }
  },

  mounted () {
    if (!LIBPHONENUMBER_UTILS_LOADED) {
      const intlTelInputScript = document.createElement('script')
      intlTelInputScript.src = config.intlTelInputUtilsUrl
      intlTelInputScript.onload = () => {
        console.log('loaded')
        LIBPHONENUMBER_UTILS_LOADED = true
      }
      document.head.appendChild(intlTelInputScript)
    }

    jQuery(this.$el).intlTelInput({
      initialCountry: this.initial,
      autoPlaceholder: '',
      ...this.options
    })
    if (this.value) {
      jQuery(this.$el).intlTelInput('setNumber', this.value)
      this.$emit('valid', jQuery(this.$el).intlTelInput('isValidNumber'))
    }
  },

  methods: {
    input () {
      if (this.emitValidOnly) {
        const isValid = jQuery(this.$el).intlTelInput('isValidNumber')
        this.$emit('input', isValid ? jQuery(this.$el).intlTelInput('getNumber') : null)
      } else {
        this.$emit('input', jQuery(this.$el).intlTelInput('getNumber'))
        this.$emit('valid', jQuery(this.$el).intlTelInput('isValidNumber'))
      }
    }
  }
}
</script>
