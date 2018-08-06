import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import { serverInfo } from '../util/serverInfo'
import PeerDatabase from '../services/PeerDatabase'
import PodManager from '../services/PodManager'
import Config from '../services/Config'
import Version from '../services/Version'
import { HostInfo } from '../schemas/HostInfo'

export default function (server: Hapi.Server, deps: Injector) {
  const peerDb = deps(PeerDatabase)
  const podManager = deps(PodManager)

  const config = deps(Config)
  const ver = deps(Version)

  function uptimeToStr (uptime: any) {

    function numberEnding (time: any) {
      return (time > 1 || time === 0) ? `s` : ``
    }

    const years = Math.floor(uptime / 31536000)
    const months = Math.floor((uptime %= 31536000) / 2592000)
    const days = Math.floor((uptime %= 2592000) / 86400)
    const hours = Math.floor((uptime %= 86400) / 3600)
    const minutes = Math.floor((uptime %= 3600) / 60)
    const seconds = Math.floor(uptime % 60)

    if (years) {
      return `${years} year${numberEnding(years)} ${months} month${numberEnding(months)} ${days} day${numberEnding(days)}`
    } else if (months) {
      return `${months} month${numberEnding(months)} ${days} day${numberEnding(days)}`
    } else if (days) {
      return `${days} day${numberEnding(days)} ${hours} hour${numberEnding(hours)}`
    } else if (hours) {
      return `${hours} hour${numberEnding(hours)} ${minutes} minute${numberEnding(minutes)}`
    } else if (minutes) {
      return `${minutes} minute${numberEnding(minutes)}`
    } else if (seconds) {
      return `${seconds} second${numberEnding(seconds)}`
    }
    return 'less than a second'
  }

  async function getIndex (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const hostInfo: HostInfo = serverInfo(config, podManager, peerDb)
    const freeMemRaw = hostInfo.serverFreeMemory
    const formatFreeMem = (memory: number) => { return (Math.floor(memory / 1e9)) > 0 ? ((memory / 1000000000).toFixed(3)).toString() + ' gigabytes' : ((memory / 1000000).toFixed(3)).toString() + ' megabytes' }
    return h.view('index', {
      uri: hostInfo.uri,
      numPeers: hostInfo.numPeers,
      serverUptime: uptimeToStr(hostInfo.serverUptime),
      serviceUptime: uptimeToStr(hostInfo.serviceUptime),
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
