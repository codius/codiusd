import * as Hapi from 'hapi'
import registerAdminController from '../controllers/admin'
import { Injector } from 'reduct'
import Config from './Config'

import { create as createLogger } from '../common/log'
const log = createLogger('AdminServer')

export default class AdminServer {
  private config: Config
  private server: Hapi.Server

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.server = new Hapi.Server({
      uri: 'http://local.codius.org:' + this.config.adminPort,
      port: this.config.adminPort,
      address: '127.0.0.1'
    })

    registerAdminController(this.server, deps)
  }
  async start () {
    await this.server.start()

    log.info('Admin Server listening at http://%s:%d', this.server.info.address, this.server.info.port)
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
