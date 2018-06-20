import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import PeerDatabase from '../services/PeerDatabase'
import Version from '../services/Version'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const ver = deps(Version)

  async function getPeers (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    let n
    const params = request.query
    if (typeof params !== 'string' && params.n) {
      n = Number(params.n)
      if (isNaN(n)) {
        throw Boom.badRequest('Invalid n')
      }
    }
    return { peers: peerDb.getPeers(n) }
  }

  async function postPeers (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    peerDb.addPeers(request.payload['peers'])
    return {
      name: ver.getImplementationName(),
      version: ver.getVersion(),
      peers: peerDb.getPeers()
    }
  }

  server.route({
    method: 'GET',
    path: '/peers',
    handler: getPeers
  })

  server.route({
    method: 'POST',
    path: '/peers/discover',
    handler: postPeers,
    options: {
      payload: {
        allow: 'application/json',
        output: 'data'
      }
    }
  })
}
