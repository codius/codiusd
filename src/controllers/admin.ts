import * as Hapi from 'hapi'
import Config from '../services/Config'
import PodDatabase from '../services/PodDatabase'
import { Injector } from 'reduct'

export default function (server: Hapi.Server, deps: Injector) {
  const podDatabase = deps(PodDatabase)
  const config = deps(Config)

  function getCurrencyPerSecond (): number {
    // TODO: add support to send information on what currency to use. Then again surely this depends on the moneyd uplink the host is using? Could malicious users lie about their currency?
    const secondsPerMonth = 2.628e6
    const currencyAssetScale = config.hostAssetScale
    const currencyPerMonth = config.hostCostPerMonth * Math.pow(10, currencyAssetScale)
    const currencyPerSecond = currencyPerMonth / secondsPerMonth
    return currencyPerSecond
  }

  async function getAdminInfo (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      test: 'This shows that you are running the Codiusd Admin API.'
    }
  }

  async function getRunningPods (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      running: podDatabase.getRunningPods()
    }
  }

  async function getExpiredPods (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      expired: podDatabase.getExpiredPods()
    }
  }

  async function getAllPods (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      running: podDatabase.getRunningPods(),
      expired: podDatabase.getExpiredPods()
    }
  }

  async function getAllUptime (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const uptime = podDatabase.getLifetimePodsUptime()

    const profit = Number(uptime) * getCurrencyPerSecond()

    return {
      aggregate_pod_uptime: uptime,
      aggregate_earnings: profit
    }
  }

  server.route({
    method: 'GET',
    path: '/{params*}',
    handler: getAdminInfo
  })

  server.route({
    method: 'GET',
    path: '/getPods',
    handler: getAllPods
  })

  server.route({
    method: 'GET',
    path: '/getExpiredPods',
    handler: getExpiredPods
  })

  server.route({
    method: 'GET',
    path: '/getRunningPods',
    handler: getRunningPods
  })

  server.route({
    method: 'GET',
    path: '/getAllUptime',
    handler: getAllUptime
  })
}
