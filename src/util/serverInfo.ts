import PodManager from '../services/PodManager'
import Config from '../services/Config'
import PeerDatabase from '../services/PeerDatabase'
import * as os from 'os'
import * as process from 'process'

export function freeMem (config: Config, podManager: PodManager) {
  return (os.totalmem() * config.maxMemoryFraction) - podManager.getMemoryUsed()
}

export function serverInfo (config: Config, podManager: PodManager, peerDb: PeerDatabase) {
  const fullMem = podManager.getMemoryUsed() * (2 ** 20) / os.totalmem() >= config.maxMemoryFraction
  const serverFreeMemory = freeMem(config, podManager)
  const infoResp = {
    fullMem,
    acceptingUploads: !fullMem,
    serverFreeMemory,
    serverUptime: os.uptime(),
    serviceUptime: process.uptime(),
    avgLoad: os.loadavg()[0],
    numPeers: peerDb.getNumPeers(),
    currency: config.hostCurrency,
    costPerMonth: config.hostCostPerMonth,
    uri: config.publicUri
  }

  return infoResp
}
