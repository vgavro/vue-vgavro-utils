<template lang="pug">
div
  div(style="height: 45px")
    .input-group.pull-left
      span.input-group-addon
        i.fa.fa-search
      input.form-control(type="text", placeholder="Search", v-model="search")
      .input-group-btn
       button.btn.btn-info Search
    .pull-right.filters
      slot(name="filters")
      div(style="padding-top: 5px; margin-left: 5px;", v-if="$slots.moreFilters")
        label More filters:
          | &nbsp;
          icheck(@input="(value) => showMoreFilters = value", :value="showMoreFilters")

  slot(name="moreFilters", v-if="showMoreFilters")

  .progress-bar
    progress-bar(:thin="true", v-if="loading")

  table.table.table-bordered.table-hover
    thead
      tr
        // columns
        th.table-id.checkboxElement(v-if="actions.length", @click="allSelect")
          input(type='checkbox', :class="{noSelect: !allSelected}", :checked="selectedCount > 0 || allSelected", :disabled="!items.length")
        slot
    tbody
      tr.table-id(v-for="item in items")
        td.checkboxElement(v-if="actions.length", @click="selectElement(item.id)")
          input(type="checkbox", :value="item.id", :checked="allSelected || itemSelected.indexOf(item.id) != -1")
        td(v-for="column in columns_")
          datatable-cell(:item="item", :column="column")

        //td
        //  img.user-image(src="//www.gravatar.com/avatar/5a613c7e4a6b21d20e4870515fe9b030?d=identicon&amp;s=260" style="height: 25px; width: 25px; border-radius: 50%; margin-right: 5px;")
        //  | somevalue@com
        //td wtf
        //td yoyo

  div
    span.label.bg-primary
      i.fa.fa-list-ul
      | &nbsp;
      | {{ totalCount }}

    span.label(v-if="totalCount != filteredCount", style="background-color: #00acd6; font-size: 14px; margin-right: 5px; line-height: 34px;")
      i.fa.fa-filter
      | &nbsp;
      | {{ filteredCount }}

    span.label.bg-red
      i.fa.fa-check-square-o
      | &nbsp;
      | {{ selectedCount }}

    div.btn-group(style="margin-top: -3px;")
      button.btn.btn-default.dropdown-toggle(:disabled="!(actions.length && (selectedCount > 0 || allSelected))", data-toggle="dropdown", aria-expanded="false")
        | Select action
        | &nbsp;
        i.fa.fa-caret-down
      ul.dropdown-menu
        li
           a(href="#" v-for="action in actions", @click="runAction(action.callback)") {{ action.name }}

    div.pull-right
      i.fa.fa-eye-slash(style="margin-right: 5px")
      select.form-control(v-model="perPage")
        option(v-for="perPage_ in perPageChoices") {{ perPage_ }}
      div.btn-group
        button.btn(:disabled="!firstPage", @click="setPage(firstPage)")
          i.fa.fa-step-backward
        button.btn(:disabled="!prevPage", @click="setPage(prevPage)")
          i.fa.fa-arrow-left
        button.btn(v-for="page_ in pagesRange", @click="setPage(page_)", :class="{'btn-bold': page_ == page}", :disabled="page_ == page") {{page_}}
        button.btn(:disabled="!nextPage", @click="setPage(nextPage)")
          i.fa.fa-arrow-right
        button.btn(:disabled="!lastPage", @click="setPage(lastPage)")
          i.fa.fa-step-forward
</template>

<script>
import { range, isNoU } from 'vue-vgavro-utils/utils'
import moment from 'moment'

const PER_PAGE_CHOICES = [25, 50, 100]
const PER_PAGE_DEFAULT = 25
const PAGES_RANGE_COUNT = 5  // NOTE: should be odd

const DatatableCell = {
  functional: true,
  name: 'datatable-cell',

  props: {
    item: Object,
    column: Object,
  },

  render (createElement, context) {
    const item = context.props.item
    const column = context.props.column
    if (column.template) {
      const vNode = column.template({item, column, value: item[column.name]})
      return createElement('td', {}, [vNode])
    } else {
      return createElement('td', {
        domProps: {
          innerHTML: column.format(item),
        },
      })
    }
  }
}

