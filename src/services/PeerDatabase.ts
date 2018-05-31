import { Injector } from 'reduct'
import Config from './Config'
import Identity from './Identity'
import { create as createLogger } from '../common/log'
const log = createLogger('PeerDatabase')
import axios from 'axios'

const MAX_MEMORY_FRACTION = 0.75
export default class PeerDatabase {
  private config: Config
  private identity: Identity
  private peers: Set<string> = new Set()
  private memoryMap: Map<string, number> = new Map()
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

  public checkFullMem(freeMem: number, totalMem: number) {
    return (freeMem/totalMem) > MAX_MEMORY_FRACTION
  }

  public async addPeers (peers: string[]) {
    const previousCount = this.peers.size
    const memoryMap = {}
    for (const peer of peers) {
      if (peer === this.identity.getUri()) {
        continue
      }
      const memory = await axios.get(peer + '/memory')
      log.info('memory usage', memory.data)
      this.memoryMap.set(peer, memory.data.freeMem/memory.data.totalMem)

      this.peers.add(peer)
    }
    log.info('memoryMap', this.memoryMap)
    if (this.peers.size > previousCount) {
      log.debug('added %s peers, now %s known peers', this.peers.size - previousCount, this.peers.size)
    }
  }
}
