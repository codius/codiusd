import { Injector } from 'reduct'
import Config from './Config'
import Identity from './Identity'
import CodiusDB from '../util/Codiusdb'
import { choices } from '../common/random'

import { create as createLogger } from '../common/log'
const log = createLogger('PeerDatabase')

export default class PeerDatabase {
  private config: Config
  private identity: Identity
  private peers: Set<string> = new Set()
  private codiusdb: CodiusDB

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.identity = deps(Identity)
    this.codiusdb = deps(CodiusDB)

    for (let peer of this.config.bootstrapPeers) {
      this.peers.add(peer)
    }

    this.loadPeersFromDB()
  }

  public getPeers (numPeers = 10) {
    return choices(Array.from(this.peers), numPeers)
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
      this.codiusdb.savePeers([...this.peers])
      log.debug('added %s peers, now %s known peers', this.peers.size - previousCount, this.peers.size)
    }
  }

  private async loadPeersFromDB() {
    const peersFromDB = await this.codiusdb.getPeers()
    log.debug(`Loading ${peersFromDB.length} peers from db...`)
    for (let peer of peersFromDB) {
      this.peers.add(peer)
    }
  }
}
