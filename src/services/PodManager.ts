// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import HyperClient from './HyperClient'
import PodDatabase from './PodDatabase'
import { checkMemory } from '../util/podResourceCheck'
import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const DEFAULT_INTERVAL = 5000

export default class PodManager {
  private hyper: HyperClient
  private pods: PodDatabase
  private hyperClient: HyperClient

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.hyper = deps(HyperClient)
    this.hyperClient = deps(HyperClient)
  }
  public checkPodMem (memory: number | void): number {
    if (memory) {
      return memory
    }
    return 0
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
      try {
        await this.hyperClient.deletePod(pod)
      } catch (e) {
        log.error('error cleaning up pod. ' +
          `id=${pod} ` +
          `error=${e.message}`)
      }

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
        await this.pods.addDurationToPod(podSpec.id, duration)
        return
      }
    }

    await this.pods.addPod({
      id: podSpec.id,
      running: true,
      duration,
      memory: checkMemory(podSpec.resource)
    })

    // TODO: validate regex on port arg incoming
    if (port && Number(port) > 0) {
      await this.pods.setPodPort(podSpec.id, port)
    }

    await this.hyperClient.runPod(podSpec)

    const ip = await this.hyper.getPodIP(podSpec.id)
    await this.pods.setPodIP(podSpec.id, ip)
  }
}
