// Based on https://github.com/rael9/token-replacement-ckeditor-plugin

function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function registerDialog (CKEDITOR) {
  CKEDITOR.dialog.add('token', function (editor) {
    const lang = editor.lang.token
    const tokens = editor.config.availableTokens || CKEDITOR.config.availableTokens
    return {
      title: lang.title,
      minWidth: 300,
      minHeight: 60,
      contents: [
        {
          id: 'info',
          label: editor.lang.common.generalTab,
          title: editor.lang.common.generalTab,
          elements: [
            // Dialog window UI elements.
            {
              id: 'name',
              type: 'select',
              style: 'width: 100%;',
              label: lang.name,
              'default': '',
              required: true,
              items: tokens,
              setup: function (widget) {
                this.setValue(widget.data.name)
              },
              commit: function (widget) {
                widget.setData('name', this.getValue())
              }
            }
          ]
        }
      ]
    }
  })
}

export default function registerPlugin (CKEDITOR) {
  CKEDITOR.addCss('.cke_token{background-color:#ff0}')

  registerDialog(CKEDITOR)

  CKEDITOR.plugins.add('token', {
    requires: 'widget,dialog',
    init: function (editor) {
      var lang = editor.lang.token
      var tokenStart = CKEDITOR.config.token.tokenStart
      var tokenEnd = CKEDITOR.config.token.tokenEnd
      if (typeof editor.config.tokenStart !== 'undefined') {
        tokenStart = editor.config.tokenStart
      }
      if (typeof editor.config.tokenEnd !== 'undefined') {
        tokenEnd = editor.config.tokenEnd
      }
      var tokenStartNum = tokenStart.length
      var tokenEndNum = 0 - tokenEnd.length

      // Put ur init code here.
      editor.widgets.add('token', {
        // Widget code.
        dialog: 'token',
        pathName: lang.pathName,
        // We need to have wrapping element, otherwise there are issues in
        // add dialog.
        template: '<span class="cke_token"></span>',

        downcast: function () {
          return new CKEDITOR.htmlParser.text(tokenStart + this.data.name + tokenEnd)
        },

        init: function () {
          // Note that token markup characters are stripped for the name.
          this.setData('name', this.element.getText().slice(tokenStartNum, tokenEndNum))
        },

        data: function () {
          this.element.setText(tokenStart + this.data.name + tokenEnd)
        }
      })

      editor.ui.addButton && editor.ui.addButton('Token', {
        label: lang.toolbar,
        command: 'token',
        toolbar: 'insert',
        icon: require('./icons/token.png'),
        iconHiDpi: require('./icons/hidpi/token.png'),
      })
    },

    afterInit: function (editor) {
      let tokenStart = CKEDITOR.config.token.tokenStart
      if (typeof editor.config.tokenStart !== 'undefined') {
        tokenStart = editor.config.tokenStart
      }
      let tokenEnd = CKEDITOR.config.token.tokenEnd
      if (typeof editor.config.tokenEnd !== 'undefined') {
        tokenEnd = editor.config.tokenEnd
      }
      var tokenStartRegex = escapeRegExp(tokenStart)
      var tokenEndRegex = escapeRegExp(tokenEnd)
      var tokenReplaceRegex = new RegExp(tokenStartRegex + '([^' +
        tokenStartRegex + tokenEndRegex + '])+' + tokenEndRegex, 'g')

      editor.dataProcessor.dataFilter.addRules({
        text: function (text, node) {
          var dtd = node.parent && CKEDITOR.dtd[node.parent.name]

          // Skip the case when token is in elements like <title> or <textarea>
          // but upcast token in custom elements (no DTD).
          if (dtd && !dtd.span) return

          let matchOnly = null
          if (editor.config.availableTokens) {
            matchOnly = editor.config.availableTokens.map(([name, value]) => {
              return tokenStart + value + tokenEnd
            })
          }

          return text.replace(tokenReplaceRegex, function (match) {
            if (matchOnly && matchOnly.indexOf(match) === -1) {
              return match
            }
            // Creating widget code.
            const innerElement = new CKEDITOR.htmlParser.element('span', {
              'class': 'cke_token'
            })

            // Adds token identifier as innertext.
            innerElement.add(new CKEDITOR.htmlParser.text(match))
            const widgetWrapper = editor.widgets.wrapElement(innerElement, 'token')

            // Return outerhtml of widget wrapper so it will be placed
            // as replacement.
            return widgetWrapper.getOuterHtml()
          })
        }
      })
    },
  })

  CKEDITOR.plugins.setLang('token', 'en', {
    title: 'Token Insertion',
    toolbar: 'Token',
    name: 'Token to Insert',
    pathName: 'token'
  })
  CKEDITOR.plugins.setLang('token', 'ru', {
    title: 'Вставить токен',
    toolbar: 'Токен',
    name: 'Токен',
    pathName: 'token'
  })

  CKEDITOR.config.token = {
    tokenStart: '{{',
    tokenEnd: '}}',
    availableTokens: [['', '']],
  }
}

if (window && window.CKEDITOR) registerPlugin(window.CKEDITOR)
