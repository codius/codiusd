import { Injector } from 'reduct'
import Config from './Config'
import Identity from './Identity'
import CodiusDB from '../util/CodiusDB'
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
      if (peer !== this.config.publicUri) {
        this.peers.add(peer)
      }
    }

    this.loadPeersFromDB().catch(err => log.error(err))
  }

  public getPeers (numPeers = 10) {
    return choices(Array.from(this.peers), numPeers)
  }

  public async addPeers (peers: string[]) {
    const previousCount = this.peers.size
    for (const peer of peers) {
      if (peer === this.identity.getUri()) {
        continue
      }
           
      try {
        const validate = await axios.get(peer + '/validate-peer')
        log.debug('validating', validate.data)
        if (validate.data) {
          const memory = await axios.get(peer + '/memory')
          this.memoryMap.set(peer, memory.data.freeMem)

          this.peers.add(peer)
        }
      }
      catch (e) {
        log.error('e', e)
      }

    }
    if (this.peers.size > previousCount) {
      this.codiusdb.savePeers([...this.peers]).catch(err => log.error(err))
      log.debug('added %s peers, now %s known peers', this.peers.size - previousCount, this.peers.size)
    }
  }

  private async loadPeersFromDB () {
    const peersFromDB = await this.codiusdb.getPeers()
    log.debug(`Loading ${peersFromDB.length} peers from db...`)
    for (let peer of peersFromDB) {
      this.peers.add(peer)
    }
  }
}
