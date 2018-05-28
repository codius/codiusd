import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import PodDatabase from '../services/PodDatabase'

const MANIFEST_PATH_REGEX = /^([a-zA-Z2-7]{52})\/?/

import { create as createLogger } from '../common/log'
const log = createLogger('proxy')

export default function (server: Hapi.Server, deps: Injector) {
  const pods = deps(PodDatabase)

  async function proxyToPod (request: Hapi.Request, h: any) {
    const [, hash ]: Array<string> = request.params.hash.match(MANIFEST_PATH_REGEX) || []

    if (!hash) {
      throw Boom.notFound()
    }

    const pod = pods.getPod(hash)
    if (!pod || !pod.ip || !pod.port) {
      throw Boom.notFound('no pod with that hash found. ' +
        `hash=${hash}`)
    }

    const truncatedPath = request.params.hash
      .replace(MANIFEST_PATH_REGEX, '')
    const uri = `http://${pod.ip}:${pod.port}/${truncatedPath}`
    log.debug(`proxying request. hash=${hash} uri="${uri}"`)

    // TODO: proxy ws requests too
    return h.proxy({ uri })
  }

  server.route({
    method: '*',
    path: '/{hash*}',
    options: {
      handler: proxyToPod,
      payload: {
        parse: false,
        output: 'stream'
      }
    }
  })
}
