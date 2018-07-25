export function isElementInViewport (el) {
  // see https://stackoverflow.com/a/7557433/450103
  var rect = el.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

export function domFromString (html) {
  // TODO: works only with root element
  const div = document.createElement('div')
  div.innerHTML = html
  return div.firstChild
}
