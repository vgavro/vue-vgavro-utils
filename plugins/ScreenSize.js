export const elementBreakpoints = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920,
}

export function getSize (breakpoints, width, height) {
  const rv = {
    width: width,
    height: height,
  }
  let bWidth = null
  let bp = null

  for (bp of breakpoints) {
    if (width < bp[1]) break
    bWidth = bp[1]
    rv.name = bp[0]
  }
  rv[rv.name + 'Only'] = true // for element ui css class names compability

  for (bp of breakpoints.slice(1, breakpoints.length - 1)) {
    if (bWidth <= bp[1]) {
      rv[bp[0] + 'AndDown'] = true
    }
    if (bWidth >= bp[1]) {
      rv[bp[0] + 'AndUp'] = true
    }
  }
  return rv
}

export function getScreenSize (breakpoints, width, height) {
  return getSize(breakpoints, document.body.clientWidth, document.body.clientHeight)
}

export function install (Vue, {
  breakpoints = elementBreakpoints,
  contentSizeDelta = {width: 0, height: 0},
  debounce = 100,
} = {}) {
  breakpoints = Object.entries(breakpoints).sort((x, y) => x[1] - y[1])

  function getContentSize (screenSize) {
    return getSize(
      breakpoints,
      screenSize.width - (contentSizeDelta.width || 0),
      screenSize.height - (contentSizeDelta.height || 0)
    )
  }

  const store = new Vue({
    data () {
      const screenSize = getScreenSize(breakpoints)
      return {
        screenSize,
        contentSize: getContentSize(screenSize),
      }
    },
  })
  store.$watch('screenSize', (screenSize) => (store.contentSize = getContentSize(screenSize)))

  let timeout = null
  window.addEventListener('resize', () => {
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => {
      store.screenSize = getScreenSize(breakpoints)
    }, debounce)
  })
  // Obviously we get first height before load ended
  setTimeout(() => (store.screenSize = getScreenSize(breakpoints)), 0)

  Vue.prototype._$contentSizeChanged = (delta) => {
    contentSizeDelta = delta
    store.contentSize = getContentSize(store.screenSize)
  }
  Object.defineProperty(Vue.prototype, '$screenSize', {get: () => store.screenSize})
  Object.defineProperty(Vue.prototype, '$contentSize', {get: () => store.contentSize})
}

export default {elementBreakpoints, getSize, getScreenSize, install}
