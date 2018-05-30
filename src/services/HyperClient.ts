import * as assert from 'assert'
import { Injector } from 'reduct'
import Config from './Config'
import { PodSpec } from '../schemas/PodSpec'
import { default as axios, AxiosResponse } from 'axios'

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
    const info = await this.getPodInfo(hash)
    const [ cidr ] = info.status.podIP
    const [ ip ] = cidr.split('/')
    return ip
  }

  createPod (podSpec: PodSpec): Promise<void> {
    return axios.request({
      socketPath: this.config.hyperSock,
      method: 'post',
      url: '/pod/create',
      data: podSpec
    }).then(validateResponseCode)
  }

  startPod (podId: string): Promise<void> {
    return axios.request({
      socketPath: this.config.hyperSock,
      method: 'post',
      url: '/pod/start',
      params: { podId }
    }).then(() => undefined)
  }

  runPod (podSpec: PodSpec): Promise<void> {
    return this.createPod(podSpec)
      .then(() => this.startPod(podSpec.id))
  }

  deletePod (podId: string): Promise<void> {
    return axios.request({
      socketPath: this.config.hyperSock,
      method: 'delete',
      url: '/pod',
      params: { podId }
    }).then(validateResponseCode)
  }
}

function validateResponseCode (res: AxiosResponse): void {
  assert.equal(res.data.Code, 0)
}
