import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import PodDatabase from '../services/PodDatabase'
import PodManager from '../services/PodManager'
import PeerDatabase from '../services/PeerDatabase'
import { freeMem, serverInfo } from '../util/serverInfo'
import Config from '../services/Config'
import { HostInfo } from '../schemas/HostInfo'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const podDatabase = deps(PodDatabase)
  const podManager = deps(PodManager)

  const config = deps(Config)

  async function getMemory (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      freeMem: freeMem(config, podManager)
    }
  }

  async function infoHandler (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const infoResp: HostInfo = serverInfo(config, podManager, peerDb)
    if (config.showAdditionalHostInfo) {
      infoResp.runningContracts = podDatabase.getRunningPods().length
      // TODO: add other relevant information like number of running pods, average uptime per pod...
      if (request.query && request.query['requestPeers'] === 'true') {
        infoResp.peers = peerDb.getAllPeers()
      }
    }
    return infoResp
  }

  server.route({
    method: 'get',
    path: '/info',
    handler: infoHandler
  })

  server.route({
    method: 'GET',
    path: '/memory',
    handler: getMemory
  })
}
