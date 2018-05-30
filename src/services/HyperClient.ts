import { Injector } from 'reduct'
import * as Boom from 'boom'
import Config from './Config'
import { PodSpec } from '../schemas/PodSpec'
import axios from 'axios'

import { create as createLogger } from '../common/log'
const log = createLogger('HyperClient')

export interface HyperPodInfoResponse {
  podID: string
  kind: string
  apiVersion: string
  vm: string
  createdAt: number
  spec: object
  status: {
    phase: string
    hostIP: string
    podIP: string[]
    containerStatus: object
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

  async createPod (podSpec: PodSpec): Promise<void> {
    if (this.config.noop) return
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
    await axios.request({
      socketPath: this.config.hyperSock,
      method: 'post',
      url: '/pod/start',
      params: { podId }
    })
  }

  async runPod (podSpec: PodSpec): Promise<void> {
    await this.createPod(podSpec)
    await this.startPod(podSpec.id)
  }

  async deletePod (podId: string): Promise<void> {
    if (this.config.noop) return
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
}
