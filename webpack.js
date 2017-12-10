// helper functions for CDN configuration
// ----------------
const path = require('path')
const deps = {}

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
  const module = url.split('/', 1)
  const filename = url.substr(module.length)
  return 'https://unpkg.com/' + module + '@' + npmVersion(module) + filename
}

module.exports = {
  resolveUrl: resolveUrl,
}
