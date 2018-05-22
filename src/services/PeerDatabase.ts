import { Injector } from 'reduct'
import Config from './Config'
import Identity from './Identity'

import { create as createLogger } from '../common/log'
const log = createLogger('PeerDatabase')

export default class PeerDatabase {
  private config: Config
  private identity: Identity
  private peers: Set<string> = new Set()

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.identity = deps(Identity)

    for (let peer of this.config.bootstrapPeers) {
      this.peers.add(peer)
    }
  }

  public getPeers () {
    return Array.from(this.peers).slice(0, 10)
  }

  public addPeers (peers: string[]) {
    const previousCount = this.peers.size
    for (const peer of peers) {
      if (peer === this.identity.getUri()) {
        continue
      }

      this.peers.add(peer)
    }

    if (this.peers.size > previousCount) {
      log.debug('added %s peers, now %s known peers', this.peers.size - previousCount, this.peers.size)
    }
  }
}
