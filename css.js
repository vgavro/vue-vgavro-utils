export function cssTimeToMilliseconds (timeString) {
  // based on https://gist.github.com/jakebellacera/9261266
  const num = parseFloat(timeString, 10)
  let unit = timeString.match(/m?s/)
  if (unit) unit = unit[0]
  if (unit === 's') return num * 1000
  if (unit === 'ms') return num
  throw new Error(`Unable to parse css time ${timeString} due unknown unit`)
}
