<template lang="pug">
select.select2
  slot
</template>

<script>
import jQuery from 'jquery'
import { vNodeToElement, timeoutPromise, makeCancelable } from 'vue-vgavro-utils/utils'

// Current documentation (v4):
// https://select2.github.io/options.html

// Because of lack of documentation better to see source:
// https://github.com/select2/select2/blob/master/dist/js/select2.full.js

// NOTE: example for select2 v3
// https://vuejs.org/v2/examples/select2.html
// there is documentation for old (v3) version:
// http://select2.github.io/select2/#documentation

const searchingBox = jQuery('<span style="color: #999">Searching' +
                            '<span class="dotdotdot"></span></span>')

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
    if (this.asyncRequest) {
      this.asyncCache = {}
    }
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
            return searchingBox
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
        // temporary fix for stupid "errorLoading" on search in progress
        // see https://github.com/select2/select2/issues/4355#issuecomment-281254991
        // and this pull request https://github.com/select2/select2/pull/4356
        // obviously would be merged with select2 4.0.4?.....
        // NOTE: sometime it may really be some error, but no obvious reasons
        language: {errorLoading: () => searchingBox},

        ...this.$props.data && {data: this.$props.data},

        ...this.simpleSearchbox && {multiple: true},
        ...templateResult && {templateResult},
        ...templateSelection && {templateSelection},

        ...this.asyncRequest && {
          ajax: {
            transport: (params, resolve, reject) => {
              if (this._promise) this._promise.cancel()

              if (this.asyncCache[params.data.term]) {
                console.log('hitting cache', params.data.term)
                return resolve({results: this.asyncCache[params.data.term]})
              }

              this.asyncLoading = true
              this._promise = makeCancelable(timeoutPromise(this.asyncDelay).then(() => {
                return this.asyncRequest(params.data.term)
              }))
              this._promise.then(data => {
                this.asyncLoading = false
                this.asyncCache[params.data.term] = data
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
<style>
/* override admin-lte default focus style, obviously for previous select2 version */
/* TODO: improve it with color change on focus, but not so buggy as it for now */
.select2-dropdown .select2-search__field:focus,
.select2-search--inline .select2-search__field:focus {
    outline: 0;
    border: 0px;
}

/* for searchingBox */
.dotdotdot:after {
  font-weight: 300;
  content: '...';
  display: inline-block;
  width: 20px;
  text-align: left;
  animation: dotdotdot 1.5s linear infinite;
}

@keyframes dotdotdot {
  0% {
    content: '...';
  }
  25% {
    content: '';
  }
  50% {
    content: '.';
  }
  75% {
    content: '..';
  }
}
</style>
