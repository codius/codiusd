import { Injector } from 'reduct'
import * as Boom from 'boom'
import Config from './Config'
import { PodSpec } from '../schemas/PodSpec'
import axios from 'axios'
import { get, IncomingMessage } from 'http'
import * as querystring from 'querystring'

import { create as createLogger } from '../common/log'
const log = createLogger('HyperClient')

export interface HyperPodInfoResponse {
  podID: string
  kind: string
  apiVersion: string
  vm: string
  createdAt: number
  spec: {
    containers: {
      args: string[],
      containerID: string,
      env: {
        env: string,
        value: string
      }[],
      image: string,
      imageID: string,
      name: string,
      volumeMounts: {
        mountPath: string,
        name: string
      },
      workingDir: string
    }[],
    memory: number,
    vcpu: number,
    volumes: {
      driver: string,
      name: string,
      source: string
    }[]
  },
  status: {
    phase: string
    hostIP: string
    podIP: string[]
    containerStatus: {
      containerID: string,
      name: string,
      phase: string,
      running: {
        startedAt: string
      },
      terminated: object,
      waiting: object
    }[]
  }
  podName: string
}

export default class HyperClient {
  private config: Config

  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  async getPodInfo (hash: string): Promise<HyperPodInfoResponse> {
    log.debug(`fetching pod info. id=${hash}`)
    const response = await axios.request({
      socketPath: this.config.hyperSock,
      method: 'get',
      url: '/pod/info',
      params: { podName: hash },
      responseType: 'json'
    })
    return response.data
  }

  async getPodIP (hash: string): Promise<string> {
    if (this.config.noop) return ''
    const info = await this.getPodInfo(hash)
    const [ cidr ] = info.status.podIP
    const [ ip ] = cidr.split('/')
    return ip
  }

  async pullImages (podSpec: PodSpec): Promise<void> {
    if (this.config.noop) return
    for (const container of podSpec.containers) {
      await this.pullImage(container.image)
    }
  }

  async pullImage (image: string): Promise<void> {
    if (this.config.noop) return
    log.info(`pulling image=${image}`)
    const start = Date.now()
    await axios.request({
      socketPath: this.config.hyperSock,
      method: 'post',
      url: '/image/create',
      params: { imageName: image }
    })
    const elapsed = Date.now() - start
    log.info(`pulled image=${image} in ${elapsed}ms`)
  }

  async createPod (podSpec: PodSpec): Promise<void> {
    if (this.config.noop) return
    log.info('creating pod. id=%s', podSpec.id)
    const res = await axios.request({
      socketPath: this.config.hyperSock,
      method: 'post',
      url: '/pod/create',
      data: podSpec
    })
    if (res.data.Code !== 0) {
      throw Boom.serverUnavailable('Could not create pod: hyper error code=' + res.data.Code)
    }
  }

  async startPod (podId: string): Promise<void> {
    if (this.config.noop) return
    log.info('starting pod. id=%s', podId)
    let res
    try {
      res = await axios.request({
        socketPath: this.config.hyperSock,
        method: 'post',
        url: '/pod/start',
        params: { podId }
      })
    } catch (err) {
      log.warn('start pod failed')
      log.warn(err)
    }
    log.warn('start pod end')
    log.warn(res)
  }

  async runPod (podSpec: PodSpec): Promise<void> {
    await this.createPod(podSpec).catch(async (err) => {
      log.warn(`pulling images after error="${err.message}"`)
      try {
        await this.deletePod(podSpec.id)
        await this.pullImages(podSpec)
        await this.createPod(podSpec)
      } catch (e) {
        log.error('create pod 2 fail')
        log.error(e)

      }
    })
    await this.startPod(podSpec.id)
  }

  async deletePod (podId: string): Promise<void> {
    if (this.config.noop) return
    log.info('deleting pod. id=%s', podId)
    const res = await axios.request({
      socketPath: this.config.hyperSock,
      method: 'delete',
      url: '/pod',
      params: { podId }
    })
    if (res.data.Code !== 0) {
      throw Boom.serverUnavailable('Could not delete pod: hyper error code=' + res.data.Code)
    }
  }

  getLog (containerId: string, follow: boolean = false): Promise<IncomingMessage> {
    log.info('attaching to container. containerId=%s', containerId)
    return new Promise((resolve, reject) => {
      const query = querystring.stringify({
        container: containerId,
        stdout: true,
        stderr: true,
        follow
      })
      const req = get({
        socketPath: this.config.hyperSock,
        method: 'GET',
        path: '/container/logs?' + query
      }, (res) => {
        resolve(res)
      })

      req.on('error', (err) => {
        log.error(
          'failed to attach to container. containerId=%s error=%s',
          containerId,
          err.stack
        )

        reject(err)
      })
    })
  }
}
