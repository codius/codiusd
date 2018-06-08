import { Injector } from 'reduct'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as crypto from 'crypto'
import Config from './Config'

import { create as createLogger } from '../common/log'
const log = createLogger('Secret')

export default class Secret {
  private config: Config
  private secretFile: string
  private secret: Buffer

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.secretFile = path.resolve(this.config.codiusRoot, 'secret')
  }

  async load () {
    if (await fs.pathExists(this.secretFile)) {
      log.debug(`reading secret from file. file=${this.secretFile}`)
      const contents = await fs.readFile(this.secretFile, 'utf8')
      this.secret = Buffer.from(contents, 'base64')
      return
    }

    this.secret = crypto.randomBytes(32)
    log.debug(`writing secret to file. file=${this.secretFile}`)
    await fs.writeFile(this.secretFile, this.secret.toString('base64'))
  }

  hmac (value: string) {
    if (!this.secret) {
      throw new Error('secret must be loaded first.')
    }

    return crypto.createHmac('sha256', this.secret)
      .update(value, 'utf8')
      .digest('hex')
  }
}
