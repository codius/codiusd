
import { Injector } from 'reduct'
import Config from './Config'
import { create as createLogger } from '../common/log'
const ilpFetch = require('ilp-fetch')
const log = createLogger('SelfTest')
import * as WebSocket from 'ws'
const manifestJson = require('../util/self-test-manifest.json')
import axios from 'axios'
import * as crypto from 'crypto'
export default class SelfTest {
  private config: Config
  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  start () {
    if (!this.config.disableSelfTest) {
      this.run()
      .catch(err => log.error(err))
    } else {
      log.debug('Skipping self test')
    }
  }

  async run () {
    const duration = 300
    const host = this.config.publicUri
    try {
      const randomName = crypto.randomBytes(20).toString('hex')
      manifestJson['manifest']['name'] = randomName
      log.debug('manifestJson', manifestJson)
      let response = await ilpFetch(`${host}/pods?duration=${duration}`, {
        headers: {
          Accept: `application/codius-v1+json`,
          'Content-Type': 'application/json'
        },
        maxPrice: (this.config.hostCostPerMonth * Math.pow(10, this.config.hostAssetScale)).toString(),
        method: 'POST',
        body: JSON.stringify(manifestJson),
        timeout: 70000 // 1m10s
      })
      log.trace('ilpFetch Resp', response)
      if (this.checkStatus(response)) {
        // Maybe check status in 30 seconds interval twice.
        response = await response.json()
        const url = new URL(this.config.publicUri)
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve()
          }, 10000)
        })
        const webSocketPromise = new Promise(resolve => {
          const ws = new WebSocket(`wss://${response.manifestHash}.${url.host}`)
          ws.on('open', () => {
            log.debug('Web sockets are enabled')
          })

          ws.on('message', (message: string) => {
            let finalMessage = JSON.parse(message)
            if (finalMessage.websocketEnabled) {
              resolve()
            }
          })

          ws.on('error', (err: any) => {
            log.error('Error on connection for websockets', err)
            process.exit(1)
          })
        })

        const serverPromise = new Promise(async resolve => {
          try {
            const serverRes = await axios.get(`https://${response.manifestHash}.${url.host}`)
            const serverCheck = serverRes.data
            log.debug('Pod upload succeeded', serverCheck)
            if (serverCheck.imageUploaded) {
              // resolve promise
              resolve()
            }
          } catch (err) {
            log.error('Test contract not running', err)
            process.exit(1)
          }
        })
        const testPromises = await Promise.all([serverPromise, webSocketPromise])
          // Test that none of these promises are hanging for more than 60 seconds
          // Timeout is set so that the contract has time to be pulled.
        Promise.race([
          testPromises,
          new Promise((resolve, reject) => {
            let timeout = setTimeout(function () {
              clearTimeout(timeout)
              reject(new Error('Could not listen to server or websocket due to timeout'))
            }, 60000)
          })
        ])
        .then(() => {
          log.info('Codius host passed self test! Ready to accept contracts')
        })
        .catch(err => {
          log.error('Error occurred when accessing self-test contract ', err)
          process.exit(1)
        })
      } else {
        log.error(`Failed to upload contract due to: ${response.error}`)
        throw new Error(`Could not upload contract successfully due to: ${response.error}`)
      }
    } catch (err) {
      log.error('Upload Error', err)
      process.exit(1)
    }
  }

  checkStatus (response: any) {
    if (response && response.status) {
      const statusString = `${response.status}`
      if (statusString.startsWith('2')) {
        return true
      }
    }
    return false
  }
}
