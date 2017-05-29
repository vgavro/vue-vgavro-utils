function removeClass (element, cls) {
  // from http://stackoverflow.com/a/28344281
  var regexp = new RegExp('(\\s|^)' + cls + '(\\s|$)')
  element.className = element.className.replace(regexp,' ')
};

function setErrorHandler (w, errorBoxCls, errorCallback) {
  // TODO: Add backend call for error logging
  w.onerror = function (message, source, lineno, colno, err) {
    if (w.app && w.app.loaded && !w.app.DEBUG) return

    errorCallback && errorCallback(message, source, lineno, colno, err)

    if (source) message += ' at ' + source + ':' + lineno + ':' + colno
    if (err && err.stack) message += ' <br><b>Stack:</b> ' + err.stack;
    (document.body || document.getElementsByTagName('body')[0]).innerHTML =
      '<div class="' + errorBoxCls + '">' +
      '<b>Error:</b> ' + message +
      '<br><b>Useragent:</b> ' + navigator.userAgent +
      '<br><b>Time:</b> ' + new Date() +
      '<br><button onclick="location.reload()">Reload</button>' +
      '</div>'
    w.onerror = null
  };

  w.addEventListener('unhandledrejection', function (ev) {
    var message
    if (ev.reason) {
      message = ev.reason.message
      if (ev.reason.stack) message += '<br><b>Stack:</b> ' + ev.reason.stack
    } else message = 'Unhandled Rejection (unknown reason)'
    w.onerror && w.onerror(message)
  });
};
