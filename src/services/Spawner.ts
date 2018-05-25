import { Injector } from 'reduct'
import Config from './Config'
import { spawn } from 'child_process'

import { create as createLogger } from '../common/log'
const log = createLogger('PodManager')

export default class Spawner {
  private config: Config

  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  async spawn (cmd: string, args: Array<string>): Promise<void> {
    if (this.config.noop) {
      log.info(`spawn noop. ` +
        `cmd=${cmd} ` +
        `args=${JSON.stringify(args)}`)
      return
    }

    const start = spawn(cmd, args)    

    start.stdout.pipe(process.stderr)
    start.stderr.pipe(process.stderr)

    await new Promise((resolve, reject) => {
      start.on('close', code => {
        if (code) {
          reject(new Error(`command failed. ` +
            `code=${code} ` +
            `cmd=${cmd} ` +
            `args=${JSON.stringify(args)}`))
        }

        resolve()
      })
    })
  }
}
