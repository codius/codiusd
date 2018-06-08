const url = require('url')
const IGNORE_LIST = ['localhost', '0.0.0.0', 'local.codius.org']

export function shallowValidatePeer (peer: string | undefined): boolean {
  let hostName = url.parse(peer)
  hostName = hostName ? hostName.hostname : null
  if (!hostName) {
    return false
  } else if (hostName.slice(0,3) === '127' || IGNORE_LIST.indexOf(hostName) > -1 || (peer && peer.indexOf('https') === -1)) {
    return false
  }
  return true
}
