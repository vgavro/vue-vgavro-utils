import Tooltip from 'tooltip.js'

const POPUP_OFFSET = 30
const POPUP_PLACEMENT = 'bottom-end'

export default {
  // This mixin add methods to create/destroy popups
  // Should be used on root element, or inside plugin
  methods: {
    popupOpen (content, { className = 'popup' } = {}) {
      const el = document.createElement('div')
      el.innerHTML = content

      el.onclick = (ev) => {
        el.onclick = null
        // el.remove()
        this.popupClose(popup)
      }

      const popup = new Tooltip(document.body, {
        html: true,
        placement: POPUP_PLACEMENT,
        title: el,
        trigger: 'manual',
        boundariesElement: 'viewport',
        template: ('<div class="' + className + '" role="tooltip"><div class="tooltip-arrow">' +
                   '</div><div class="tooltip-inner"></div></div>'),
      })
      popup.show()

      // NOTE: pass this modifier to popperOptions after this PR
      // https://github.com/FezVrasta/popper.js/pull/316
      // (should be in tooltip.js 1.1.5 release)
      // see https://www.npmjs.com/package/tooltip.js
      popup.popperInstance.modifiers.push({
        name: 'offset',
        enabled: true,
        order: 801,  // after offset(800), before computeStyle(850)
        fn: (data) => {
          const index = this.popups.indexOf(popup)
          data.offsets.popper.top += index * POPUP_OFFSET
          return data
        },
      })
      popup.popperInstance.modifiers.sort((x, y) => x.order - y.order)

      if (this.popups) this.popups.push(popup)
      else this.popups = [popup]
      return popup
    },

    popupClose (popup) {
      popup.dispose()
      const index = this.popups.indexOf(popup)
      if (index > -1) this.popups.splice(index, 1)
      this.popups.forEach((p) => p.popperInstance.update())
    },

    popupCloseAll () {
      this.popups.forEach(this.popupClose)
    },

    popupError (message, { source, stack, traceback, fetch } = {}) {
      let content = `<b>Error:</b><pre>${message}</pre>`
      content += '<pre>'
      if (fetch) content += `<b>${fetch.options.method.toUpperCase()}</b> ${fetch.url}\n`
      if (source) content += `<b>Source:</b> ${source}\n`
      if (!fetch) content += `<b>UserAgent:</b> ${navigator.userAgent}\n`
      content += '<b>Time:</b> ' + new Date() + '\n'
      content += '</pre>'
      content += '<button onclick="location.reload()">RELOAD</button><br>'
      if (fetch && fetch.flaskDebugURL) {
        content += ('<button onclick=\'window.open("' + fetch.flaskDebugURL +
                    '")\'>FLASK DEBUG</button><br>')
      }
      if (traceback) content += `<b>Traceback:</b><pre>${traceback}</pre>`
      // if (stack) content += `<b>Stack:</b><pre>${stack}</pre>`
      this.popupOpen(content, {className: 'popup-error'})
    }
  },
}