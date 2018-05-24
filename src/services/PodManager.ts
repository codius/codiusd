// import axios from 'axios'
import { Injector } from 'reduct'
import { PodSpec } from '../schemas/PodSpec'
import { PodInfo } from '../schemas/PodInfo'
import { spawn } from 'child_process'
import PodDatabase from './PodDatabase'
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

  constructor (deps: Injector) {
    this.pods = deps(PodDatabase)
  }

  start () {
    this.run()
      .catch(err => log.error(err))
  }

  async run () {
    log.debug('monitoring for expired images')

    const expired = this.pods.getExpiredPods()
    log.debug('got expired pods. pods=' + JSON.stringify(expired))
    // TODO: delete these expired pods

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

    const start = spawn('hyperctl', [
      'run', '--rm', '-p', tmpFile
    ])

    start.stdout.pipe(process.stderr)
    start.stderr.pipe(process.stderr)

    await new Promise((resolve, reject) => {
      start.on('close', code => {
        if (code) {
          reject(new Error(`command failed. ` +
            `code=${code} ` +
            `command="hyperctl run --rm -p ${tmpFile}"`))
        }

        resolve()
      })
    })
  }
}
