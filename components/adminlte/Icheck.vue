<template lang="pug">
input(type="checkbox", :checked="Boolean(value)")
</template>

<script>
import 'admin-lte/plugins/iCheck/icheck.js'
import 'admin-lte/plugins/iCheck/square/green.css'
import jQuery from 'jquery'

export default {
  props: ['value'],

  mounted () {
    jQuery(this.$el).iCheck({
      checkboxClass: 'icheckbox_square-green',
      radioClass: 'iradio_square-green',
      increaseArea: '20%',
    }).on('ifToggled', event => {
      this.$emit('input', event.target.checked)
    })
  },
}
</script>
