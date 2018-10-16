import { Injector } from 'reduct'
import { randomBytes } from 'crypto'
import Config from './Config'
import Ildcp from './Ildcp'
import * as path from 'path'
import spawn from '../util/spawn'

import { create as createLogger } from '../common/log'
const log = createLogger('Money')
const Connector = require('ilp-connector')

export default class Money {
  private config: Config
  private connector: any
  private ildcp: Ildcp

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.ildcp = deps(Ildcp)
  }

  async start () {

    // TODO: how many bytes to avoid collision on local machine
    // while not having a crazy long ILP address
    const secret = randomBytes(8).toString('hex')
    const plugin = this.config.ilpPlugin || 'ilp-plugin-btp'
    const options = this.config.ilpCredentials
      ? JSON.parse(this.config.ilpCredentials)
      : { server: `btp+ws://:${secret}@localhost:7768` }

    // TODO: use the codiusDB if connector allows for it
    const storePath = path.resolve(this.config.codiusRoot, 'connector.db')

    this.connector = Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'leveldown',
      storePath,
      initialConnectTimeout: 60000,
      env: prefixToEnv(this.ildcp.getAddress()),
      accounts: {
        parent: {
          relation: 'parent',
          plugin,
          assetCode: this.ildcp.getAssetCode(),
          assetScale: this.ildcp.getAssetScale(),
          sendRoutes: false,
          receiveRoutes: false,
          options
        },
        child: {
          relation: 'child',
          plugin: 'ilp-plugin-mini-balances',
          assetCode: this.ildcp.getAssetCode(),
          assetScale: this.ildcp.getAssetScale(),
          options: {
            wsOpts: {
              host: '169.254.77.68',
              port: '7768'
            }
          }
        }
      }
    })

    log.debug('establishing network interface for codius')
    await this.establishNetwork()

    log.debug('starting connector')
    await this.connector.listen()
  }

  async establishNetwork () {
    log.trace('creating codius0 bridge device')
    await spawn('ip', 'link add name codius0 type bridge'.split(' '))

    log.trace('bringing up codius0 bridge device')
    await spawn('ip', 'link set codius0 up'.split(' '))

    log.trace('assigning addr to codius0. ip=169.254.77.68')
    await spawn('ip', 'addr add dev codius0 169.254.77.68'.split(' '))
  }
}

function prefixToEnv (prefix: string): string {
  return prefix.startsWith('g.')
    ? 'production'
    : 'test'
}
