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
    log.debug('bootstrapPeers', this.config.bootstrapPeers, this.config.publicUri)
    if (this.config.bootstrapPeers.indexOf(this.config.publicUri) === -1) {
      for (let peer of this.config.bootstrapPeers) {
        log.debug('adding default configs', peer)
        this.peers.add(peer)
      }
    }
  }

  public getPeers () {
    // Get peers which are full depending on memory usage.get
    return Array.from(this.peers).slice(0, 10)
  }

  public async addPeers (peers: string[]) {
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
