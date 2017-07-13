<template lang="pug">
select.select2
  slot
</template>

<script>
import jQuery from 'jquery'
import { vNodeToElement } from 'vue-vgavro-utils/utils'

// Current documentation (v4):
// https://select2.github.io/options.html

// NOTE: example for select2 v3
// https://vuejs.org/v2/examples/select2.html
// there is documentation for old (v3) version:
// http://select2.github.io/select2/#documentation

export default {
  props: ['value', 'data', 'options'],

  mounted () {
    this.bindSelect2()
    jQuery(this.$el).on('change', (ev) => {
      this.$emit('input', ev.target.value)
    })
  },

  watch: {
    value (value) {
      jQuery(this.$el).val(value).trigger('change')
    },
    '$props.data' () {
      jQuery(this.$el).empty()
      this.bindSelect2()
    },
  },

  methods: {
    bindSelect2 () {
      let templateResult = null
      if (this.$scopedSlots.item) {
        templateResult = (item) => {
          return vNodeToElement(this.$scopedSlots.item(item))
        }
      }
      let templateSelection = templateResult
      if (this.$scopedSlots['item-selected']) {
        templateSelection = (item) => {
          return vNodeToElement(this.$scopedSlots['item-selected'](item))
        }
      }
      jQuery(this.$el).select2({
        data: this.$props.data,
        templateResult: templateResult,
        templateSelection: templateSelection,
        ...this.options
      })
        .val(this.value)
        .trigger('change')
    },
  },

  destroyed () {
    jQuery(this.$el).off().select2('destroy')
  }
}
</script>
