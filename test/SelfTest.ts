
import { Injector } from 'reduct'
import Config from '../src/services/Config'
import { create as createLogger } from '../src/common/log'
const ilpFetch = require('ilp-fetch')
const log = createLogger('SelfTest')
const WebSocket = require('ws')
const manifestJson = require('./self-test-manifest.json')

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
      const response = await ilpFetch(`${host}/pods?duration=${duration}`, {
        headers: {
          Accept: `application/codius-v1+json`,
          'Content-Type': 'application/json'
        },
        maxPrice: this.config.hostCostPerMonth,
        method: 'POST',
        body: JSON.stringify(manifestJson),
        timeout: 70000 // 1m10s
      })
      log.debug('ilpFetch Resp', response, response.body)
      if (this.checkStatus(response)) {
        // Maybe check status in 30 seconds interval twice.
        const url = new URL(this.config.publicUri)

        const webSocketPromise = new Promise(resolve => {
          log.debug('websock', `ws://${response.manifestHash}.${url.host}/websockets`)
          const ws = new WebSocket(`ws://${response.manifestHash}.${url.host}/websockets`)
          ws.on('open', () => {
            console.log('Connection went through!')
          })
          ws.on('message', (message: string) => {
            // resolve message if websocketEnabled is true.
            let finalMessage = JSON.parse(message)
            if (finalMessage.websocketEnabled) {
              resolve()
            }
          })
        })

        const serverPromise = new Promise(async resolve => {
          const serverRes = await fetch(`https://${response.manifestHash}.${url.host}/server`)
          const serverCheck = await serverRes.json()
          log.debug('serverProm', serverCheck)
          if (serverCheck.imageUploaded) {
            // resolve promise
            resolve()
          }
        })
        const testPromises = await Promise.all([webSocketPromise, serverPromise])
        try {
          Promise.race([
            testPromises,
            new Promise((resolve, reject) => {
              let timeout = setTimeout(function () {
                clearTimeout(timeout)
                reject(new Error('Could not listen to server or websocket'))
              }, 60000)
            })
          ])
        } catch (e) {
          log.debug('Server or web socket Error', e)
        }

      } else {
        throw new Error(`Failed to upload contract due to: ${response.error}`)
      }
    } catch (e) {
      log.debug('Upload Error', e)
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
