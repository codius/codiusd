import * as Hapi from 'hapi'
import { Injector } from 'reduct'
import ManifestParser from '../services/ManifestParser'
import PodManager from '../services/PodManager'

export default function (server: Hapi.Server, deps: Injector) {
  const manifestParser = deps(ManifestParser)
  const podManager = deps(PodManager)

  async function postPod (request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const podSpec = manifestParser.manifestToPodSpec(request.payload['manifest'])
    console.log('podSpec', podSpec)
    await podManager.startPod(podSpec)
    return {}
  }

  server.route({
    method: 'POST',
    path: '/pods',
    handler: postPod,
    options: {
      payload: {
        allow: 'application/json',
        output: 'data'
      }
    }
  })
}
