<template lang="pug">
div
  div(style="height: 45px" v-if="enableSearch")
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
        th.table-id.checkboxElement(v-if="actions.length || enableCheck", @click="selectAll")
          input(type='checkbox', :class="{noSelect: !allSelected}", :checked="selectedCount > 0 || allSelected", :disabled="!pageItems.length")
        slot
    tbody
      tr.table-id(v-for="item in pageItems" :key="getItemId(item)")
        td.checkboxElement(v-if="actions.length || enableCheck", @click="selectItem(getItemId(item))")
          input(type="checkbox", :value="getItemId(item)", :checked="allSelected || selectedItemIds.indexOf(getItemId(item)) != -1")
        td(v-for="column in columns_")
          datatable-cell(:item="item", :column="column")

        //td
        //  img.user-image(src="//www.gravatar.com/avatar/5a613c7e4a6b21d20e4870515fe9b030?d=identicon&amp;s=260" style="height: 25px; width: 25px; border-radius: 50%; margin-right: 5px;")
        //  | somevalue@com
        //td wtf
        //td yoyo

  div
    span.label.bg-primary(v-if="showCounters")
      i.fa.fa-list-ul
      | &nbsp;
      | {{ totalCount }}

    span.label(v-if="showCounters && totalCount != filteredCount", style="background-color: #00acd6; font-size: 14px; margin-right: 5px; line-height: 34px;")
      i.fa.fa-filter
      | &nbsp;
      | {{ filteredCount }}

    span.label.bg-red(v-if="showCounters")
      i.fa.fa-check-square-o
      | &nbsp;
      | {{ selectedCount }}

    div.btn-group(style="margin-top: -3px;" v-if="actions.length")
      button.btn.btn-default.dropdown-toggle(:disabled="!(actions.length && (selectedCount > 0 || allSelected))", data-toggle="dropdown", aria-expanded="false")
        | Select action
        | &nbsp;
        i.fa.fa-caret-down
      ul.dropdown-menu
        li
           a(href="#" v-for="action in actions", @click="runAction(action.callback)") {{ action.name }}

    div.pull-right(v-if="(pages > 1) || showPagesAlways")
      i.fa.fa-eye-slash(style="margin-right: 5px")
      select.form-control(v-model="currentPerPage")
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
import { range } from 'vue-vgavro-utils/utils'
import moment from 'moment'

