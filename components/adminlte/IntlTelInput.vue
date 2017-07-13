<template lang="pug">
  input.input-sm.form-control(type="tel", @keyup="input")
</template>

<script>
import jQuery from 'jquery'

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
    }
  },

  mounted () {
    jQuery(this.$el).intlTelInput({
      initialCountry: this.initial,
      autoPlaceholder: '',
      ...this.options
    })
  },

  methods: {
    input () {
      this.$emit('input', jQuery(this.$el).intlTelInput('getNumber'))
    }
  }
}
</script>
