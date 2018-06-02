import { resolve as resolvePath } from 'path'
import { PodInfo } from '../schemas/PodInfo'
import levelup, { LevelUp } from 'levelup'
import leveldown from 'leveldown'
import memdown from 'memdown'
import encode from 'encoding-down'
import { Injector } from 'reduct'
import Config from '../services/Config'

import { create as createLogger } from '../common/log'
const log = createLogger('CodiusDB')

const PEERS_KEY = 'codiusPeers'
const PODS_KEY = 'codiusPods'

export default class CodiusDB {
  private config: Config
  private db: LevelUp

  constructor (deps: Injector) {
    this.config = deps(Config)

    let backend
    if (this.config.memdownPersist) {
      backend = memdown()
    } else {
      backend = leveldown(resolvePath(this.config.codiusRoot, 'codius.db'))
    }
    this.db = levelup(encode(backend, { valueEncoding: 'json' }))
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

  // Save and Load serialized values
  async saveValue (key: string, value: {}) {
    const existing = await this.get(key)
    if (existing) {
      if (typeof existing !== typeof value) {
        throw TypeError
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
}
