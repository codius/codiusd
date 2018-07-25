// import axios from 'axios'
import * as Boom from 'boom'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import Config from './Config'
import HyperClient from './HyperClient'
import PodDatabase from './PodDatabase'
import ManifestDatabase from './ManifestDatabase'
import { checkMemory } from '../util/podResourceCheck'
import { Transform, PassThrough } from 'stream'
import * as multi from 'multi-read-stream'
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
  private manifests: ManifestDatabase
  private hyperClient: HyperClient
  private config: Config

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.manifests = deps(ManifestDatabase)
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
        await this.manifests.deleteManifest(pod)
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
        .then(info => !!info)
        .catch(() => false)
      if (isRunning) {
        await this.pods.addDurationToPod(podSpec.id, duration)
        return
      }
    }

    try {
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

    } catch (err) {
      log.error(`run pod failed, error=${err.message}`)
      throw Boom.badImplementation('run pod failed')
    } finally {
      this.verifyRunningPods()
    }

  }

  async getLogStream (podId: string, follow: boolean = false) {
    const { spec: { containers } } = await this.hyperClient.getPodInfo(podId)

    const stdStreams = {
      1: 'stdout',
      2: 'stderr'
    }

    const streams = await Promise.all(containers.map(async container => {
      const stream = await this.hyperClient.getLog(container.containerID, follow)
      const transform = new Transform({
        transform (chunk: Buffer, encoding: string, callback: Function) {
          const streamName = stdStreams[chunk[0]] || chunk[0]
          const containerName = container.name.substring(container.name.indexOf('_') + 1)
          const logData = chunk.slice(8)
          const logLine = `${containerName} ${streamName} ${logData.toString()}`
          callback(null, logLine)
        }
      })
      stream.pipe(transform)
      return transform
    }))

    if (follow) {
      const pingStream = new PassThrough()
      let pingInterval = setInterval(() => pingStream.push('ping\n'), 1000)
      pingStream.on('end', () => clearInterval(pingInterval))

      streams.push(pingStream)
    }

    return multi(streams)
  }

  private async verifyRunningPods () {
    const runningPods = await this.hyperClient.getPodList()
    const dbPods = await this.pods.getRunningPods()
    log.debug(`running pods=${runningPods}`)
    log.debug(`dbPods=${dbPods}`)
    const runningPodsSet = new Set(runningPods)
    const podsToDelete = dbPods.filter(pod => !runningPodsSet.has(pod))
    log.debug(`delete pods=${podsToDelete}`)
    this.pods.deletePods(podsToDelete)
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
