import * as Hapi from 'hapi'
import PodDatabase from '../services/PodDatabase'
import { Injector } from 'reduct'

export default function (server: Hapi.Server, deps: Injector) {
  const podDatabase = deps(PodDatabase)

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

  async function getExpiredPods (request: Hapi.request, h: Hapi.ResponseToolkit) {
    return {
      running: podDatabase.getExpiredPods()
    }
  }

  async function getAllPods (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    return {
      running: podDatabase.getRunningPods(),
      expired: podDatabase.getExpiredPods()
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
    hanldler: getExpiredPods
  })

  server.route({
    method: 'GET',
    path: '/getRunningPods',
    handler: getRunningPods
  })
}
