// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import Config from './Config'
import HyperClient from './HyperClient'
import PodDatabase from './PodDatabase'
import { checkMemory } from '../util/podResourceCheck'
import {
  block,
  onForward,
  udp,
  Port,
  toPort,
  toPortNumberRange,
  toInterface,
  fromInterface,
  reduceRule,
  iptablesIdempotent as iptables
} from '../util/iptables'
import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const DEFAULT_INTERVAL = 5000

export default class PodManager {
  private hyper: HyperClient
  private pods: PodDatabase
  private hyperClient: HyperClient
  private config: Config

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.hyper = deps(HyperClient)
    this.hyperClient = deps(HyperClient)
    this.config = deps(Config)
  }

  public checkPodMem (memory: number | void): number {
    if (memory) {
      return memory
    }
    return 0
  }

  start () {
    // Set up pod network isolation
    if (!this.config.devMode) {
      this.protectNetwork()
        .catch(err => log.error(err))
    }

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

  private async protectNetwork () {
    // Shutdown inter-pod communication
    let ipCommands = [block, onForward, toInterface('hyper0'), fromInterface('hyper0')]
    await iptables(reduceRule(ipCommands))

    // Block outgoing ports
    const outgoingPorts: Port[] = [
      [25, 'tcp'],
      [5060, 'tcp'],
      [5060, 'udp']
    ]
    for (let port of outgoingPorts) {
      ipCommands = [block, onForward, fromInterface('hyper0'), toPort(port)]
      await iptables(reduceRule(ipCommands))
    }

    // Block incoming ports
    const incomingPorts: Port[] = [
      [19, 'udp'],
      [22, 'udp'],
      [80, 'udp'],
      [111, 'udp'],
      [137, 'udp'],
      [138, 'udp'],
      [139, 'udp'],
      [389, 'udp'],
      [520, 'udp'],
      [1900, 'udp'],
      [5093, 'udp'],
      [5353, 'udp'],
      [11211, 'udp']
    ]
    for (let port of incomingPorts) {
      ipCommands = [block, onForward, toInterface('hyper0'), toPort(port)]
      await iptables(reduceRule(ipCommands))
    }
    ipCommands = [block, onForward, udp, toInterface('hyper0'), toPortNumberRange(33434, 33534)]
    await iptables(reduceRule(ipCommands))
  }
}
