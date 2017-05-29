const request = require('sync-request')

// helper functions for CDN configuration
// ----------------
const deps = require(process.cwd() + '/package.json').dependencies

function npmVersion (npmPackage) {
  if (!deps[npmPackage]) {
    throw new Error(`[CDN injector] package.json: "${npmPackage}" not found`)
  }
  const match = deps[npmPackage].match(/(\d+\.?)+(-[\d\w.]+)?$/)
  if (!match) {
    throw new Error('[CDN injector] version parse failed:' +
                    `${npmPackage} ${deps[npmPackage]}`)
  }
  return match[0]
}

function cdnjsUrl (npmPackage, cdnjsPackage, filename) {
  // NOTE: we're injecting urls by version fixed in package.json
  // so it's recommended to use =VERSION declaration instead of ^VERSION
  return 'https://cdnjs.cloudflare.com/ajax/libs/' +
    (cdnjsPackage || npmPackage) + '/' +
    npmVersion(npmPackage) + '/' + filename
}

function checkUrls (urls) {
  // checking urls for sane

  urls.forEach((url) => {
    if (!(url.match(/\.css(\?|$)/) || url.match(/\.js(\?|$)/))) {
      throw new Error('Not implemented injecting extension: ' + url)
    }

    if (!url.search('://') && !url.startswith('//')) {
      // assuming filesystem, so skip
      return
    }

    if (url.search('//cdn.polyfill.io/') !== -1) {
      // requires user agent, and not versioned url anyway
      return
    }

    // assuming if url served by http it would be served by https
    url = url.startsWith('//') && ('http:' + url) || url
    // TODO: I guess since webpack v2 we don't need to use request-sync
    // and we can work with Promise
    const response = request('GET', url)
    if (response.statusCode === 200) {
      console.log('[CDN check] ok ' + url)
    } else {
      throw new Error('[CDN check] failed ' + url + ' response ' +
                      response.statusCode + ' body ' + response.body.toString())
    }
  })
}

module.exports = {
  cdnjsUrl: cdnjsUrl,
  checkUrls: checkUrls,
}
