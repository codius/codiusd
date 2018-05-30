import * as level from 'level'
import { LevelUp } from 'levelup';
import { Injector } from 'reduct'
import Config from '../services/Config'

import { create as createLogger } from '../common/log'
const log = createLogger('CodiusDB')

const PEERS_KEY = 'codiusPeers'

export default class CodiusDB {
    private config: Config
    private db: LevelUp

    constructor (deps: Injector) {
        this.config = deps(Config)
        this.db = level(`${this.config.codiusRoot}/codius.db`)
    }

    // Peer methods
    async getPeers(): Promise<string[]> {
        return await this.loadValue(PEERS_KEY, [])
    }

    async savePeers(peers: string[]) {
        await this.saveValue(PEERS_KEY, peers)
    }

    async deletePeers() {
        await this.delete(PEERS_KEY)
    }

    // Save and Load serialized values
    async saveValue(key: string, value: any) {
        await this.set(key, JSON.stringify(value))
    }

    async loadValue(key: string, defaultValue?: any) {
        const value = await this.get(key)
        if (!value) {
            return defaultValue ? defaultValue : ""
        }
        return JSON.parse(value)
    }

    // Low Level Util
    private async get(key: string) {
        try {
            return await this.db.get(key)
        } catch (err) {
            if (!err.notFound) {
                throw err
            }
            return null
        }
    }

    private async set(key: string, data: string) {
        await this.db.put(key, data)
    }

    private async delete(key: string) {
        await this.db.del(key)
    }
}
