import * as Hapi from 'hapi'
import registerVersionController from '../controllers/version'
import registerPeersController from '../controllers/peers'
import registerPodsController from '../controllers/pods'
import { Injector } from 'reduct'
import Config from './Config'

import { create as createLogger } from '../common/log'
const log = createLogger('HttpServer')

export default class HttpServer {
  private config: Config
  private server: Hapi.Server

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.server = new Hapi.Server({
      uri: this.config.publicUri,
      address: '0.0.0.0',
      port: this.config.port
    })

    registerVersionController(this.server, deps)
    registerPeersController(this.server, deps)
    registerPodsController(this.server, deps)
  }

  async start () {
    await this.server.start()

    log.info('listening at %s', this.server.info.uri)
  }

  getUrl () {
    return this.server.info.uri
  }
}
