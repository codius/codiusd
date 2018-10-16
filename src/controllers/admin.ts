import * as Hapi from 'hapi'
import * as Boom from 'boom'
import Config from '../services/Config'
import Ildcp from '../services/Ildcp'
import PodDatabase from '../services/PodDatabase'
import CodiusDB from '../util/CodiusDB'
import { Injector } from 'reduct'
const Enjoi = require('enjoi')
const ConfigUpdate = require('../schemas/ConfigUpdate.json')

import { create as createLogger } from '../common/log'
const log = createLogger('admin')

export default function (server: Hapi.Server, deps: Injector) {
  const podDatabase = deps(PodDatabase)
  const config = deps(Config)
  const codiusdb = deps(CodiusDB)
  const ildcp = deps(Ildcp)

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
    if (!request.query['id']) {
      throw Boom.badRequest('missing manifestHash')
    }
    log.debug('Querying pod info for: ', request.query['id'])
    return podDatabase.getPod(request.query['id'])
  }

  async function getAllUptime (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const uptime = podDatabase.getLifetimePodsUptime()
    const profitRaw = await codiusdb.getProfit()
    const profit = profitRaw.shiftedBy(-ildcp.getAssetScale())

    return {
      aggregate_pod_uptime: uptime.toString(),
      aggregate_earnings: profit.toString(),
      currency: ildcp.getAssetCode()
    }
  }

  async function postConfig (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    if (request.payload['hostCostPerMonth']) {
      config.hostCostPerMonth = request.payload['hostCostPerMonth']
    }
    return null
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

  server.route({
    method: 'POST',
    path: '/config',
    handler: postConfig,
    options: {
      validate: {
        payload: Enjoi(ConfigUpdate),
        failAction: async (req, h, err) => {
          log.warn('/config validation error. error=' + (err && err.message))
          throw Boom.badRequest('Invalid request payload')
        }
      },
      payload: {
        allow: 'application/json',
        output: 'data'
      },
      response: { emptyStatusCode: 204 }
    }
  })
}
