import { Injector } from 'reduct'
import { randomBytes } from 'crypto'
import Config from './Config'
import * as path from 'path'
import * as ILDCP from 'ilp-protocol-ildcp'
import spawn from '../util/spawn'

import { create as createLogger } from '../common/log'
const log = createLogger('Money')
const makePlugin = require('ilp-plugin')
const Connector = require('ilp-connector')

export default class Money {
  private config: Config
  private connector: any
  private port: number

  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  async start () {
    log.debug('fetching dcp information')
    const dcpPlugin = makePlugin()
    await dcpPlugin.connect()
    const info = await ILDCP.fetch(dcpPlugin.sendData.bind(dcpPlugin))

    // TODO: how many bytes to avoid collision on local machine
    // while not having a crazy long ILP address
    const secret = randomBytes(8).toString('hex')
    const plugin = process.env.ILP_PLUGIN || 'ilp-plugin-btp'
    const options = process.env.ILP_CREDENTIALS
      ? JSON.parse(process.env.ILP_CREDENTIALS)
      : { server: `btp+ws://:${secret}@localhost:7768` }

    // TODO: use the codiusDB if connector allows for it
    const storePath = path.resolve(this.config.codiusRoot, 'connector.db')

    this.connector = Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'leveldown',
      storePath,
      initialConnectTimeout: 60000,
      env: prefixToEnv(info.clientAddress),
      accounts: {
        parent: {
          relation: 'parent',
          plugin,
          assetCode: info.assetCode,
          assetScale: info.assetScale,
          options
        },
        child: {
          relation: 'child',
          plugin: 'ilp-plugin-mini-balances',
          assetCode: info.assetCode,
          assetScale: info.assetScale,
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
    log.debug('creating codius0 bridge device')
    await spawn('ip', 'link add name codius0 type bridge'.split(' '))

    log.debug('bringing up codius0 bridge device')
    await spawn('ip', 'link set codius0 up'.split(' '))

    log.debug('assigning addr to codius0. ip=169.254.77.68')
    await spawn('ip', 'addr add dev codius0 169.254.77.68'.split(' '))
  }
}

function prefixToEnv (prefix: string): string {
  return prefix.startsWith('g.')
    ? 'production'
    : 'test'
}
