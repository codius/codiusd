import { mkdirSync as mkdir } from 'fs'
import { Injector } from 'reduct'
import Config from './Config'
import PodManager from './PodManager'
import PeerFinder from './PeerFinder'
import HttpServer from './HttpServer'
import Secret from './Secret'
import Money from './Money'

import { create as createLogger } from '../common/log'
const log = createLogger('App')

export default class App {
  private config: Config
  private peerFinder: PeerFinder
  private httpServer: HttpServer
  private podManager: PodManager
  private secret: Secret
  private money: Money

  constructor (deps: Injector) {
    this.config = deps(Config)

    if (!this.config.memdownPersist) this.makeRootDir()

    this.peerFinder = deps(PeerFinder)
    this.httpServer = deps(HttpServer)
    this.podManager = deps(PodManager)
    this.secret = deps(Secret)
    this.money = deps(Money)
  }

  async start () {
    log.info('starting codiusd...')
    await this.secret.load()
    await this.money.start()
    await this.httpServer.start()
    this.peerFinder.start()
    this.podManager.start()
  }

  private makeRootDir () {
    try {
      mkdir(this.config.codiusRoot, 0o700)
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err
      }
    }
  }
}
