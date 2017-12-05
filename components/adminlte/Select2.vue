<template lang="pug">
select.select2
  slot
</template>

<script>
import jQuery from 'jquery'
import { vNodeToElement, timeoutPromise } from 'vue-vgavro-utils/utils'

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
    value: [Array, String],
    data: Array,  // component will be reinitialized on data change

    // acts like multiselect, but clears on selection.
    // @select event may be binded.
    simpleSearchbox: Boolean,

    asyncRequest: Function,
    asyncDelay: {
      type: Number,
      default: 1000,
    },

    idAttr: {
      type: String,
      default: 'id',
    },
    textAttr: {
      type: String,
      default: 'text',
    },

    // proxies to select2 options
    minimumInputLength: Number,
    minimumResultsForSearch: Number,
    placeholder: String,
    multiselect: Boolean,
    width: {
      type: String,
      default: '100%',
    },

    options: Object,
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
    mapIdTextAttrs (data) {
      if (this.idAttr === 'id' && this.textAttr === 'text') return data
      return data.map(item => {
        return {
          ...item,
          id: item[this.idAttr],
          text: item[this.textAttr],
        }
      })
    },

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
        ...this.$props.data && {data: this.mapIdTextAttrs(this.$props.data)},

        ...this.simpleSearchbox && {multiple: true},
        ...templateResult && {templateResult},
        ...templateSelection && {templateSelection},

        ...this.asyncRequest && {
          ajax: {
            transport: (params, resolve, reject) => {
              if (this._promise) {
                this._promise.cancel()
              }

              if (this.asyncCache[params.data.term]) {
                return Promise.resolve(
                  resolve({results: this.asyncCache[params.data.term]})
                )
              }

              this._promise = timeoutPromise(this.asyncDelay, () => {
                return this.asyncRequest(params.data.term).then(data => {
                  // will be invoked even on cancel if was already sent
                  data = this.mapIdTextAttrs(data)
                  this.asyncCache[params.data.term] = data
                  return data
                })
              })
              this._promise.then(data => {
                resolve({results: data})
              }, (err) => {
                if (!err || !err.canceled) reject()
              })
              this._promise.term = params.data.term
              return this._promise
            },
          },
        },

        minimumInputLength: this.minimumInputLength,
        minimumResultsForSearch: this.minimumResultsForSearch,
        placeholder: this.placeholder,

        /*
        Fix for bug after resize. See tickets below:
        https://github.com/almasaeed2010/AdminLTE/issues/661
        https://github.com/select2/select2/issues/3278
        */
        width: this.width,

        // ...(this.$el.classList.contains('form-control') &&
        //     {containerCssClass: 'form-control'}),

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
/* Override admin-lte default focus style, obviously for previous select2 version */
/* TODO: Improve it with color change on focus, but not so buggy as it for now */
.select2-dropdown .select2-search__field:focus,
.select2-search--inline .select2-search__field:focus {
  outline: 0;
  border: 0px;
}

.select2-container .select2-selection--multiple {
  /* Override for admin-lte to match form-control
     and avoid jumping on select (default 32px) */
  min-height: 34px;
}

.select2-container--default .select2-selection--multiple .select2-selection__choice {
  /* Override back admin-lte padding, because input jumps on select choice */
  padding-top: 0px;
  padding-bottom: 0px;
  /* Override select2 margin-top (5px) because it jumps on select */
}

/* Overrides to match .form-control fields, if this class was set */
.select2 .form-control input.select2-search__field {
  margin-top: 0;  /* fixes internal input margin-top: 5px; */
}
.select2 .form-control ul.select2-selection__rendered {
  padding: 0;  /* fixes internal input padding-left/padding-right */
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
