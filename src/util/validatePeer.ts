const url = require('url')
const IGNORE_LIST = ['localhost', '0.0.0.0', 'local.codius.org']

export function validatePeer (peer: string): boolean {
  let hostName = url.parse(peer)
  hostName = hostName.hostname

  if (hostName && hostName.slice(0.3) === '127' || IGNORE_LIST.indexOf(hostName) > -1) {
    return false
  }

  return true
}
