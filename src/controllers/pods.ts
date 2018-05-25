import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import ManifestParser from '../services/ManifestParser'
import PodManager from '../services/PodManager'

const Enjoi = require('enjoi')
const PodRequest = require('../schemas/PodRequest.json')

import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const dropsPerXrp = 1e6
const xrpPerMonth = Number(process.env.CODIUS_XRP_PER_MONTH) || 10
const dropsPerMonth = xrpPerMonth * dropsPerXrp
const monthsPerSecond = 0.0000003802571
const dropsPerSecond = dropsPerMonth * monthsPerSecond

export default function (server: Hapi.Server, deps: Injector) {
  const manifestParser = deps(ManifestParser)
  const podManager = deps(PodManager)

  // TODO: how to add plugin decorate functions to Hapi.Request type
  async function postPod (request: any, h: Hapi.ResponseToolkit) {
    const duration = request.query['duration'] || 3600
    log.debug('got post pod request. duration=' + duration)

    const price = Math.ceil(dropsPerSecond * duration)
    const stream = request.ilpStream()

    try {
      await stream.receiveTotal(price)
    } catch (e) {
      // TODO: use logger module
      log.error('error receiving payment. error=' + e.message)
      throw Boom.paymentRequired('Failed to get payment before timeout')
    }

    const podSpec = manifestParser.manifestToPodSpec(
      request.payload['manifest'],
      request.payload['private']
    )

    log.debug('podSpec', podSpec)
    await podManager.startPod(podSpec, duration)
    return {}
  }

  server.route({
    method: 'POST',
    path: '/pods',
    handler: postPod,
    options: {
      validate: {
        payload: Enjoi(PodRequest),
        failAction: async (req, h, err) => {
          log.debug('validation error. error=' + (err && err.message))
          throw Boom.badRequest('Invalid request payload input')
        }
      },
      payload: {
        allow: 'application/json',
        output: 'data',
      }
    }
  })
}
