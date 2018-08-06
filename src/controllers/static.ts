import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import { serverInfo } from '../util/serverInfo'
import PeerDatabase from '../services/PeerDatabase'
import PodManager from '../services/PodManager'
import Config from '../services/Config'
import Version from '../services/Version'
import SelfTest from '../services/SelfTest'
import { HostInfo } from '../schemas/HostInfo'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const podManager = deps(PodManager)

  const config = deps(Config)
  const selfTest = deps(SelfTest)
  const ver = deps(Version)

  async function getIndex (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const hostInfo: HostInfo = serverInfo(config, podManager, peerDb, selfTest)
    const freeMemRaw = hostInfo.serverFreeMemory
    const formatFreeMem = (memory: number) => { return (Math.floor(memory / 1e9)) > 0 ? ((memory / 1000000000).toFixed(3)).toString() + ' gigabytes' : ((memory / 1000000).toFixed(3)).toString() + ' megabytes' }
    return h.view('index', {
      uri: hostInfo.uri,
      numPeers: hostInfo.numPeers,
      serverUptime: hostInfo.serverUptime,
      serviceUptime: hostInfo.serviceUptime,
      avgLoad: hostInfo.avgLoad,
      currency: hostInfo.currency,
      costPerMonth: hostInfo.costPerMonth,
      fullMem: hostInfo.fullMem,
      freeMem: freeMemRaw ? formatFreeMem(freeMemRaw) : 'N/A',
      version: ver.getVersion()
    })
  }

  server.route({
    method: 'GET',
    path: '/{params*}',
    handler: getIndex
  })
}
