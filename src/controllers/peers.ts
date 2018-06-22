import * as Hapi from 'hapi'
import * as Joi from 'joi'
import { Injector } from 'reduct'
import PeerDatabase from '../services/PeerDatabase'
import Version from '../services/Version'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const ver = deps(Version)

  async function getPeers (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return { peers: peerDb.getPeers(request.query['limit']) }
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
    handler: getPeers,
    options: {
      validate: {
        query: {
          limit: Joi.number().integer().min(1).max(1000).default(1000)
        }
      }
    }
  })

  server.route({
    method: 'POST',
    path: '/peers/discover',
    handler: postPeers,
    options: {
      validate: {
        payload: {
          limit: Joi.number().integer().min(1).max(1000).default(1000),
          peers: Joi.array().items(Joi.string()).required()
        }
      },
      payload: {
        allow: 'application/json',
        output: 'data'
      }
    }
  })
}