export default {
  props: {
    fetchCallback: {
      type: Function,
      required: true,
    },
    actions: {
      type: Array,
      default: () => [],
    },
    perPageChoices: {
      type: Array,
      default: () => PER_PAGE_CHOICES,
    },
    pagesRangeCount: {
      type: Number,
      default: PAGES_RANGE_COUNT,
    },
    searchOnTypeDelay: {
      type: Number,
      default: 0
    },
    exposeQueryString: {
      type: Boolean,
      default: false
    },
    initQuery: {
      type: Object,
      default: () => {}
    }
  },

  data () {
    return {
      columns: new Map(), // populated from DatatableColumn component
      filters: new Map(), // populated from DatatableFilter component
      sortOrder: [],
      page: 1,
      perPage: PER_PAGE_DEFAULT,
      pages: null,
      filteredCount: null,
      totalCount: null,
      items: [],
      search: '',
      itemSelected: [],
      allSelected: false,
      loading: false,
      showMoreFilters: false
    }
  },

  computed: {
    selectedCount () {
      if (this.allSelected) {
        if (this.filteredCount) {
          return this.filteredCount
        } else {
          return this.totalCount
        }
      } else {
        return this.itemSelected.length
      }
    },
    columns_ () {
      // TODO: temporary fix
      // iterating values() directly from template
      // does not work for some reason!
      const result = []
      for (let x of this.columns.values()) {
        result.push(x)
      }
      return result
    },

    firstPage () {
      return (this.pages && this.page > 1 && 1)
    },
    prevPage () {
      return (this.pages && this.page > 1 && this.page - 1)
    },
    nextPage () {
      return (this.pages && this.page < this.pages && this.page + 1)
    },
    lastPage () {
      return (this.pages && this.page < this.pages && this.pages)
    },

    pagesRange () {
      // tricky logic to view maximum pagesRangeCount pages, nearest to current
      if (!this.pages) {
        return []
      } else if (this.pages <= this.pagesRangeCount) {
        return range(1, this.pages + 1)
      } else {
        const x = Math.ceil(this.pagesRangeCount / 2)

        if (this.page <= x) {
          return range(1, this.pagesRangeCount + 1)
        } else if (this.page >= (this.pages - x)) {
          return range(this.pages - x - 1, this.pages + 1)
        } else {
          return range(this.page - (x - 1), this.page + (x - 1) + 1)
        }
      }
    }
  },

  created () {
    if (!(this.pagesRangeCount % 2)) throw new Error('pagesRangeCount should be odd')
  },

  mounted () {
    this.initQueryString(this.initQuery)
    this.exposeQueryString && this.initQueryString(this.$route.query)

    this.fetch()

    this.$watch('search', () => {
      if (this._searchTimeout) {
        clearTimeout(this._searchTimeout)
      }

      this._searchTimeout = setTimeout(() => {
        this.allSelected = false
        this.itemSelected = []
        this.fetch(true)
      }, this.searchOnTypeDelay)
    })

    this.$watch('perPage', () => this.fetch(true))
  },

  methods: {
    initQueryString (from) {
      this.perPage = isNoU(from.per_page) ? this.perPage : from.per_page
      this.search = isNoU(from.search) ? '' : from.search
      this.page = isNoU(from.page) ? 1 : from.page
      !isNoU(from.sort) && from.sort.split(',').forEach((sort) => {
        if (sort[0] === '-') {
          if (!isNoU(this.columns.get(sort.slice(1)))) {
            this.columns.get(sort.slice(1)).sortState = -1
          }
        } else {
          if (!isNoU(this.columns.get(sort))) {
            this.columns.get(sort).sortState = 1
          }
        }

        this.sortOrder.push(sort[0] === '-' ? sort.slice(1) : sort)
      })

      for (let [name, filter] of this.filters) {
        if (from[name] && filter.type === 'datepicker') {
          filter.value = from[name]
        }
        if (filter.type === 'select') {
          filter.value = from[name] || null
        }
      }
    },

    allSelect () {
      if (this.allSelected) {
        this.allSelected = false
        this.itemSelected = []
        return
      }

      if (this.selectedCount) {
        this.itemSelected = []
      } else if (this.items.length) {
        this.allSelected = true
      }
    },

    selectElement (id) {
      if (this.allSelected) {
        this.itemSelected = [id]
        this.allSelected = false
        return
      }
      if (this.itemSelected.indexOf(id) !== -1) {
        let index = this.itemSelected.indexOf(id)
        this.itemSelected.splice(index, 1)
      } else {
        this.itemSelected.push(id)
      }
    },
    runAction (callback) {
      let users = this.itemSelected
      if (this.allSelected) users = null

      callback(users, this.generateFilters())
    },

    dateToUTC (value) {
      return moment(value).utc().format()
    },

    format (filter) {
      if (filter.type === 'datepicker') {
        if (filter.value instanceof Array) {
          return this.dateToUTC(filter.value[0]) + ',' + this.dateToUTC(filter.value[1])
        } else {
          if (filter.value.indexOf(',')) {
            const dates = filter.value.split(',')
            return this.dateToUTC(dates[0]) + ',' + this.dateToUTC(dates[1])
          } else {
            return this.dateToUTC(filter.value)
          }
        }
      }
      return filter.value
    },

    generateFilters () {
      const payload = {
        sort: [],
        search: this.search
      }
      this.filters.forEach((filter) => {
        if (filter.value !== null) payload[filter.name] = this.format(filter)
      })

      this.sortOrder.forEach((name) => {
        const column = this.columns.get(name)
        if (payload.sort.indexOf(column.name) === -1) {
          payload.sort.push(((column.sortState === -1) && '-' || '') + column.name)
        }
      })
      payload.sort = payload.sort.join(',')
      return payload
    },

    changeQueryString (obj) {
      this.$router.push({query: Object.assign({}, obj)})
    },

    fetch (resetPage = false) {
      this.loading = true
      if (resetPage) this.page = 1
      const payload = Object.assign(this.generateFilters(), {
        page: this.page,
        per_page: this.perPage
      })
      if (this.exposeQueryString) this.changeQueryString(payload)
      payload.sort = payload.sort + ','
      return this.fetchCallback(payload).then((data) => {
        this.page = payload.page || data.page
        this.pages = data.pages
        this.filteredCount = data.count
        this.totalCount = data.total
        this.items = data.items

        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },

    setPage (page) {
      this.page = page
      return this.fetch()
    },

    setSort (column) {
      const index = this.sortOrder.indexOf(column.name)
      if (!column.sortState && index === (this.sortOrder.length - 1)) {
        // do not reload if sorting dropped on last column
        this.sortOrder.splice(index, 1)
        return
      }
      if (index === -1 && column.sortState) this.sortOrder.push(column.name)
      else if (index >= 0 && !column.sortState) this.sortOrder.splice(index, 1)
      this.fetch()
    },
  },

  components: {
    'datatable-cell': DatatableCell,
  },
}
</script>

<style scoped>
.pull-left {
  margin-bottom: 10px;
  width: 300px;
}

.pull-right.filters {
  display: inline-flex;
}

select.form-control {
  width: 60px;
  display: inline;
  padding: 6px 6px;
  margin-right: 5px;
}

.noSelect {
  opacity: 0.5;
}

.btn-group {
  margin-top: -3px;
}

table.table-bordered {
  background: white;
  margin-bottom: 10px;
}

span.label {
  font-size: 14px;
  margin-right: 5px;
  line-height: 34px;
}

.table-id {
  width: 10px;
}

.checkboxElement {
  cursor: pointer;
}

input[type="checkbox"] {
  cursor: pointer;
}

.progress-bar {
  height: 3px;
  margin-bottom: 15px;
  width: 100%;
  background-color: transparent;
}
</style>

<style>
.highlighted {
  background-color: yellow;
  border-radius: 4px;
}
</style>
