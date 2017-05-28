<template lang="pug">
select
  slot
</template>

<script>
import jQuery from 'jquery'

// from https://vuejs.org/v2/examples/select2.html
// see select2 docs on http://select2.github.io/select2/#documentation

export default {
  props: ['options', 'value'],

  mounted: function () {
    var vm = this

    jQuery(this.$el)
      // init select2
      .select2({ data: this.options })
      .val(this.value)
      .trigger('change')
      // emit event on change.
      .on('change', function () {
        vm.$emit('input', this.value)
      })
  },

  watch: {
    value: function (value) {
      // update value
      $(this.$el).val(value).trigger('change');
    },

    // uncomment this if we want to update options on parent changes
    // options: function (options) {
    //   // update options
    //   $(this.$el).select2({ data: options })
    // }
  },

  destroyed: function () {
    $(this.$el).off().select2('destroy')
  }
}
