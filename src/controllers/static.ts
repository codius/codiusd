import * as Hapi from 'hapi'
import { Injector } from 'reduct'

export default function (server: Hapi.Server, deps: Injector) {
  async function getIndex (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return h.file('index.html')
  }

  server.route({
    method: 'GET',
    path: '/{params*}',
    handler: getIndex
  })
}
