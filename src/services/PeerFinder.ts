import { Injector } from 'reduct'
import SelfTest from './SelfTest'
import PeerDatabase from './PeerDatabase'
import Identity from './Identity'
import { sampleSize } from 'lodash'
import axios from 'axios'
import { create as createLogger } from '../common/log'
const log = createLogger('PeerFinder')

const DEFAULT_INTERVAL = 5000
const PEERS_PER_QUERY = 5

export default class PeerFinder {
  private peerDb: PeerDatabase
  private identity: Identity
  private selfTest: SelfTest

  constructor (deps: Injector) {
    this.peerDb = deps(PeerDatabase)
    this.identity = deps(Identity)
    this.selfTest = deps(SelfTest)
  }

  start () {
    this.run()
      .catch(err => log.error(err))
  }

  async run () {
    if (this.selfTest.selfTestSuccess) {
      log.debug('searching peers')
      const queryPeers = sampleSize(this.peerDb.getPeers(), PEERS_PER_QUERY)
      log.trace('peers', queryPeers)
      for (const peer of queryPeers) {
        try {
          const res = await axios.post(peer + '/peers/discover', {
            peers: [ this.identity.getUri() ]
          })
          log.trace('received %d peers from %s', res.data.peers.length, peer)
          this.peerDb.addPeers(res.data.peers)
            .catch(err => log.debug(err))
        } catch (err) {
          log.debug('%s for %s. Removing...', err, peer)
          this.peerDb.removePeer(peer)
        }
      }
    }
    setTimeout(this.run.bind(this), DEFAULT_INTERVAL)
  }
}
