import moment from 'moment'

export function formatMoment (value, format, timezone) {
  return moment.utc(value).tz(timezone).format(format)
}

export function fromNow (value, noSuffix = false, offset = null) {
  const time = moment.utc(value)
  offset && time.subtract({ms: offset})
  return time.from(moment.utc(), noSuffix)
}

export function formatEmail (email) {
  // TODO: seems like Vue made complicated filters usage with raw html
  // so remove it from here in future
  const parts = email.split('@')
  return `<b>${parts[0]}</b>@${parts[1]}`
}

export function formatFloat (n) {
  return (n || 0).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')
}

export function formatInt (n) {
  return (n.toString() + '.').replace(/(\d)(?=(\d{3})+\.)/g, '$1,').slice(0, -1)
}

export function formatShortInt (n, decimals) {
  if (n === 0) return 0
  const k = 1000 // or 1024 for binary
  const dm = decimals + 1 || 3
  const sizes = ['', 'K', 'M']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return parseFloat((n / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
