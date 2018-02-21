// helper functions for CDN configuration
// ----------------
const path = require('path')
let deps = null

function npmVersion (module) {
  if (!deps) deps = require(process.cwd() + '/package-lock.json').dependencies
  if (!deps[module]) {
    throw new Error(`package-lock.json: "${module}" not found`)
  }
  const match = deps[module].version.match(/(\d+\.?)+(-[\d\w.]+)?$/)
  if (!match) {
    throw new Error('package-lock.json: version parse failed:' +
                    `${module} ${deps[module]}`)
  }
  return match[0]
}

function resolveUrl (url, env) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (env !== 'production') return path.join('/node_modules/', url)
  if (url[0] === '/') url = url.substr(1)
  const module = url.split('/', 1)[0]
  const filename = url.substr(module.length + 1)
  return 'https://unpkg.com/' + module + '@' + npmVersion(module) + '/' + filename
}

module.exports = {
  resolveUrl: resolveUrl,
}
