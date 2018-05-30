import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { URL } from 'url'
import { Injector } from 'reduct'
import { PodRequest } from '../schemas/PodRequest'
import Config from '../services/Config'
import PodManager from '../services/PodManager'
import PodDatabase from '../services/PodDatabase'
import ManifestParser from '../services/ManifestParser'

const Enjoi = require('enjoi')
const PodRequest = require('../schemas/PodRequest.json')

import { create as createLogger } from '../common/log'
const log = createLogger('pods')

const dropsPerXrp = 1e6
const xrpPerMonth = Number(process.env.CODIUS_XRP_PER_MONTH) || 10
const dropsPerMonth = xrpPerMonth * dropsPerXrp
const monthsPerSecond = 0.0000003802571
const dropsPerSecond = dropsPerMonth * monthsPerSecond

export interface PostPodResponse {
  url: string,
  manifestHash: string,
  expiry: string
}

export default function (server: Hapi.Server, deps: Injector) {
  const podManager = deps(PodManager)
  const podDatabase = deps(PodDatabase)
  const manifestParser = deps(ManifestParser)
  const config = deps(Config)

  function getPodUrl (manifestHash: string): string {
    const hostUrl = new URL(config.publicUri)
    hostUrl.host = manifestHash + '.' + hostUrl.host
    return hostUrl.href
  }

  // TODO: how to add plugin decorate functions to Hapi.Request type
  async function postPod (request: any, h: Hapi.ResponseToolkit): Promise<PostPodResponse> {
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

    await podManager.startPod(podSpec, duration,
      request.payload['manifest']['port'])

    // return info about running pod to uploader
    const podInfo = podDatabase.getPod(podSpec.id)

    if (!podInfo) {
      throw Boom.serverUnavailable('pod has stopped. ' +
        `manifestHash=${podSpec.id}`)
    }

    return {
      url: getPodUrl(podInfo.id),
      manifestHash: podInfo.id,
      expiry: podInfo.expiry
    }
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
