import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import { serverInfo } from '../util/freeMemory'
import PeerDatabase from '../services/PeerDatabase'
import PodManager from '../services/PodManager'
import Config from '../services/Config'
import { HostInfo } from '../schemas/HostInfo'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const podManager = deps(PodManager)

  const config = deps(Config)

  async function getIndex (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const hostInfo: HostInfo = serverInfo(config, podManager, peerDb)
    return h.view('index', {
      uri: hostInfo.uri,
      numPeers: hostInfo.numPeers,
      serverUptime: hostInfo.serverUptime,
      serviceUptime: hostInfo.serviceUptime,
      avgLoad: hostInfo.avgLoad,
      currency: hostInfo.currency,
      costPerMonth: hostInfo.costPerMonth,
      fullMem: hostInfo.fullMem
    })
  }

  server.route({
    method: 'GET',
    path: '/{params*}',
    handler: getIndex
  })
}
