import { Injector } from 'reduct'
import Config from './Config'
import { SelfTestConfig } from '../schemas/SelfTestConfig'
import { SelfTestStats } from '../schemas/SelfTestStats'
import { create as createLogger } from '../common/log'
const ilpFetch = require('ilp-fetch')
const log = createLogger('SelfTest')
import * as WebSocket from 'ws'
const manifestJson = require('../util/self-test-manifest.json')
import axios from 'axios'
import * as crypto from 'crypto'
export default class SelfTest {
  public selfTestSuccess: boolean
  private uploadSuccess: boolean
  private httpSuccess: boolean
  private wsSuccess: boolean
  private running: boolean
  private config: Config
  private testConfig: SelfTestConfig

  constructor (deps: Injector) {
    this.config = deps(Config)
    this.selfTestSuccess = false
    this.uploadSuccess = false
    this.httpSuccess = false
    this.wsSuccess = false
    this.running = true
    this.testConfig = this.config.selfTestConfig
  }

  start () {
    if (!this.config.devMode) {
      this.run()
      .catch(err => {
        this.running = false
        log.error(err)
      })
    } else {
      this.running = false
      log.debug('Skipping self test')
    }
  }

  async retryFetch (count: number, manifestJson: object): Promise<any> {
    const duration = 300
    const host = this.config.publicUri
    const token = this.config.bearerToken
    let response = await ilpFetch(`${host}/pods?duration=${duration}`, {
      headers: {
        Accept: `application/codius-v1+json`,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      maxPrice: (this.config.hostCostPerMonth * Math.pow(10, this.config.hostAssetScale)).toString(),
      method: 'POST',
      body: JSON.stringify(manifestJson),
      timeout: 70000 // 1m10s
    })
    if (count > 1 && !this.checkStatus(response)) {
      await new Promise(resolve => {
        setTimeout(() => {
          resolve()
        }, this.testConfig.retryInterval)
      })
      return this.retryFetch(count - 1, manifestJson)
    } else {
      return response
    }
  }

  async run () {
    try {
      const randomName = crypto.randomBytes(20).toString('hex')
      manifestJson['manifest']['name'] = randomName
      log.debug('manifestJson', manifestJson)
      let response = await this.retryFetch(this.testConfig.retryCount, manifestJson)
      log.trace('ilpFetch Resp', response)
      if (this.checkStatus(response)) {
        log.info('Pod upload successful')
        // Maybe check status in 30 seconds interval twice.
        response = await response.json()
        const url = new URL(this.config.publicUri)
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve()
          }, this.testConfig.retryInterval)
        })

        // Wrap these in functions so we can resolve them later on.
        const serverPromise = () => {
          return new Promise(async (resolve, reject) => {
            try {
              const serverRes = await axios.get(`https://${response.manifestHash}.${url.host}`)
              const serverCheck = serverRes.data
              log.debug('Pod HTTP request succeeded', serverCheck)
              if (serverCheck.imageUploaded) {
                this.httpSuccess = true
                resolve()
              }
            } catch (err) {
              log.error('Test pod not reachable', err)
              this.selfTestSuccess = false
              this.httpSuccess = false
              reject(new Error('could not connect to pod over HTTP'))
            }
          })
        }

        const serverTimeoutPromise = () => {
          return new Promise((resolve, reject) => {
            let timeout = setTimeout(function () {
              clearTimeout(timeout)
              reject(new Error('could not connect to pod due to timeout'))
            }, 10000)
          })
        }

        log.info('Starting Pod HTTP Test...')
        for (let i = 0; i < this.testConfig.retryCount; i++) {
          try {
            await Promise.race([
              serverPromise(),
              serverTimeoutPromise()
            ])
            this.httpSuccess = true
            log.info('Codius Host Self Test successfully uploaded pod')
          } catch (err) {
            log.error('Error occurred while uploading self-test pod err=', err)
            await new Promise(resolve => {
              setTimeout(() => {
                resolve()
              }, this.testConfig.retryInterval)
            })
          }
          if (this.httpSuccess) {
            break
          }
        }

        const webSocketPromise = () => {
          return new Promise((resolve, reject) => {
            const ws = new WebSocket(`wss://${response.manifestHash}.${url.host}`)
            ws.on('open', () => {
              log.debug('Web sockets Pod received request')
            })

            ws.on('message', (message: string) => {
              let finalMessage = JSON.parse(message)
              if (finalMessage.websocketEnabled) {
                this.wsSuccess = true
                resolve()
              }
            })

            ws.on('error', (err: any) => {
              log.error('Error on connection for websockets', err)
              this.selfTestSuccess = false
              this.wsSuccess = false
              reject(new Error('could not connect to pod over websockets'))
            })
          })
        }

        const wsTimeoutPromise = () => {
          return new Promise((resolve, reject) => {
            let timeout = setTimeout(function () {
              clearTimeout(timeout)
              reject(new Error('could not upload pod to server due to websocket timeout'))
            }, 10000)
          })
        }

        log.info('Starting Websocket Test...')
        try {
          await Promise.race([
            webSocketPromise(),
            wsTimeoutPromise()
          ])
          this.wsSuccess = true
          log.info('Codius Host Self Test successfully tested WebSockets')
        } catch (err) {
          log.error('Error occurred while testing WebSockets err=', err)
        }

        this.selfTestSuccess = this.wsSuccess && this.uploadSuccess && this.httpSuccess
        this.running = false
        if (this.selfTestSuccess) {
          log.info('Self test successful:', this.selfTestSuccess, ' Upload succcess=', this.uploadSuccess, ' HTTP success=', this.httpSuccess, ' WebSocket success=', this.wsSuccess)
        } else {
          log.error('Self test failed: Upload Status=', this.uploadSuccess, ' Http Connection=', this.httpSuccess, ' WebSocket Connection=', this.wsSuccess)
          throw new Error('One or more components of Self Test have failed.')
        }
      } else {
        const resJson = await response.json()
        throw new Error(`Self Test failed. Could not upload pod successfully due to: ${resJson.error}`)
      }
    } catch (err) {
      log.error(err)
      this.running = false
      this.selfTestSuccess = false
      throw new Error('Self test failed: Upload Status=' + this.uploadSuccess + ' Http Connection=' + this.httpSuccess + ' WebSocket Connection=' + this.wsSuccess)
    }
  }

  checkStatus (response: any) {
    if (response && response.status) {
      const statusString = `${response.status}`
      if (statusString.startsWith('2')) {
        log.info('Pod upload returned %s', statusString)
        this.uploadSuccess = true
        return true
      }
    }
    log.error('Pod upload failed')
    return false
  }

  getTestStats (): SelfTestStats {
    return {
      selfTestSuccess: this.selfTestSuccess,
      uploadSuccess: this.uploadSuccess,
      httpSuccess: this.httpSuccess,
      wsSuccess: this.wsSuccess,
      running: this.running
    }
  }
}
