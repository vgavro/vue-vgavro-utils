<template lang="pug">
th(@click="sort", :style="{cursor: sortable && 'pointer' || 'inherit'}")
  slot {{label || name }}
  i.fa.fa-sort-amount-asc.add-opacity(v-if="sortable && !sortState")
  i.fa.fa-sort-amount-asc(v-if="sortState == 1")
  i.fa.fa-sort-amount-desc(v-if="sortState == -1")
</template>

<style scoped>
.add-opacity {
  opacity: 0.3;
}
</style>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true,
    },

    sortable: {
      type: Boolean,
      default: false,
    },

    label: {
      type: String,
    },

    formatter: {
      type: Function,
    },
  },

  data () {
    return {
      sortState: 0,
    }
  },

  computed: {
    template () {
      return this.$parent.$scopedSlots[this.name]
    }
  },

  created () {
    if (!this.$parent.columns) {
      throw new Error('datatable-column must be registered within a datatable component.')
    }
    if (this.name === 'filters' || this.name === 'moreFilters') {
      throw new Error(`Invalid column name:'${this.name}'!`)
    }
    if (this.$parent.columns.get(this.name)) {
      throw new Error(`Column name is not unique: '${this.name}'!`)
    }

    this.$parent.columns.set(this.name, this)
  },

  destroyed () {
    this.$parent.columns.delete(this.name)
  },

  methods: {
    sort () {
      if (!this.sortable) return
      if (this.sortState === 0) this.sortState = 1
      else if (this.sortState === 1) this.sortState = -1
      else if (this.sortState === -1) this.sortState = 0
      this.$parent.setSort(this)
    },

    renderBoolean (value) {
      if (value) {
        return '<i class="fa fa-check" style="color: green"></i>'
      } else {
        return '<i class="fa fa-close" style="color: red"></i>'
      }
    },

    highlightSearch (value) {
      if (value == null) return ''
      if (!this.$parent.search) return value
      if (!(new RegExp(this.$parent.search, 'i').test(value))) return value

      const indexFinded = value.match(new RegExp(this.$parent.search, 'i'))
      return value.replace(
        new RegExp(this.$parent.search, 'i'),
        `<span class="highlighted">${value.slice(indexFinded.index, indexFinded.index + this.$parent.search.length)}</span>`
      )
    },

    format (item) {
      let value = item[this.name]
      if (this.formatter) {
        value = this.formatter(item, value)
      }
      if (this.name === 'created_at') return this.$options.filters.formatMoment(value, 'YYYY-MM-DD HH:mm')
      if (typeof value === 'boolean') return this.renderBoolean(value)
      if (typeof value === 'string') return this.highlightSearch(value)
      return String(value)
    }
  }
}
</script>
