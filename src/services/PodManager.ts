// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import { PodInfo } from '../schemas/PodInfo'
import HyperClient from './HyperClient'
import PodDatabase from './PodDatabase'
import Spawner from './Spawner'
import Config from './Config'
import * as tempy from 'tempy'
import * as fs from 'fs-extra'

import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const DEFAULT_INTERVAL = 5000

export default class PodManager {
  private config: Config
  private hyper: HyperClient
  private pods: PodDatabase
  private spawner: Spawner
  private memoryUSed: Number
  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.hyper = deps(HyperClient)
    this.config = deps(Config)
    this.spawner = deps(Spawner)
    this.memoryUsed = 0
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
      await this.spawner.spawn(this.config.hyperctlCmd, [ 'rm', pod ])
      this.pods.deletePod(pod)
    }))
    const runningPods = this.pods.getRunningPods()
    let memory = 0
    for (let i = 0; i < runningPods.length; i++) {
      let pod = this.pods.getPod(runningPods[i])
      memory += pod.memory
    }
    this.memoryUsed = memory
    setTimeout(this.run.bind(this), DEFAULT_INTERVAL)
  }

  async startPod (podSpec: PodSpec, duration: string, port?: string) {
    // TODO: switch this to an HTTP request
    // await axios('/pod/start', {
    //   method: 'post',
    //   socketPath: '/var/run/hyper.sock'
    // })

    if (this.pods.getPod(podSpec.id)) {
      // TODO: check via hyper the code is still running
      this.pods.addDurationToPod(podSpec.id, duration)
      return
    }

    this.pods.addPod({
      id: podSpec.id,
      running: true,
      duration
      memory: podSpec.resource.vcpu * podSec.resource.memory
    })

    // TODO: validate regex on port arg incoming
    if (port && Number(port) > 0) {
      this.pods.setPodPort(podSpec.id, port)
    }

    const tmpFile = tempy.file({ extension: 'json' })
    await fs.writeJson(tmpFile, podSpec)

    await this.spawner.spawn(this.config.hyperctlCmd, [
      'run', '-p', tmpFile
    ])

    const ip = await this.hyper.getPodIP(podSpec.id)
    this.pods.setPodIP(podSpec.id, ip)
  }
}
