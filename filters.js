import moment from 'moment'
import store from 'src/store'

export function formatMoment (value, format) {
  return moment.utc(value).tz(store.state.timezone).format(format)
}

export function fromNow (value, noSuffix = false) {
  const time = moment.utc(value)
  time.subtract({ms: store.state.time.offset})
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
