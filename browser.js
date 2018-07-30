import { intersection } from './utils'

export function geolocationPromise (defaultLatLng = null) {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        console.debug('Geolocation resolved', position)
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      }, () => {
        console.debug('Geolocation rejected')
        if (defaultLatLng) resolve(defaultLatLng)
        else reject(new Error('Geolocation rejected'))
      })
    } else {
      console.debug('Geolocation not supported')
      if (defaultLatLng) resolve(defaultLatLng)
      else reject(new Error('Geolocation rejected'))
    }
  })
}

export function getNavigatorLanguages () {
  // eslint-disable-next-line
  // https://github.com/i18next/i18next-browser-languageDetector/blob/master/src/browserLookups/navigator.js
  if (typeof navigator !== 'undefined') {
    if (navigator.languages) return navigator.languages
    if (navigator.userLanguage) return [navigator.userLanguage]
    if (navigator.language) return [navigator.language]
  }
  return []
}

export function guessLanguage (availableLanguages, acceptLanguages = []) {
  let languages = intersection(
    acceptLanguages.map((v) => v.split('-')[0].split('_')[0]),
    availableLanguages
  )
  if (languages.length) return languages[0]

  languages = intersection(
    getNavigatorLanguages().map((v) => v.split('-')[0].split('_')[0]),
    availableLanguages
  )
  if (languages.length) return languages[0]
}
