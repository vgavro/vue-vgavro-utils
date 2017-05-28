<template lang="pug">
.modal.fade(role="dialog")
  .modal-dialog(role="document")
    .modal-content
      .modal-header
        button.close(type="button", data-dismiss="modal") &times;
        h4.modal-title {{title}}
      .modal-body
        slot(name="body")
      .modal-footer(v-if="$slots.footer")
        slot(name="footer")
</template>

<script>
import jQuery from 'jquery'

export default {
  props: ['title'],

  mounted () {
    jQuery(this.$el).modal('show')
    jQuery(this.$el).on('hidden.bs.modal', () => {
      if (!this._isDestroyed) {
        this.$root.modalClose(this)
      }
    })
  },

  methods: {
    close () {
      jQuery(this.$el).modal('hide')
    },
  },
}
</script>
