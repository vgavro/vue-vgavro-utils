// This file is included in page and mainly serves for app loading routine.
// NO es6 here.

(function () {
  var ERROR_CLS = 'app-error'
  var DEBUG = false

  function escapeTags (str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function formatPythonDebugLine (row) {
    return (row[0] + '<b>:' + row[1] + '</b> in <b>' + row[2] + '</b>\n' +
            '  <i style="color: blue">' + escapeTags(row[3]) + '</i>\n')
  }

  function formatError (err) {
    var message = ''
    if (err.code) message += '<b>' + String(err.code) + ':</b> '
    if (err.code_type) message += '<b>' + err.code_type + ':</b> '
    if (err.name) message += '<b>' + err.name + ':</b> '
    if (err.message) message += escapeTags(err.repr || err.message)
    if (!message) message = escapeTags(String(err))

    var stack = ''
    if (err && Object.prototype.toString.call(err.stack) === '[object Array]') {
      err.stack.forEach(function (row) {
        if (row.length !== 4) return
        stack += formatPythonDebugLine(row)
      })
    } else if (err && err.stack) {
      stack = escapeTags(String(err.stack))
    }

    var traceback = ''
    if (err && Object.prototype.toString.call(err.traceback) === '[object Array]') {
      err.traceback.forEach(function (row) {
        if (row.length !== 4) return
        traceback += formatPythonDebugLine(row)
      })
    } else if (err && err.traceback) traceback = escapeTags(String(err.traceback))

    return (
      '<div class="' + ERROR_CLS + '">' +
      '<pre>' + message + '</pre>' +
      '<pre>' +
      (err.source && ('<b>Source:</b> ' + err.source + '\n') || '') +
      (err.fetch && ('<b>' + err.fetch.options.method.toUpperCase() + ':</b> ' +
                              err.fetch.url + '\n') || '') +
      '<b>UserAgent:</b> ' + navigator.userAgent + '\n' +
      '<b>Time:</b> ' + new Date() + '\n' +
      '</pre>' +
      '<button onclick="location.reload()">RELOAD</button><br>' +
      (DEBUG && err.fetch && err.code !== -1 &&
       ('<button onclick=\'window._utils.backendDebugger(' +
        JSON.stringify(err.fetch) +
        ')\'>BACKEND DEBUG</button><br><br>') || '') +
      (DEBUG && traceback && ('<b>Traceback:</b><pre>' + traceback + '</pre>') || '') +
      (DEBUG && stack && ('<b>Stack:</b><pre>' + stack + '</pre>') || '') +
      '</div>'
    )
  }

  function showError (err) {
    // Display only first error, and never show on loaded app
    if (window.app && window.app.loaded && window.app.showError) {
      window.app.showError(err)
    } else {
      var body = document.body || document.getElementsByTagName('body')[0]
      body.innerHTML = formatError(err)
      body.className = ERROR_CLS
      document.documentElement.className = ERROR_CLS
      window.onerror = null  // show only first error if app is not loaded
    }
  }

  function setErrorHandler (errorCls, debug) {
    if (errorCls) ERROR_CLS = errorCls
    if (debug) DEBUG = debug
    window.onerror = function (message, source, lineno, colno) {
      // TODO: Add backend call for error logging. raven/centry?
      showError({
        message: message,
        source: source + ':' + lineno + ':' + colno
      })
    }
    window.addEventListener('unhandledrejection', function (ev) {
      if (ev.reason) showError(ev.reason)
    })
  }

  function backendDebugger (fetch) {
    var url = fetch.url
    var options = fetch.options

    if (!options.headers) options.headers = new window.Headers()
    if (options.headers.append) options.headers.append('X-Debugger', '1')
    else options.headers['X-Debugger'] = '1'

    window.fetch(url, options).then(function (r) {
      r.text().then(function (text) {
        window.history.pushState({reload: true}, null, window.location.href)
        window.history.pushState({}, null, fetch.url)
        var newDoc = document.open('text/html', 'replace')
        newDoc.write(text)
        newDoc.close()
        window.onpopstate = function (event) {
          if (event && event.state && event.state.reload) {
            window.location.reload()
          }
        }
      })
    })
  }

  window._utils = {
    formatError: formatError,
    showError: showError,
    setErrorHandler: setErrorHandler,
    backendDebugger: backendDebugger,
  }
})()
