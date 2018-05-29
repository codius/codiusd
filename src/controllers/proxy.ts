import * as Hapi from 'hapi'
import * as Boom from 'boom'
import { ClientRequestArgs } from 'http'
import { Socket } from 'net'
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

  function isPodRequest (host: string): boolean {
    return !!MANIFEST_LABEL_REGEX.exec(host.split('.')[0])
  }

  function getPod (host: string): string {
    const [ label ] = host.split('.')
    const pod = pods.getPod(label)

    if (!pod || !pod.ip || !pod.port) {
      throw Boom.notFound('no pod with that hash found. ' +
        `hash=${label}`)
    }

    return `http://${pod.ip}:${pod.port}`
  }

  async function proxyToPod (request: Hapi.Request, h: any) {
    const host = request.info.host

    if (!isPodRequest(host)) {
      return h.continue
    }

    const target = getPod(host)
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

  function writeError (socket: Socket, code: number, error: string): void {
    socket.write(`HTTP/1.1 ${code} ${error}\r\n`)
    socket.end()
  }

  async function wsProxyToPod (req: ClientRequestArgs, socket: Socket, head: Buffer) {
    const host = String((req.headers || {}).host)

    socket.on('error', (e: Error) => {
      if (e.message !== 'read ECONNRESET') {
        log.debug(`socket error. msg=${e.message}`)
      }
    })

    if (!isPodRequest(host)) {
      writeError(socket, 502, 'Bad Gateway')
      return
    }

    try {
      const target = getPod(host)
      proxy.ws(req, socket, head, { target }, (error: Error) => {
        if (error.message !== 'socket hang up') {
          log.debug(`error in ws proxy. error="${error.message}"`)
        }
      })
    } catch (e) {
      if (e.isBoom) {
        writeError(socket, e.output.statusCode, e.output.payload.error)
        return
      } else {
        throw e
      }
    }
  }

  server.listener.on('upgrade', wsProxyToPod)
  server.ext('onRequest', proxyToPod)
}
