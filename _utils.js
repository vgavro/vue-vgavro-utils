function removeClass (element, cls) {
  // from http://stackoverflow.com/a/28344281
  var regexp = new RegExp('(\\s|^)' + cls + '(\\s|$)')
  element.className = element.className.replace(regexp,' ')
};

function setAppErrorHandler (w, errorBoxCls, errorCallback) {
  w.onerror = function (message, source, lineno, colno, err) {
    // TODO: Add backend call for error logging

    function escapeTags (str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
    }

    function formatPythonDebugLine (row) {
      return (row[0] + '<b>:' + row[1] + '</b> in <b>' + row[2] + '</b>\n' +
              '  <i style="color: blue">' + escapeTags(row[3]) + '</i>\n')
    }

    if (!message && err) {
      // assuming it's api/app error
      message = ''
      if (err.code) message += '<b>' + String(err.code) + ':</b> '
      if (err.code_type) message += '<b>' + err.code_type + ':</b> '
      if (err.name) message += '<b>' + err.name + ':</b> '
      if (err.message) message += escapeTags(err.repr || err.message)
      if (!message) message = escapeTags(String(err))
    } else message = escapeTags(message)

    if (source) source = source + ':' + lineno + ':' + colno

    var stack = ''
    if (err && Object.prototype.toString.call(err.stack) == '[object Array]') {
      err.stack.forEach(function (row) {
        if (row.length != 4) return
        stack += formatPythonDebugLine(row)
      })
    } else if (err && err.stack) {
        stack = escapeTags(String(err.stack))
    }

    var traceback = ''
    if (err && Object.prototype.toString.call(err.traceback) == '[object Array]') {
      err.traceback.forEach(function (row) {
        if (row.length != 4) return
        traceback += formatPythonDebugLine(row)
      })
    } else if (err && err.traceback) traceback = escapeTags(String(err.traceback))

    var fetch_ = err.fetch || null

    if (errorCallback &&
        errorCallback(message, {source: source, fetch: fetch_,
                                stack: stack, traceback: traceback})) {
      return
    }

    // Display only first error, and never show on loaded app
    if (w.appLoadError || (w.app && w.app.loaded && !w.app.DEBUG)) return

    (document.body || document.getElementsByTagName('body')[0]).innerHTML =
      '<div class="' + errorBoxCls + '">' +
      '<b>Error:</b><pre>' + message + '</pre>' +
      '<pre>' +
      (source && ('<b>Source:</b> ' + source + '\n') || '') +
      (fetch_ && ('<b>' + fetch_.options.method.toUpperCase() + ':</b> ' +
                              fetch_.url + '\n') || '') +
      '<b>UserAgent:</b> ' + navigator.userAgent + '\n' +
      '<b>Time:</b> ' + new Date() + '\n' +
      '</pre>' +
      '<button onclick="location.reload()">RELOAD</button><br>' +
      (fetch_ && fetch_.flaskDebugURL &&
       ('<button onclick=\'window.open("' + fetch_.flaskDebugURL +
        '")\'>FLASK DEBUG</button><br>') || '') +
      '<hr/>' +
      (traceback && ('<b>Traceback:</b><pre>' + traceback + '</pre>') || '') +
      (stack && ('<b>Stack:</b><pre>' + stack + '</pre>') || '') +
      '</div>'
    w.appLoadError = true
  };

  w.addEventListener('unhandledrejection', function (ev) {
    if (ev.reason) {
      return w.onerror && w.onerror(null, null, null, null, ev.reason)
    }
    // w.onerror && w.onerror('Unhandled Rejection (unknown reason)')
  });
};
