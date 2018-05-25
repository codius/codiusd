// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import { PodInfo } from '../schemas/PodInfo'
import PodDatabase from './PodDatabase'
import Spawner from './Spawner'
import * as tempy from 'tempy'
import * as fs from 'fs-extra'

import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

const DEFAULT_INTERVAL = 5000
const PEERS_PER_QUERY = 5

function addDuration (duration: string, _date?: string): string {
  const date = _date || new Date().toISOString()
  return new Date(Number(new Date(date)) + Number(duration) * 1000)
    .toISOString()
}

export default class PodManager {
  private pods: PodDatabase
  private spawner: Spawner

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
    this.spawner = deps(Spawner)
  }

  start () {
    this.run()
      .catch(err => log.error(err))
  }

  async run () {
    log.debug('monitoring for expired images')

    const expired = this.pods.getExpiredPods()
    log.debug('got expired pods. pods=' + JSON.stringify(expired))

    await Promise.all(expired.map(async pod => {
      log.debug('cleaning up pod. id=' + pod)      
      return this.spawner.spawn('hyperctl', [ 'rm', pod ])
        .catch(e => log.error('cleanup error. error=' + e.message))
    }))

    setTimeout(this.run.bind(this), DEFAULT_INTERVAL)
  }

  async startPod (podSpec: PodSpec, duration: string) {
    // TODO: switch this to an HTTP request
    // await axios('/pod/start', {
    //   method: 'post',
    //   socketPath: '/var/run/hyper.sock'
    // })

    const existing = this.pods.getPod(podSpec.id)
    if (existing) {
      // TODO: check via hyper the code is still running
      existing.expiry = addDuration(duration, existing.expiry)
      return
    }

    this.pods.addPod({
      id: podSpec.id,
      running: true,
      expiry: addDuration(duration)
    })

    const tmpFile = tempy.file({ extension: 'json' })
    await fs.writeJson(tmpFile, podSpec)

    await this.spawner.spawn('hyperctl', [
      'run', '--rm', '-p', tmpFile
    ])
  }
}
