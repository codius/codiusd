import { mkdirSync as mkdir } from 'fs'
import { Injector } from 'reduct'
import Config from './Config'
import PodManager from './PodManager'
import PeerFinder from './PeerFinder'
import HttpServer from './HttpServer'
import AdminServer from './AdminServer'
import BackgroundValidatePeers from './BackgroundValidatePeers'
import Secret from './Secret'
import Money from './Money'
import SelfTest from '../../test/SelfTest'

import { create as createLogger } from '../common/log'
const log = createLogger('App')

export default class App {
  private config: Config
  private peerFinder: PeerFinder
  private httpServer: HttpServer
  private adminServer: AdminServer
  private podManager: PodManager
  private secret: Secret
  private money: Money
  private backgroundValidatePeers: BackgroundValidatePeers
  private selfTest: SelfTest
  constructor (deps: Injector) {
    this.config = deps(Config)

    if (!this.config.memdownPersist && !this.config.devMode) this.makeRootDir()

    this.peerFinder = deps(PeerFinder)
    this.httpServer = deps(HttpServer)
    this.adminServer = deps(AdminServer)
    this.podManager = deps(PodManager)
    this.secret = deps(Secret)
    this.money = deps(Money)
    this.backgroundValidatePeers = deps(BackgroundValidatePeers)
    this.selfTest = deps(SelfTest)
  }

  async start () {
    log.info('starting codiusd...')
    if (!this.config.devMode) {
      await this.secret.load()
      await this.money.start()
    }
    await this.httpServer.start()
    if (this.config.adminApi) {
      await this.adminServer.start()
    } 
    this.peerFinder.start()
    this.podManager.start()
    this.backgroundValidatePeers.start()
    setTimeout(() => {
      this.selfTest.start()
    }, 10000)
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
