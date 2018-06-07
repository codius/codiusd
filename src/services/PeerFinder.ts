import { Injector } from 'reduct'
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

  constructor (deps: Injector) {
    this.peerDb = deps(PeerDatabase)
    this.identity = deps(Identity)
  }

  start () {
    this.run()
      .catch(err => log.error(err))
  }

  async run () {
    log.debug('searching peers')
    const queryPeers = sampleSize(this.peerDb.getPeers(), PEERS_PER_QUERY)
    log.debug('peers', queryPeers)
    for (const peer of queryPeers) {
      try {
        const res = await axios.post(peer + '/peers/discover', {
          peers: [ this.identity.getUri() ]
        })
        this.peerDb.addPeers(res.data.peers)
          .catch(err => log.error(err))
      } catch (err) {
        // TODO: Should we remove the peer from the DB if the peers/discover fails.
        log.error(err)
      }
    }
    setTimeout(this.run.bind(this), DEFAULT_INTERVAL)
  }
}
