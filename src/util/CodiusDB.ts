import { resolve as resolvePath } from 'path'
import { PodInfo } from '../schemas/PodInfo'
import { Manifest } from '../schemas/Manifest'
import levelup, { LevelUp } from 'levelup'
import leveldown from 'leveldown'
import memdown from 'memdown'
import encode from 'encoding-down'
import { Injector } from 'reduct'
import BigNumber from 'bignumber.js'
import Config from '../services/Config'
import streamToPromise = require('stream-to-promise')

const PEERS_KEY = 'codiusPeers'
const PODS_KEY = 'codiusPods'
const MANIFEST_KEY = 'codiusManifests'
const PROFIT_KEY = 'codiusProfit'

interface StreamData {
  key: string
  value: string
}

interface Asset {
  code: string
  scale: number
}

const legacyDefaultAsset = {
  code: 'XRP',
  scale: 6
}

function profitKey (assetCode: string, assetScale: number): string {
  if (assetCode === legacyDefaultAsset.code && assetScale === legacyDefaultAsset.scale) {
    return PROFIT_KEY
  }
  return PROFIT_KEY + ':' + assetCode + ':' + assetScale
}

function parseProfitKey (key: string): Asset {
  const keyParts = key.split(':')
  if (keyParts[0] !== PROFIT_KEY) {
    throw new Error('parseProfitKey invalid profit key for key=' + key)
  }
  if (keyParts.length === 1) {
    return legacyDefaultAsset
  } else if (keyParts.length !== 3) {
    throw new Error('parseProfitKey invalid profit key for key=' + key)
  } else {
    return {
      code: keyParts[1],
      scale: parseInt(keyParts[2], 10)
    }
  }
}

export default class CodiusDB {
  private config: Config
  private db: LevelUp

  constructor (deps: Injector) {
    this.config = deps(Config)

    let backend
    if (this.config.memdownPersist || this.config.devMode) {
      backend = memdown()
    } else {
      backend = leveldown(resolvePath(this.config.codiusRoot, 'codius.db'))
    }
    this.db = levelup(encode(backend, { valueEncoding: 'json' }))
  }

  // Manifest Methods
  async getManifest (hash: string): Promise<Manifest | void> {
    return this.get(MANIFEST_KEY + ':' + hash)
  }

  async saveManifest (hash: string, manifest: Manifest) {
    await this.saveValue(MANIFEST_KEY + ':' + hash, manifest)
  }

  async deleteManifest (hash: string) {
    await this.delete(MANIFEST_KEY + ':' + hash)
  }

  // Pod methods
  async getPods (): Promise<PodInfo[]> {
    return this.loadValue(PODS_KEY, [])
  }

  async savePods (pods: PodInfo[]) {
    await this.saveValue(PODS_KEY, pods)
  }

  async deletePods () {
    await this.delete(PODS_KEY)
  }

  // Peer methods
  async getPeers (): Promise<string[]> {
    return this.loadValue(PEERS_KEY, [])
  }

  async savePeers (peers: string[]) {
    await this.saveValue(PEERS_KEY, peers)
  }

  async deletePeers () {
    await this.delete(PEERS_KEY)
  }

  async getProfit (assetCode: string, assetScale: number): Promise<BigNumber> {
    const profit = await this.loadValue(profitKey(assetCode, assetScale), '0')
    return new BigNumber(profit)
  }

  async getProfits (): Promise<Object> {
    const profits = {}
    await this.createReadStream({
      gte: PROFIT_KEY,
      lt: PROFIT_KEY + ':~'
    }, function (data: StreamData) {
      const asset = parseProfitKey(data.key)
      if (!profits[asset.code]) {
        profits[asset.code] = {}
      }
      profits[asset.code][asset.scale.toString()] = new BigNumber(data.value)
    })
    return profits
  }

  async setProfit (assetCode: string, assetScale: number, _profit: BigNumber.Value): Promise<void> {
    const profit = new BigNumber(_profit)
    await this.saveValue(profitKey(assetCode, assetScale), profit.toString())
  }

  async deleteProfit (assetCode: string, assetScale: number): Promise<void> {
    await this.delete(profitKey(assetCode, assetScale))
  }

  async deleteProfits (): Promise<void> {
    const keys: string[] = []
    await this.createReadStream({
      gte: PROFIT_KEY,
      lt: PROFIT_KEY + ':~',
      values: false
    }, function (key: string) {
      keys.push(key)
    })
    for (let key of keys) {
      await this.delete(key)
    }
  }

  // Save and Load serialized values
  async saveValue (key: string, value: {}) {
    const existing = await this.get(key)
    if (existing) {
      if (typeof existing !== typeof value) {
        throw new TypeError('CodiusDB#saveValue unexpected existing type for key=' + key)
      }
      await this.delete(key)
    }
    await this.set(key, value)
  }

  async loadValue (key: string, defaultValue: {}) {
    const value = await this.get(key)
    if (!value) {
      return defaultValue
    }
    return value
  }

    // Low Level Util
  private async get (key: string) {
    try {
      return await this.db.get(key)
    } catch (err) {
      if (!err.notFound) {
        throw err
      }
      return null
    }
  }

  private async set (key: string, data: {}) {
    await this.db.put(key, data)
  }

  private async delete (key: string) {
    await this.db.del(key)
  }

  private async createReadStream (options: {}, callback: (...args: any[]) => void): Promise<void> {
    const stream = this.db.createReadStream(options)
    stream.on('data', callback)
    await streamToPromise(stream)
  }
}
