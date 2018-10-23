import { IldcpInfo } from '../schemas/IldcpInfo'
import * as ILDCP from 'ilp-protocol-ildcp'
import { Injector } from 'reduct'
import Config from './Config'

import { create as createLogger } from '../common/log'
const log = createLogger('ILDCP')
const makePlugin = require('ilp-plugin')

export default class Ildcp {
  private info: IldcpInfo
  private config: Config

  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  async init () {
    if (this.config.devMode) {
      this.info = this.config.devIldcp
    } else {
      log.debug('fetching dcp information')
      const dcpPlugin = makePlugin()
      await dcpPlugin.connect()
      this.info = await ILDCP.fetch(dcpPlugin.sendData.bind(dcpPlugin))
      await dcpPlugin.disconnect()
    }
  }

  public getAddress () {
    return this.info.clientAddress
  }

  public getAssetCode () {
    return this.info.assetCode
  }

  public getAssetScale () {
    return this.info.assetScale
  }
}
