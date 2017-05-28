<template lang="pug">
div
  component(v-for="(modal, index) in modals", :is="modal.component",
            v-bind="modal.props", ref="components", :key="modal")
</template>

<script>
import Vue from 'vue'

export default {
  data () {
    return {
      modals: [],
    }
  },

  props: {
    modalsRegistry: {
      type: Object,
      required: false,
      default: () => Vue.options.components,
    },
  },

  methods: {
    modalOpen (name, props) {
      this.modals.push({
        component: this.modalsRegistry[name],
        name,
        props,
      })
    },

    modalClose (ident = null) {
      // ident may be component itself, name or index
      let index
      if (ident === null) index = this.modals.length - 1
      else if (ident instanceof Vue) {
        index = this.$refs.components.findIndex(component => {
          return component.$children.includes(ident) || component === ident
        })
        if (index === -1) throw new Error(`No modal component "${ident}" found`)
      } else if (isNaN(ident)) {
        index = this.modals.findIndex(modal => modal.name === ident)
        if (index === -1) throw new Error(`No modal name "${ident}" found`)
      } else index = parseInt(ident)

      this.modals.splice(index, 1)
    },
  },
}
</script>
