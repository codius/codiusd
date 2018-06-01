import axios from 'axios'

import { create as createLogger } from '../common/log'
const log = createLogger('HyperClient')

export default class HyperClient {
  async getPodInfo (hash: string): Promise<object> {
    log.debug(`fetching pod info. id=${hash}`)

    const response = await axios('/pod/info', {
      method: 'get',
      socketPath: '/var/run/hyper.sock',
      responseType: 'json',
      params: {
        podName: hash
      }
    })

    return response.data
  }

  async getPodIP (hash: string): Promise<string> {
    const info = await this.getPodInfo(hash)
    log.info('Pod info!', info)
    const [ cidr ] = info['status']['podIP']
    const [ ip ] = cidr.split('/')
    return ip
  }
}
