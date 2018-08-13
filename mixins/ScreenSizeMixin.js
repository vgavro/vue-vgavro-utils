const elementBreakpoints = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920,
}

function getScreenSize (breakpoints) {
  const rv = {width: document.body.clientWidth}
  let bWidth = null
  let bp = null

  for (bp of breakpoints) {
    if (rv.width < bp[1]) break
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

export default {
  data: {
    screenSize: null,
  },

  created () {
    let breakpoints = this.$options.screenSizeBreakpoints || elementBreakpoints
    breakpoints = Object.entries(breakpoints).sort((x, y) => x[1] - y[1])
    this.screenSize = getScreenSize(breakpoints)

    let timeout = null
    window.addEventListener('resize', () => {
      timeout && clearTimeout(timeout)
      timeout = setTimeout(() => {
        this.screenSize = getScreenSize(breakpoints)
      }, 100)
    })
  },
}
