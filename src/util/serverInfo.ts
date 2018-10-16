import PodManager from '../services/PodManager'
import Config from '../services/Config'
import Ildcp from '../services/Ildcp'
import PeerDatabase from '../services/PeerDatabase'
import SelfTest from '../services/SelfTest'
import * as os from 'os'
import * as process from 'process'

export function freeMem (config: Config, podManager: PodManager) {
  return (os.totalmem() * config.maxMemoryFraction) - podManager.getMemoryUsed()
}

export function serverInfo (config: Config, ildcp: Ildcp, podManager: PodManager, peerDb: PeerDatabase, selfTest: SelfTest) {
  const fullMem = podManager.getMemoryUsed() * (2 ** 20) / os.totalmem() >= config.maxMemoryFraction
  const serverFreeMemory = freeMem(config, podManager)
  const averageLoad = os.loadavg()[0] / os.cpus().length
  const infoResp = {
    fullMem,
    acceptingUploads: !fullMem,
    serverFreeMemory,
    serverUptime: os.uptime(),
    serviceUptime: process.uptime(),
    avgLoad: averageLoad,
    numPeers: peerDb.getNumPeers(),
    currency: ildcp.getAssetCode(),
    costPerMonth: config.hostCostPerMonth,
    uri: config.publicUri,
    selfTestSuccess: selfTest.selfTestSuccess
  }

  return infoResp
}
