import * as Hapi from 'hapi'
import Config from '../services/Config'
import PodDatabase from '../services/PodDatabase'
import { Injector } from 'reduct'
import { getCurrencyPerSecond } from '../util/priceRate'

import { create as createLogger } from '../common/log'
const log = createLogger('admin')

export default function (server: Hapi.Server, deps: Injector) {
  const podDatabase = deps(PodDatabase)
  const config = deps(Config)

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

  async function getPodInfo (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    log.debug('Querying pod info for: ', request.query['id'])
    return podDatabase.getPod(request.query['id'])
  }

  async function getAllUptime (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const uptime = podDatabase.getLifetimePodsUptime()
    const profit = Number(uptime) * getCurrencyPerSecond(deps) / Math.pow(10, config.hostAssetScale)

    return {
      aggregate_pod_uptime: uptime,
      aggregate_earnings: profit,
      currency: config.hostCurrency
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
    handler: getRunningPods
  })

  server.route({
    method: 'GET',
    path: '/getPodInfo',
    handler: getPodInfo
  })

  server.route({
    method: 'GET',
    path: '/getAllUptime',
    handler: getAllUptime
  })
}
