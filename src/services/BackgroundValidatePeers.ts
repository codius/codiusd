import { Injector } from 'reduct'
import PeerDatabase from './PeerDatabase'
import Config from './Config'
import axios from 'axios'
import { create as createLogger } from '../common/log'
import { shallowValidatePeer } from '../util/validatePeer'
const log = createLogger('BackgroundValidatePeers')
const CronJob = require('cron').CronJob

export default class BackgroundValidatePeers {
  private peerDb: PeerDatabase
  private config: Config
  constructor (deps: Injector) {
    this.peerDb = deps(PeerDatabase)
    this.config = deps(Config)
  }

  start () {
    const db = this.peerDb
    const config = this.config
    const job = new CronJob({
      cronTime: '00 30 2 * * *',
      onTick: function () {
        /*
        * Runs every day at 2:30:00 AM.
        */
        log.debug('Validating Peers...')
        const peers = db.getAllPeers()
        peers.forEach(async (peer: string) => {
          try {
            const peerInfo = await axios.get(peer + '/host-info')
            if (peer !== peerInfo.data.uri || !shallowValidatePeer(peer)) {
              db.removePeer(peer)
            }
          } catch (err) {
            db.removePeer(peer)
            log.error(err)
          }
        })
      },
      start: false,
      timeZone: config.timeZone
    })
    job.start()
  }
}
