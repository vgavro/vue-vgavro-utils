// Based on https://github.com/braune-digital/ckeditor-emojione
import emojione from 'emojione'

const css = `
.emojione {
  /* Emoji Sizing */
  font-size: inherit;
  height: 20px !important;
  width: 20px !important;

  /* Inline alignment adjust the margins  */
  display: inline-block;
  margin: -.2ex .15em .2ex;
  line-height: normal;
  vertical-align: middle;
}

img.emojione {
  /* prevent img stretch */
  width: auto;
}
`

function registerDialog (CKEDITOR) {
  CKEDITOR.dialog.add('emojioneDialog', function(editor) {
    var columns = 10;
    var dialog;
    var onClick = function( ev ) {
      var target = ev.data.getTarget();
      var unicode = target.getAttribute('alt');
      if (unicode) {
        console.log(unicode)
        editor.insertText(unicode);
        dialog.hide();
      }
      ev.data.preventDefault();
    }

    var onKeydown = CKEDITOR.tools.addFunction( function( ev, element ) {
      ev = new CKEDITOR.dom.event( ev );
      element = new CKEDITOR.dom.element( element );
      var relative, nodeToMove;

      var keystroke = ev.getKeystroke(),
        rtl = editor.lang.dir == 'rtl';
      switch ( keystroke ) {
        // UP-ARROW
        case 38:
          // relative is TR
          if ( ( relative = element.getParent().getParent().getPrevious() ) ) {
            nodeToMove = relative.getChild( [ element.getParent().getIndex(), 0 ] );
            nodeToMove.focus();
          }
          ev.preventDefault();
          break;
        // DOWN-ARROW
        case 40:
          // relative is TR
          if ( ( relative = element.getParent().getParent().getNext() ) ) {
            nodeToMove = relative.getChild( [ element.getParent().getIndex(), 0 ] );
            if ( nodeToMove )
              nodeToMove.focus();
          }
          ev.preventDefault();
          break;
        // ENTER
        // SPACE
        case 32:
          onClick( { data: ev } );
          ev.preventDefault();
          break;

        // RIGHT-ARROW
        case rtl ? 37 : 39:
          // relative is TD
          if ( ( relative = element.getParent().getNext() ) ) {
            nodeToMove = relative.getChild( 0 );
            nodeToMove.focus();
            ev.preventDefault(true);
          }
          // relative is TR
          else if ( ( relative = element.getParent().getParent().getNext() ) ) {
            nodeToMove = relative.getChild( [ 0, 0 ] );
            if ( nodeToMove )
              nodeToMove.focus();
            ev.preventDefault(true);
          }
          break;

        // LEFT-ARROW
        case rtl ? 39 : 37:
          // relative is TD
          if ( ( relative = element.getParent().getPrevious() ) ) {
            nodeToMove = relative.getChild( 0 );
            nodeToMove.focus();
            ev.preventDefault(true);
          }
          // relative is TR
          else if ( ( relative = element.getParent().getParent().getPrevious() ) ) {
            nodeToMove = relative.getLast().getChild( 0 );
            nodeToMove.focus();
            ev.preventDefault(true);
          }
          break;
        default:
          // Do not stop not handled events.
          return;
      }
    })

    var buildHtml = function (group) {
      var labelId = CKEDITOR.tools.getNextId() + '_smiley_emtions_label';
      var html = [
        '<div style="max-height:300px;overflow-y:scroll;">' +
        '<span id="' + labelId + '" class="cke_voice_label">Test</span>',
        '<table role="listbox" aria-labelledby="' + labelId + '" style="width:100%;height:100%;border-collapse:separate;" cellspacing="2" cellpadding="2"',
        CKEDITOR.env.ie && CKEDITOR.env.quirks ? ' style="position:absolute;"' : '',
        '><tbody>'
      ]

      var list = {}
      Object.entries(emojione.emojioneList).forEach(([code, obj]) => {
        if (editor.config.emojione.emojis[group].indexOf(code) !== -1) list[code] = obj
      })

      let i = 0
      for (var code in list) {
        if (i % columns === 0) html.push('<tr role="presentation">')
        var obj = list[code]
        html.push(
          '<td class="cke_centered" style="vertical-align: middle;" role="presentation">' +
          '<a style="font-size: 25px;" data-unicode="' + obj.uc_output + '" data-shortcode="' + code + '" href="javascript:void(0)" role="option"', ' aria-posinset="' + ( i + 1 ) + '"', ' aria-setsize=""', ' aria-labelledby=""',
          ' class="cke_hand" tabindex="-1" onkeydown="CKEDITOR.tools.callFunction( ', onKeydown, ', event, this );">',
          emojione.shortnameToImage(code) +
          '</a>', '</td>'
        )
        if (i % columns == columns - 1) html.push( '</tr>' )
        i++
      }

      if (i < columns - 1) {
        for (; i < columns - 1; i++) html.push('<td></td>')
        html.push('</tr>')
      }

      html.push('</tbody></table></div>')
      return html.join('')
    }

    function emojis (group) {
      return {
        type: 'html',
        id: 'emojiSelector',
        html: buildHtml(group),
        onLoad: function( event ) {
          dialog = event.sender;
        },
        focus: function () {
          var self = this;
          setTimeout( function() {
            var firstSmile = self.getElement().getElementsByTag('a').getItem(0)
            firstSmile.focus()
          }, 0)
        },
        onClick: onClick,
        style: 'width: 100%; border-collapse: separate;'
      }
    }

    return {
      title: 'Emojis',
      minWidth: 550,
      minHeight: 200,
      contents: [
        {
          id: 'tab-people',
          label: editor.config.emojione.tabs.people,
          elements: [
            emojis('people')
          ]
        }, {
          id: 'tab-nature',
          label: editor.config.emojione.tabs.nature,
          elements: [
            emojis('nature')
          ]
        }, {
          id: 'tab-objects',
          label: editor.config.emojione.tabs.objects,
          elements: [
            emojis('objects')
          ]
        }, {
          id: 'tab-places',
          label: editor.config.emojione.tabs.places,
          elements: [
            emojis('places')
          ]
        }, {
          id: 'tab-symbols',
          label: editor.config.emojione.tabs.symbols,
          elements: [
            emojis('symbols')
          ]
        }
      ],
      // onShow: function () {},
    };
  });
}

