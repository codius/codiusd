import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import PeerDatabase from '../services/PeerDatabase'
import Version from '../services/Version'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const ver = deps(Version)

  async function getPeers (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      peers: peerDb.getPeers()
    }
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
