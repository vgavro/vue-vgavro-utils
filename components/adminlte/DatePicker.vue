<template lang="pug">
input.input-sm.form-control(type='text')
</template>

<script>
import jQuery from 'jquery'
import moment from 'moment'

const DEFAULT_OPTIONS = {
  autoUpdateInput: false,
  timePicker24Hour: true,
  locale: {
    format: 'YYYY-MM-DD'
  },
}

export default {
  props: {
    single: {
      type: Boolean,
      default: true,
    },
    time: {
      type: Boolean,
      default: false,
    },
    // See http://www.daterangepicker.com/#options
    options: {
      type: Object,
      default: () => {}
    },
    value: {
      type: [String, Array, Object]
    }
  },

  mounted () {
    const options = {
      singleDatePicker: this.single,
      timePicker: this.time,
      ...DEFAULT_OPTIONS,
      ...this.options
    }
    const $el = jQuery(this.$el)
    $el.daterangepicker(options)
    this.parseValue(this.value, options)
    $el.on('apply.daterangepicker', (ev, picker) => {
      if (options.singleDatePicker) {
        this.$emit('input', picker.startDate)
      } else {
        this.$emit('input', [picker.startDate, picker.endDate])
      }
    })
    $el.on('apply.daterangepicker', (ev, picker) => {
      if (options.singleDatePicker) {
        $el.val(moment(picker.startDate).format('YYYY-MM-DD'))
      } else {
        $el.val(moment(picker.startDate).format('YYYY-MM-DD') + ' - ' +
                moment(picker.endDate).format('YYYY-MM-DD'))
      }
    })
    $el[0].value = ''
    this.$watch('value', (newValue) => {
      this.parseValue(newValue, options)
    })

    // Fix for showing in viewport bounds
    // https://github.com/dangrossman/bootstrap-daterangepicker/issues/1381#issuecomment-293771732
    // TODO: not working good anyway
    // $el.on('show.daterangepicker', function (e, picker) {
    //   var $e = jQuery(e.target)
    //   var cBounds = picker.container.get(0).getBoundingClientRect()
    //   var pBounds = $e.get(0).getBoundingClientRect()
    //   var viewport = { width: window.innerWidth, height: window.innerHeight }
    //   var doMove = false
    //   if (cBounds.right > viewport.width && (pBounds.right - cBounds.width) >= 0) {
    //     picker.opens = 'left'; doMove = true
    //   }
    //   if (cBounds.bottom > viewport.height && (pBounds.top - cBounds.height) >= 0) {
    //     picker.drops = 'up'; doMove = true
    //   }
    //   if (doMove) {
    //     picker.move()
    //     picker.show()
    //   }
    // })
  },

  methods: {
    parseValue (value, options) {
      if (options.singleDatePicker) {
        if (value) jQuery(this.$el).data('daterangepicker').setStartDate(moment(value))
      } else {
        if (value && value.indexOf(',') !== -1) {
          const dates = value.split(',')
          jQuery(this.$el).data('daterangepicker').setStartDate(moment(dates[0]))
          jQuery(this.$el).data('daterangepicker').setEndDate(moment(dates[1]))
        }
      }
    }
  },

  destroyed: function () {
    jQuery(this.$el).data('daterangepicker').remove()
  }
}
</script>

<style scoped>
  input {
    height: 34px;
    width: 150px !important;
  }
</style>

