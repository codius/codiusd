import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import Version from '../services/Version'

export default function (server: Hapi.Server, deps: Injector) {
  const ver = deps(Version)

  async function getVersion (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      name: ver.getVersion(),
      version: ver.getImplementationName()
    }
  }

  server.route({
    method: 'GET',
    path: '/version',
    handler: getVersion
  })
}
