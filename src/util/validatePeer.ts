const url = require('url')
const IGNORE_LIST = ['localhost', '0.0.0.0', 'local.codius.org']

export function shallowValidatePeer (peer?: string): boolean {
  if (!peer) {
    return false
  }
  let hostName = url.parse(peer)
  if (!hostName) {
    return false
  } else if (hostName.hostname.slice(0,3) === '127' || IGNORE_LIST.includes(hostName.hostname) || (peer && !peer.includes('https'))) {
    return false
  }
  return true
}
