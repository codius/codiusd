import * as Hapi from 'hapi'
import { Injector } from 'reduct'

export default function (server: Hapi.Server, deps: Injector) {
  async function getAdminInfo (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      test: 'This shows that you are running the Codiusd Admin API.'
    }
  }

  server.route({
    method: 'GET',
    path: '/{params*}',
    handler: getAdminInfo
  })
}