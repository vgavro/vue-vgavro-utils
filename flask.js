export function parseFlaskSession (data) {
  // Parse encoded flask session cookie with signature.
  return JSON.parse(window.atob(data.substr(0, data.indexOf('.'))))
}