export default function registerPlugin (CKEDITOR) {
  CKEDITOR.addCss(css)
  registerDialog(CKEDITOR)

  CKEDITOR.plugins.add('emojione', {
    requires: 'dialog',
    init: function (editor) {
      editor.addCommand('emojione', new CKEDITOR.dialogCommand('emojioneDialog'))
      editor.ui.addButton('Emojione', {
        label: 'Insert emoji',
        command: 'emojione',
        toolbar: 'insert',
        icon: require('./icons/emojione.png'),
      })
    },

    afterInit: function (editor) {
      editor.dataProcessor.dataFilter.addRules({
        text: function(text, node) {
          var dtd = node.parent && CKEDITOR.dtd[node.parent.name]
          // Skip the case when token is in elements like <title> or <textarea>
          // but upcast token in custom elements (no DTD).
          if (dtd && !dtd.span)
            return

          return text.replace(emojione.regUnicode, function(match) {
            const html = emojione.unicodeToImage(match)
            return html
            const wrapper = editor.widgets.wrapElement(html, 'emojione')
            return wrapper.getOuterHtml()

            // Creating widget code.
            var widgetWrapper = null,
              innerElement = new CKEDITOR.htmlParser.element('span', {
                'class': 'cke_token'
              });

            // Adds token identifier as innertext.
            innerElement.add( new CKEDITOR.htmlParser.text( match ) );
            widgetWrapper = editor.widgets.wrapElement(innerElement, 'token');

            // Return outerhtml of widget wrapper so it will be placed
            // as replacement.
            return widgetWrapper.getOuterHtml();
          })
        }
      })
    },
  })

  CKEDITOR.config.emojione = require('./config.js').default
}

if (window && window.CKEDITOR) registerPlugin(window.CKEDITOR)
