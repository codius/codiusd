import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import PodDatabase from '../services/PodDatabase'

const HttpProxy = require('http-proxy')
const MANIFEST_LABEL_REGEX = /^[a-zA-Z2-7]{52}$/

import { create as createLogger } from '../common/log'
const log = createLogger('proxy')

export default function (server: Hapi.Server, deps: Injector) {
  const pods = deps(PodDatabase)
  const proxy = HttpProxy.createProxyServer({
    ws: true // allow websockets
  })

  async function proxyToPod (request: Hapi.Request, h: any) {
    const [ label ] = request.info.host.split('.')

    if (!MANIFEST_LABEL_REGEX.exec(label)) {
      return h.continue
    }

    const pod = pods.getPod(label)
    if (!pod || !pod.ip || !pod.port) {
      throw Boom.notFound('no pod with that hash found. ' +
        `hash=${label}`)
    }

    const target = `http://${pod.ip}:${pod.port}`

    await new Promise((resolve, reject) => {
      proxy.web(request.raw.req, request.raw.res, { target }, (e: any) => {
        const statusError = {
          ECONNREFUSED: Boom.serverUnavailable(),
          ETIMEOUT: Boom.gatewayTimeout()
        }[e.code]

        if (statusError) {
          reject(statusError)
        }

        resolve()
      })
    })
  }

  server.ext('onRequest', proxyToPod)
}
