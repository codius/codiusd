import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { URL } from 'url'
import { Injector } from 'reduct'
import { PodRequest } from '../schemas/PodRequest'
import { PodSpec } from '../schemas/PodSpec'
import Config from '../services/Config'
import Ildcp from '../services/Ildcp'
import PodManager from '../services/PodManager'
import { checkMemory } from '../util/podResourceCheck'
import { getCurrencyPerSecond } from '../util/priceRate'
import PodDatabase from '../services/PodDatabase'
import ManifestDatabase from '../services/ManifestDatabase'
import CodiusDB from '../util/CodiusDB'
import ManifestParser from '../services/ManifestParser'
import os = require('os')
const Enjoi = require('enjoi')
const PodRequest = require('../schemas/PodRequest.json')
import BigNumber from 'bignumber.js'

import { create as createLogger } from '../common/log'
const log = createLogger('pods')

export interface PostPodResponse {
  url: string,
  manifestHash: string,
  expiry: string
}

export default function (server: Hapi.Server, deps: Injector) {
  const podManager = deps(PodManager)
  const podDatabase = deps(PodDatabase)
  const manifestDatabase = deps(ManifestDatabase)
  const manifestParser = deps(ManifestParser)
  const config = deps(Config)
  const ildcp = deps(Ildcp)
  const codiusdb = deps(CodiusDB)
  let profit: BigNumber | undefined

  function getPodUrl (manifestHash: string): string {
    const hostUrl = new URL(config.publicUri)
    hostUrl.host = manifestHash + '.' + hostUrl.host
    return hostUrl.href
  }

  function checkIfHostFull (podSpec: PodSpec) {
    const totalMem = os.totalmem()
    const totalPodMem = checkMemory(podSpec.resource)
    if ((podManager.getMemoryUsed() + totalPodMem) * (2 ** 20) / totalMem > config.maxMemoryFraction) {
      return true
    }
    return false
  }

  async function addProfit (amount: BigNumber.Value): Promise<void> {
    if (profit === undefined) {
      profit = await codiusdb.getProfit(ildcp.getAssetCode(), ildcp.getAssetScale())
    }
    profit = profit.plus(amount)
    await codiusdb.setProfit(ildcp.getAssetCode(), ildcp.getAssetScale(), profit)
  }

  async function chargeForDuration (request: any): Promise<string> {
    const duration = request.query['duration'] || '3600'

    const price = computePrice(config, ildcp, duration)
    log.debug('got post pod request. duration=' + duration + ' price=' + price.toString())

    await chargeForRequest(request, price)

    return duration
  }

  function computePrice (config: any, ildcp: any, duration: any) {
    const currencyPerSecond = getCurrencyPerSecond(config, ildcp)
    const price = currencyPerSecond.times(new BigNumber(duration)).integerValue(BigNumber.ROUND_CEIL)
    return price
  }

  async function chargeForRequest (request: any, price: BigNumber.Value): Promise<void> {
    const stream = request.ilpStream()
    try {
      await stream.receiveTotal(price)
    } catch (e) {
      log.error('error receiving payment. error=' + e.message)
      throw Boom.paymentRequired('Failed to get payment before timeout')
    } finally {
      addProfit(stream.totalReceived).catch((err) => {
        log.error('errors updating profit. error=' + err.message)
      })
    }
  }

  // TODO: how to add plugin decorate functions to Hapi.Request type
  async function postPod (request: any, h: Hapi.ResponseToolkit): Promise<PostPodResponse> {
    const podSpec = manifestParser.manifestToPodSpec(
      request.payload['manifest'],
      request.payload['private'] || {}
    )

    // throw error if memory usage exceeds available memory
    if (checkIfHostFull(podSpec)) {
      throw Boom.serverUnavailable('Memory usage exceeded. Send pod request later.')
    }

    const pullPointer = request.query['pullPointer'] || ''
    const duration = await getDuration(request)

    await podManager.startPod(podSpec, duration, pullPointer, request.payload['manifest']['port'])
    await manifestDatabase.saveManifest(podSpec.id, request.payload['manifest'])

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

  async function getDuration (request: any): Promise<string> {
    const duration = request.query['duration'] || '3600'
    const pullPointer = request.query['pullPointer'] || ''
    if (request.headers['pay-accept']) {
      if (request.headers['pay-accept'].indexOf('interledger-pull') !== -1) {
        if (config.pull) {
          if (duration >= config.pullIntervalSeconds) {
            if (pullPointer === '') {
              requestPullPointer(duration)
            } else {
              return String(config.pullIntervalSeconds || 1).toString()
            }
          }
        }
      }
    }
    await chargeForDuration(request)
    return duration
  }

  function requestPullPointer (duration: any) {
    let amount = computePrice(config, ildcp, String(config.pullIntervalSeconds))
    let cycles = new BigNumber(duration).div(config.pullIntervalSeconds || 1).integerValue(BigNumber.ROUND_CEIL)
    let pointerInfo = {
      'amount': amount,
      'interval': config.pullInterval,
      'cycles': cycles,
      'cap': config.pullCap,
      'assetCode': ildcp.getAssetCode(),
      'assetScale': Number(ildcp.getAssetScale()),
      'total': cycles.multipliedBy(amount)
    }
    const error = Boom.paymentRequired('Failed to retrieve pull-pointer.')
    error.output.headers['Pay-Accept'] = 'interledger-pull'
    error.output.headers['Pull-Pointer'] = JSON.stringify(pointerInfo)
    throw error
  }

  async function extendPod (request: any, h: Hapi.ResponseToolkit) {
    const duration = await chargeForDuration(request)

    const manifestHash = request.query['manifestHash']
    if (!manifestHash) {
      throw Boom.badData('manifestHash must be specified')
    }

    await podDatabase.addDurationToPod(manifestHash, duration)

    const podInfo = podDatabase.getPod(manifestHash)
    if (!podInfo) {
      throw Boom.serverUnavailable('pod has stopped. ' +
        `manifestHash=${manifestHash}`)
    }

    return {
      url: getPodUrl(podInfo.id),
      manifestHash: podInfo.id,
      expiry: podInfo.expiry
    }
  }

  async function getPod (request: any, h: Hapi.ResponseToolkit) {
    const manifestHash = request.query['manifestHash']
    if (!manifestHash) {
      throw Boom.badData('manifestHash must be specified')
    }

    const manifest = await manifestDatabase.getManifest(manifestHash)
    const podInfo = podDatabase.getPod(manifestHash)
    if (!podInfo) {
      // make sure that the manifest was cleaned up
      await manifestDatabase.deleteManifest(manifestHash)
      throw Boom.serverUnavailable('pod has stopped. ' +
        `manifestHash=${manifestHash}`)
    }

    return {
      url: getPodUrl(podInfo.id),
      manifestHash: podInfo.id,
      expiry: podInfo.expiry,
      manifest
    }
  }

  async function getPodPrice (request: any, h: Hapi.ResponseToolkit) {
    await chargeForRequest(request, new BigNumber(0))
    const duration = request.query['duration'] || 3600
    const currencyPerSecond = getCurrencyPerSecond(config, ildcp)
    const price = currencyPerSecond.times(new BigNumber(duration)).integerValue(BigNumber.ROUND_CEIL)
    log.debug('got pod options request. duration=' + duration + ' price=' + price.toString())
    const podSpec = manifestParser.manifestToPodSpec(
      request.payload['manifest'],
      request.payload['private']
    )

    log.debug('podSpec', podSpec)

    return {
      manifestHash: podSpec.id,
      price: price.toString()
    }
  }

  async function getPodLogs (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const podId = request.params['id']
    const pod = podDatabase.getPod(podId)

    if (!pod) {
      throw Boom.notFound(`no pod found with this id. id=${podId}`)
    }

    const manifest = await manifestDatabase.getManifest(podId)

    if (!manifest || !manifest.debug) {
      throw Boom.forbidden(`pod manifest does not allow debugging. id=${podId}`)
    }

    const stream = await podManager.getLogStream(podId, request.query['follow'] === 'true')

    return h
      .response(stream)
      .type('text/event-stream')
      // This mime type is set in our server options to disable compression
      .header('Content-Type', 'application/vnd.codius.raw-stream')
      .header('Connection', 'keep-alive')
      .header('Cache-Control', 'no-cache')
  }

  server.route({
    method: 'OPTIONS',
    path: '/pods',
    handler: getPodPrice,
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
        output: 'data'
      }
    }
  })

  server.route({
    method: 'PUT',
    path: '/pods',
    handler: extendPod,
    options: {
      validate: {
        payload: false
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/pods',
    handler: getPod,
    options: {
      validate: {
        payload: false
      }
    }
  })

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
        output: 'data'
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/pods/{id}/logs',
    handler: getPodLogs
  })
}
