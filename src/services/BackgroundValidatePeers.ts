import { Injector } from 'reduct'
import PeerDatabase from './PeerDatabase'
import axios from 'axios'
import { create as createLogger } from '../common/log'
import { shallowValidatePeer } from '../util/validatePeer'
const log = createLogger('BackgroundValidatePeers')
const hoursInDay = 1000 * 60 * 60 * 24

export default class BackgroundValidatePeers {
  private peerDb: PeerDatabase
  constructor (deps: Injector) {
    this.peerDb = deps(PeerDatabase)
  }

  start () {
    setTimeout(this.randomRunningCheck, hoursInDay)
  }

  private randomRunningCheck () {
    const db = this.peerDb
    const peers = db.getAllPeers()
    peers.forEach(async (peer: string) => {
      if (!shallowValidatePeer(peer)) {
        db.removePeer(peer)
      } else {
        try {
          const peerInfo = await axios.get(peer + '/info')
          if (peer !== peerInfo.data.uri) {
            db.removePeer(peer)
          }
        } catch (err) {
          log.error(err)
        }
      }
    })
    const addOrSubtract = Math.random()
    const changeInTime = Math.random() * 1000 * 60 * 30
    if (addOrSubtract > 0.5) {
      setTimeout(this.randomRunningCheck, hoursInDay + changeInTime)
    } else {
      setTimeout(this.randomRunningCheck, hoursInDay - changeInTime)
    }
  }
}