const DEFAULT_ID_ATTR = 'id'
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
    },
    items: {
      type: Array,
    },  // fetchCallback or items required
    idAttr: {
      type: String,
      default: DEFAULT_ID_ATTR,
    },
    actions: {
      type: Array,
      default: () => [],
    },
    perPageChoices: {
      type: Array,
      default: () => PER_PAGE_CHOICES,
    },
    perPage: {
      type: Number,
      default: PER_PAGE_DEFAULT,
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
    },
    showPagesAlways: {
      type: Boolean,
      default: true,
      // only showing pages if more than one otherwise
    },
    showCounters: {
      type: Boolean,
      default: true,
    },
    enableCheck: {
      // automatic enabled if actions not empty anyway
      type: Boolean,
      default: false,
    },
    enableSearch: {
      type: Boolean,
      default: false,
    },
  },

  data () {
    return {
      columns: new Map(), // populated from DatatableColumn component
      filters: new Map(), // populated from DatatableFilter component
      sortOrder: [],
      page: 1,
      currentPerPage: this.$props.perPage,
      pages: null,
      filteredCount: null,
      totalCount: null,
      pageItems: [], // on page items
      search: '',
      selectedItemIds: [],
      allSelected: false,
      loading: false,
      showMoreFilters: false
    }
  },

  computed: {
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

    selectedCount () {
      if (this.allSelected) {
        return this.filteredCount || this.totalCount
      } else {
        return this.selectedItemIds.length
      }
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
    if ((!this.fetchCallback && !this.items) ||
        (this.fetchCallback && this.items)) {
      throw new Error('One of fetchCallback or items required')
    }
    if (!(this.pagesRangeCount % 2)) {
      throw new Error('pagesRangeCount should be odd')
    }
  },

  mounted () {
    this.initQuery && this.initQueryString(this.initQuery)
    this.exposeQueryString && this.initQueryString(this.$route.query)

    this.fetch()
  },

  watch: {
    search () {
      if (this._searchTimeout) {
        clearTimeout(this._searchTimeout)
      }

      this._searchTimeout = setTimeout(() => {
        this.allSelected = false
        this.selectedItemIds = []
        this.fetch(true)
      }, this.searchOnTypeDelay)
    },
    currentPerPage () {
      this.fetch(true)
    },
    perPage (val) {
      this.currentPerPage = val
    },
  },

  methods: {
    initQueryString (from) {
      this.currentPerPage = from.perPage == null ? this.currentPerPage : from.perPage
      this.search = from.search == null ? '' : from.search
      this.page = from.page == null ? 1 : from.page
      from.sort != null && from.sort.split(',').forEach((sort) => {
        if (sort[0] === '-') {
          if (this.columns.get(sort.slice(1)) != null) {
            this.columns.get(sort.slice(1)).sortState = -1
          }
        } else {
          if (this.columns.get(sort) != null) {
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

    selectAll () {
      if (this.allSelected) {
        this.allSelected = false
        this.selectedItemIds = []
        return
      }

      if (this.items) {
        // different logic on allSelected for items and fetchCallback behaviour
        this.selectedItemIds = this.items.map(this.getItemId)
        if (this.pageItems.length) this.allSelected = true
        return
      }

      if (this.selectedCount) {
        this.selectedItemIds = []
      } else if (this.pageItems.length) {
        this.allSelected = true
      }
    },

    selectItem (id) {
      if (!this.items && this.allSelected) {
        // different logic on allSelected for items and fetchCallback behaviour
        if ((this.filteredCount || this.totalCount) > 1) {
          this.selectedItemIds = [id]
        } else {
          this.selectedItemIds = []
        }
        this.allSelected = false
      } else if (this.selectedItemIds.indexOf(id) !== -1) {
        let index = this.selectedItemIds.indexOf(id)
        this.selectedItemIds.splice(index, 1)
        this.allSelected = false
      } else {
        this.selectedItemIds.push(id)
      }

      if (this.selectedItemIds.length >= (this.filteredCount || this.totalCount)) {
        this.allSelected = true
      }
    },

    getItemId (item) {
      return item[this.idAttr]
    },

    runAction (callback) {
      let users = this.selectedItemIds
      if (this.allSelected) users = null
      callback(users, this.createFiltersPayload())
    },

    dateToUTC (value) {
      return moment(value).utc().format()
    },

    createSortPayload () {
      const sort = []
      this.sortOrder.forEach((name) => {
        const column = this.columns.get(name)
        if (sort.indexOf(column.name) === -1) {
          sort.push(((column.sortState === -1) && '-' || '') + column.name)
        }
      })
      return sort.join(',')
    },

    createFilterPayload (filter) {
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

    createFiltersPayload () {
      const payload = {
        search: this.search,
      }
      this.filters.forEach((filter) => {
        if (filter.value !== null) {
          payload[filter.name] = this.createFilterPayload(filter)
        }
      })
      return payload
    },

    changeQueryString (obj) {
      this.$router.push({query: Object.assign({}, obj)})
    },

    _fetch (payload) {
      if (this.fetchCallback) return this.fetchCallback(payload)

      // TODO: not implemented filtering or sorting
      let items = this.items
      let pages = 1
      if (payload.perPage && payload.perPage < this.items.length) {
        const start = (payload.page - 1) * payload.perPage
        const end = start + payload.perPage
        items = this.items.slice(start, end)
        pages = Math.ceil(this.items.length / payload.perPage)
      }
      return Promise.resolve({
        items,
        pages,
        total: this.items.length,
        count: this.items.length,
      })
    },

    fetch (resetPage = false) {
      this.loading = true
      if (resetPage) this.page = 1
      const payload = {
        ...this.createFiltersPayload(),
        sort: this.createSortPayload(),
        page: this.page,
        perPage: this.currentPerPage  // TODO: check it after per_page -> perPage renaming
      }
      if (this.exposeQueryString) this.changeQueryString(payload)
      payload.sort = payload.sort + ','
      return this._fetch(payload).then((data) => {
        this.page = payload.page || data.page
        this.pages = data.pages
        this.filteredCount = data.count
        this.totalCount = data.total
        this.pageItems = data.items

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

    getSelectedItems () {
      if (!this.items) throw new Error('Supply "items" to use this method')

      if (this.allSelected) return this.items
      return this.items.filter((item) => {
        return this.selectedItemIds.includes(this.getItemId(item))
      })
    },

    addItemUnique (item, select = false) {
      if (!this.items) throw new Error('Supply "items" to use this method')

      const itemId = this.getItemId(item)
      if (this.items.find((item_) => this.getItemId(item_) === itemId)) {
        if (select && !this.selectedItemIds.includes(itemId)) {
          this.selectItem(itemId)
        }
        return false
      }
      this.items.unshift(item)
      this.fetch(true)
      if (select) this.selectItem(itemId)
      return true
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
  width: 100%;
  height: 3px;
  background-color: transparent;
  box-shadow: none;
}
</style>

<style>
.highlighted {
  background-color: yellow;
  border-radius: 4px;
}
</style>
