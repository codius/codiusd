import { Injector } from 'reduct'
import Config from './Config'
import Identity from './Identity'
import CodiusDB from '../util/CodiusDB'
import { shallowValidatePeer } from '../util/validatePeer'
import { choices } from '../common/random'

import { create as createLogger } from '../common/log'
const log = createLogger('PeerDatabase')
import axios from 'axios'

export default class PeerDatabase {
  private config: Config
  private identity: Identity
  private peers: Set<string> = new Set()
  private codiusdb: CodiusDB
  private memoryMap: Map<string, number> = new Map()
  constructor (deps: Injector) {
    this.config = deps(Config)
    this.identity = deps(Identity)
    this.codiusdb = deps(CodiusDB)
    for (let peer of this.config.bootstrapPeers) {
      if (peer !== this.config.publicUri && shallowValidatePeer(peer) && process.env.NODE_ENV !== 'test') {
        this.peers.add(peer)
      }
    }

    this.loadPeersFromDB().catch(err => log.error(err))
  }

  public getPeers (numPeers = 1000) {
    return choices(Array.from(this.peers), numPeers)
  }

  public async getFreePeers () {
    const peersFromDB = await this.codiusdb.getPeers()
    const freePeers = peersFromDB.filter(peer => {
      const peerFreeMem = this.memoryMap.get(peer)
      if (peerFreeMem) {
        return peer
      }
    })
    return freePeers
  }
  public async addPeers (peers: string[]) {
    const previousCount = this.peers.size
    for (const peer of peers) {
      if (peer === this.identity.getUri()) {
        continue
      }
      // Check for invalid peer addresses. Validate peer only if not in set.
      if (!this.peers.has(peer) && shallowValidatePeer(peer)) {
        try {
          const peerInfo = await axios.get(peer + '/info')
          if (peer === peerInfo.data.uri) {
            this.memoryMap.set(peer, peerInfo.data.fullMem)
            this.peers.add(peer)
          }
        } catch (e) {
          if (process.env.NODE_ENV !== 'test') {
            log.trace('%s for %s', e, peer + '/info')
          }
        }
      }
    }
    if (this.peers.size > previousCount && process.env.NODE_ENV !== 'test') {
      this.codiusdb.savePeers([...this.peers]).catch(err => log.error(err))
      log.trace('added %s peers, now %s known peers', this.peers.size - previousCount, this.peers.size)
    }
  }
  public removePeer (peer: string) {
    this.peers.delete(peer)
    this.codiusdb.savePeers([...this.peers]).catch(err => log.error(err))
    log.trace('removed peer %s, now %s peers', peer, this.peers.size)
  }

  public getNumPeers () {
    return this.peers.size
  }

  public getAllPeers () {
    return [...this.peers]
  }

  private async loadPeersFromDB () {
    const peersFromDB = await this.codiusdb.getPeers()
    log.debug(`Loading ${peersFromDB.length} peers from db...`)
    for (let peer of peersFromDB) {
      if (shallowValidatePeer(peer)) {
        this.peers.add(peer)
      } else {
        this.removePeer(peer)
      }
    }
  }
}
