import { Injector } from 'reduct'
import PeerFinder from './PeerFinder'
import HttpServer from './HttpServer'

import { create as createLogger } from '../common/log'
const log = createLogger('App')

export default class App {
  private peerFinder: PeerFinder
  private httpServer: HttpServer

  constructor (deps: Injector) {
    this.peerFinder = deps(PeerFinder)
    this.httpServer = deps(HttpServer)
  }

  async start () {
    log.info('starting codiusd...')
    await this.httpServer.start()
    this.peerFinder.start()
  }
}
