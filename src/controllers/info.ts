import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import PodDatabase from '../services/PodDatabase'
import PodManager from '../services/PodManager'
import PeerDatabase from '../services/PeerDatabase'
import * as os from 'os'
import * as process from 'process'
import Config from '../services/Config'
import { HostInfo } from '../schemas/HostInfo'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const podDatabase = deps(PodDatabase)
  const podManager = deps(PodManager)

  const config = deps(Config)

  function freeMem () {
    return (os.totalmem() * config.maxMemoryFraction) - podManager.getMemoryUsed()
  }
  async function getMemory (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      freeMem: freeMem()
    }
  }

  async function infoHandler (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const fullMem = podManager.getMemoryUsed() * (2 ** 20) / os.totalmem() >= config.maxMemoryFraction
    const serverFreeMemory = freeMem()
    const infoResp: HostInfo = {
      fullMem,
      acceptingUploads: !fullMem,
      serverFreeMemory,
      serverUptime: os.uptime(),
      serviceUptime: process.uptime(),
      avgLoad: os.loadavg()[0],
      numPeers: peerDb.getNumPeers(),
      currency: config.hostCurrency,
      costPerMonth: config.hostCostPerMonth,
      uri: request.server.info.uri
    }
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
