import { mkdirSync as mkdir } from 'fs'
import { Injector } from 'reduct'
import Config from './Config'
import PodManager from './PodManager'
import PeerFinder from './PeerFinder'
import HttpServer from './HttpServer'

import { create as createLogger } from '../common/log'
const log = createLogger('App')

export default class App {
  private config: Config
  private peerFinder: PeerFinder
  private httpServer: HttpServer
  private podManager: PodManager

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.peerFinder = deps(PeerFinder)
    this.httpServer = deps(HttpServer)
    this.podManager = deps(PodManager)

    // Create root directory if it doesn't exist
    try {
      if (!this.config.memdownPersist) {
        mkdir(this.config.codiusRoot, 0o755)
      }
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err
      }
    }
  }

  async start () {
    log.info('starting codiusd...')
    await this.httpServer.start()
    this.peerFinder.start()
    this.podManager.start()
  }
}
