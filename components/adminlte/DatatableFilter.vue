<template lang="pug">
div 
  slot
    .form-group
      label &nbsp; {{label || name}}:
      | &nbsp;
      select.form-control(v-if="type == 'select'", v-model="value")
        option(v-for="choice in choices", :value="choice[0]") {{ choice[1] }}
      datepicker(v-if="type == 'datepicker'", v-model="value",
                 :options="datepickerOptions", :value="value")
</template>

<script>
const ERROR_FILTER_NAMES = ['search', 'sort', 'page', 'per_page']

export default {
  props: {
    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      default: 'text',
    },

    label: {
      type: String,
    },

    initial: {
      type: [String, Array],
      default: null,
    },

    choices: {
      type: Array,
      default: () => [],
    },

    options: {
      type: Object,
      default: () => {}
    }
  },

  data () {
    return {
      value: this.initial,
    }
  },

  computed: {
    datepickerOptions () {
      return {
        singleDatePicker: false,
        ...this.options
      }
    },
  },

  created () {
    if (!this.$parent.filters) {
      throw new Error('datatable-filter must be registered within a datatable component.')
    }
    if (this.name in ERROR_FILTER_NAMES) {
      throw new Error(`Invalid filter name: '${this.name}'`)
    }
    if (this.$parent.filters.get(this.name)) {
      throw new Error(`Filter name is not unique: '${this.name}'`)
    }

    this.$parent.filters.set(this.name, this)
    this.$watch('value', () => {
      this.$parent.itemSelected = []
      this.$parent.allSelected = false
      this.$parent.fetch()
    })
  },

  destroyed () {
    this.$parent.filters.delete(this.name)
  },
}
</script>

<style scoped>
  .form-control {
    width: 100px;
    display: inline;
    padding: 6px 6px;
  }
</style>
