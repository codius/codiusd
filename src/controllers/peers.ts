import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import PodManager from '../services/PodManager'
import PeerDatabase from '../services/PeerDatabase'
import Version from '../services/Version'
import * as os from 'os'
import Config from '../services/Config'
import * as url from 'url'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const ver = deps(Version)
  const podManager = deps(PodManager)
  const config = deps(Config)

  async function getPeers (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      peers: peerDb.getPeers()
    }
  }

  async function getMemory (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      freeMem: (os.totalmem() * config.maxMemoryFraction) - podManager.getMemoryUsed()
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

  async function validatePeer (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const advertisedUrl = url.parse(request.server.info.uri)
    if (request.server.info.host !== advertisedUrl.host) {
      return false
    }
    return true
  }
  server.route({
    method: 'GET',
    path: '/peers',
    handler: getPeers
  })

  server.route({
    method: 'GET',
    path: '/memory',
    handler: getMemory
  })

  server.route({
    method: 'GET',
    path: '/validate-peer',
    handler: validatePeer
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
