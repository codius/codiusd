const url = require('url')
const IGNORE_LIST = ['localhost', '0.0.0.0', 'local.codius.org']

export function shallowValidatePeer (peer?: string): boolean {
  if (!peer) {
    return false
  }

  if (process.env.CODIUS_DEV === 'true') {
    return true
  }

  let hostName = url.parse(peer)
  if (!hostName.hostname) {
    return false
  } else if (hostName.hostname.slice(0,3) === '127' || IGNORE_LIST.includes(hostName.hostname) || hostName.protocol !== 'https:') {
    return false
  }
  return true
}
