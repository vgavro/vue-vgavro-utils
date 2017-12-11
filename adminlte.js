import jQuery from 'jquery'

export function bindBootstrapModalFixes () {
  // fixes related to several active modals on page
  // see http://stackoverflow.com/a/24914782/450103
  // for events see http://getbootstrap.com/javascript/#modals-events

  // Backdrop z-index fix
  jQuery(document).on('show.bs.modal', '.modal', () => {
    const zIndex = 1040 + (10 * jQuery('.modal:visible').length)
    jQuery(this).css('z-index', zIndex)
    setTimeout(() => {
      jQuery('.modal-backdrop')
        .not('.modal-stack')
        .css('z-index', zIndex - 1)
        .addClass('modal-stack')
    }, 0)
  })

  // Scrollbar fix
  jQuery(document).on('hidden.bs.modal', '.modal', () => {
    if (jQuery('.modal:visible').length) {
      jQuery(document.body).addClass('modal-open')
    }
  })
}

export function bindAdminLTELayoutFixes (timeout = 300) {
  // TODO: not working with new AdminLTE 2.4, but maybe bug is already gone?
  // this should be invoked in Base.mounted
  // function fix () {
  //   // for some reason adminlte is included, but may not be initialized yet...
  //   // TODO: maybe there is some event on AdminLTE initialized?
  //   if (jQuery.AdminLTE.layout) {
  //     jQuery.AdminLTE.layout.fix()
  //     jQuery.AdminLTE.layout.fixSidebar()
  //   }
  // }
  // fix()
  // setTimeout(fix, 300)
  // window.addEventListener('resize', () => setTimeout(fix, 300), true)
}
