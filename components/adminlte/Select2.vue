<template lang="pug">
select.select2
  slot
</template>

<script>
import jQuery from 'jquery'
import { vNodeToElement, makeCancelable } from 'vue-vgavro-utils/utils'

// Current documentation (v4):
// https://select2.github.io/options.html

// Because of lack of documentation better to see source:
// https://github.com/select2/select2/blob/master/dist/js/select2.full.js

// NOTE: example for select2 v3
// https://vuejs.org/v2/examples/select2.html
// there is documentation for old (v3) version:
// http://select2.github.io/select2/#documentation

export default {
  props: {
    value: String,
    data: Object,  // component will be reinitialized on data change

    // acts like multiselect, but clears on selection.
    // @select event may be binded.
    simpleSearchbox: Boolean,

    asyncRequest: Function,
    asyncDelay: {
      type: Number,
      default: 500,
    },

    // proxies to select2 options
    minimumInputLength: Number,
    placeholder: String,
    multiselect: Boolean,

    options: Object,
  },

  data: {
    asyncLoading: false,
  },

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
          if (item.disabled && item.loading && item.text === 'Searching…') {
            // NOTE: hardcoded fix to avoid rendering some shit on ajax request.
            // No idea how to do it better for now.
            // item.text === 'Searching…' may be more specific, but obviously
            // may be broken on i18n.
            return
          }
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
        ...this.$props.data && {data: this.$props.data},

        ...this.simpleSearchbox && {multiple: true},
        ...templateResult && {templateResult},
        ...templateSelection && {templateSelection},

        ...this.asyncRequest && {
          ajax: {
            delay: this.asyncDelay,
            transport: (params, resolve, reject) => {
              this.asyncLoading = true
              if (this._promise) this._promise.cancel()
              this._promise = makeCancelable(this.asyncRequest(params.data.term))
              this._promise.then(data => {
                this.asyncLoading = false
                resolve({results: data})
              }, () => {
                this.asyncLoading = false
                reject()
              })
              return this._promise
            },
          },
        },

        minimumInputLength: this.minimumInputLength,
        placeholder: this.placeholder,
        ...this.multiselect && {multiselect: true},
        ...this.options,
      })
        .val(this.value)
        .trigger('change')

      jQuery(this.$el).on('select2:select', (ev) => {
        this.$emit('select', ev.params.data)
        if (this.simpleSearchbox) {
          jQuery(this.$el).val(null).trigger('change')
        }
      })
    },
  },

  destroyed () {
    jQuery(this.$el).off().select2('destroy')
  }
}
</script>
