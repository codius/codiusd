import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { create as createLogger } from '../common/log'
import Config from '../services/Config'
import SelfTest from '../services/SelfTest'
import { Injector } from 'reduct'
const log = createLogger('SelfTestChecker')

export default class SelfTestChecker {
  public checkSelfTestPlugin = {
    name: 'Self Test Checker',
    version: '1.0.0',
    register: async (server: Hapi.Server, options: any) => {
      server.ext('onPreAuth', (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
        const selfTest = this.selfTest
        const config = this.config

        if (!selfTest) {
          log.error('self test stats missing from plugin context')
          throw Boom.badImplementation('self test stats missing from plugin context')
        }

        if (!request.headers['authorization']) {
          throw Boom.badRequest('Authorization header missing from request')
        }

        const token = request.headers['authorization'].split(' ')[1]

        if (token === config.bearerToken) {
          log.debug('Route authenticated using bearer token')
          return h.continue
        }

        const stats = selfTest.getTestStats()
        if (!stats.selfTestSuccess) {
          return h.response({
            message: stats.running ? 'Self Test Running' : 'Self Test Failed',
            status: stats.selfTestSuccess,
            stats: stats
          }).code(503).takeover()
        }

        return h.continue
      })
    }
  }

  private config: Config
  private selfTest: SelfTest

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.selfTest = deps(SelfTest)
  }
}
