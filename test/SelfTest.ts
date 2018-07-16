
import { Injector } from 'reduct'
import Config from '../src/services/Config'
import { create as createLogger } from '../src/common/log'
const ilpFetch = require('ilp-fetch')
const log = createLogger('SelfTest')
const WebSocket = require('ws')
const manifestJson = require('./self-test-manifest.json')
const axios = require('axios')
export default class SelfTest {
  private config: Config
  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  async start () {
    const duration = 300
    const host = this.config.publicUri
    try {
      log.debug('manifest', manifestJson)
      let response = await ilpFetch(`${host}/pods?duration=${duration}`, {
        headers: {
          Accept: `application/codius-v1+json`,
          'Content-Type': 'application/json'
        },
        maxPrice: (this.config.hostCostPerMonth * 1000000).toString(),
        method: 'POST',
        body: JSON.stringify(manifestJson),
        timeout: 70000 // 1m10s
      })
      log.debug('ilpFetch Resp', response)
      if (this.checkStatus(response)) {
        // Maybe check status in 30 seconds interval twice.
        response = await response.json()
        const url = new URL(this.config.publicUri)
        const webSocketPromise = new Promise(resolve => {
          const ws = new WebSocket(`wss://${response.manifestHash}.${url.host}/websockets`)
          ws.on('open', () => {
            log.debug('Connection went through!')
          })

          ws.on('message', (message: string) => {
            let finalMessage = JSON.parse(message)
            if (finalMessage.websocketEnabled) {
              resolve()
            }
          })

          ws.on('error', (err: any) => {
            log.debug('Error on connection for websockets', err)
            if (!this.config.disableSelfTest) {
              process.exit(1)
            }
          })
        })

        const serverPromise = new Promise(async resolve => {
          try {
            const serverRes = await axios.get(`https://${response.manifestHash}.${url.host}/server`)
            const serverCheck = serverRes.data
            log.debug('serverProm', serverCheck)
            if (serverCheck.imageUploaded) {
              // resolve promise
              resolve()
            }
          } catch (err) {
            log.error('Test contract not running')
            if (!this.config.disableSelfTest) {
              process.exit(1)
            }
          }
        })
        const testPromises = await Promise.all([serverPromise, webSocketPromise])
        try {
          // Test that none of these promises are hanging for more than 60 seconds
          // Timeout is set so that the contract has time to be pulled.
          setTimeout(() => {
            Promise.race([
              testPromises,
              new Promise((resolve, reject) => {
                let timeout = setTimeout(function () {
                  clearTimeout(timeout)
                  reject(new Error('Could not listen to server or websocket'))
                }, 60000)
              })
            ])
          }, 20000)
        } catch (e) {
          log.debug('Server or web socket Error', e)
          if (!this.config.disableSelfTest) {
            process.exit(1)
          }
        }

      } else {
        log.error(`Failed to upload contract due to: ${response.error}`)
        throw new Error(`Could not upload contract successfully due to: ${response.error}`)
      }
    } catch (e) {
      log.debug('Upload Error', e)
      if (!this.config.disableSelfTest) {
        process.exit(1)
      }
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
