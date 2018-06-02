// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import HyperClient from './HyperClient'
import PodDatabase from './PodDatabase'

import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const DEFAULT_INTERVAL = 5000

export function checkVCPU(resource: any) : number {
  if (resource) {
    return resource.vcpu
  }
  return 1
}

export function checkMemory(resource: any) : number {
  if (resource) {
    return resource.memory
  }
  return 512
}
export default class PodManager {
  private hyper: HyperClient
  private pods: PodDatabase
  private memoryUsed: number
  private hyperClient: HyperClient

  public checkPodMem (memory: number | void): number {
    if(memory) {
      return memory
    }
    return 0
  }

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.hyper = deps(HyperClient)
    this.hyperClient = deps(HyperClient)
  }

  start () {
    this.run()
      .catch(err => log.error(err))
  }


  async run () {
    // log.debug('monitoring for expired images')

    const expired = this.pods.getExpiredPods()
    if (expired.length) {
      log.debug('got expired pods. pods=' + JSON.stringify(expired))
    }

    await Promise.all(expired.map(async pod => {
      log.debug('cleaning up pod. id=' + pod)
      await this.hyperClient.deletePod(pod)
      this.pods.deletePod(pod)
    }))
    
    
    setTimeout(this.run.bind(this), DEFAULT_INTERVAL)
  }

  public getMemoryUsed () {
    const runningPods = this.pods.getRunningPods()
    let memory = 0
    for (let i = 0; i < runningPods.length; i++) {
      let pod = this.pods.getPod(runningPods[i])
      if (pod) {
        memory += this.checkPodMem(pod.memory)
      }
    }
    return memory
  }

  async startPod (podSpec: PodSpec, duration: string, port?: string) {
    if (this.pods.getPod(podSpec.id)) {
      const isRunning = await this.hyperClient.getPodInfo(podSpec.id)
        .then((info) => true)
        .catch(() => false)
      if (isRunning) {
        this.pods.addDurationToPod(podSpec.id, duration)
        return
      }
    }

    this.pods.addPod({
      id: podSpec.id,
      running: true,
      duration,
      memory: checkVCPU(podSpec.resource) * checkMemory(podSpec.resource)
    })

    // TODO: validate regex on port arg incoming
    if (port && Number(port) > 0) {
      this.pods.setPodPort(podSpec.id, port)
    }

    await this.hyperClient.runPod(podSpec)

    const ip = await this.hyper.getPodIP(podSpec.id)
    this.pods.setPodIP(podSpec.id, ip)
  }
}
