import * as Hapi from 'hapi'
import registerVersionController from '../controllers/version'
import registerPeersController from '../controllers/peers'
import registerPodsController from '../controllers/pods'
import registerProxyController from '../controllers/proxy'
import registerInfoController from '../controllers/info'
import { Injector } from 'reduct'
import Config from './Config'
const { HapiCog } = require('@sharafian/cog')

import { create as createLogger } from '../common/log'
const log = createLogger('HttpServer')

export default class HttpServer {
  private config: Config
  private server: Hapi.Server

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.server = new Hapi.Server({
      uri: this.config.publicUri.replace(/\/+$/, ''),
      address: this.config.bindIp,
      port: this.config.port
    })

    registerVersionController(this.server, deps)
    registerPeersController(this.server, deps)
    registerPodsController(this.server, deps)
    registerProxyController(this.server, deps)
    registerInfoController(this.server, deps)
  }

  async start () {
    await this.server.register({ plugin: require('h2o2') })
    if (!this.config.devMode) {
      await this.server.register(HapiCog)
    }
    await this.server.start()

    log.info('listening at %s', this.server.info.uri)
  }

  getUrl () {
    return this.server.info.uri
  }

  getServer () {
    if (process.env.NODE_ENV === 'test') {
      return this.server
    }
    return null
  }
}
