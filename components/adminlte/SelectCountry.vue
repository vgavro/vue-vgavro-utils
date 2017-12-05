<template lang="pug">
select2(
  :value="value"
  @input="val => $emit('input', val)"
  :placeholder="placeholder"
  :multiple="multiple"
  :data="items"
)
  template(slot="item" scope="item")
    span
      div.flag-box(v-if="item.iso2")
        div.iti-flag(:class="item.iso2.toLowerCase()")
      | {{ item.name }}

  template(slot="item-selected" scope="item")
    span
      div.flag-box(v-if="item.iso2")
        div.iti-flag(:class="item.iso2.toLowerCase()")
      | {{ multiple ? item.iso2.toUpperCase() : item.name }}
</template>

<script>
import jQuery from 'jquery'

export default {
  // countries - list of iso-2 codes ['UA', 'RU'] or null (all countries if null)
  props: ['value', 'countries', 'placeholder', 'multiple'],

  computed: {
    items () {
      return jQuery.fn.intlTelInput.getCountryData().filter((country) => {
        country.id = country.iso2.toUpperCase()
        country.text = country.name
        return (!this.countries || this.countries.includes(country.iso2.toUpperCase()))
      })
    },
  },
}
</script>

<style>
.flag-box {
  margin-right: 6px;
  margin-top: -1px;
  vertical-align: middle;
  display: inline-block;
  width: 20px;
}
</style>
