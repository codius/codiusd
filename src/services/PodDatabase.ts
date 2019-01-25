import * as Boom from 'boom'
import { Injector } from 'reduct'
import { PodInfo } from '../schemas/PodInfo'
import CodiusDB from '../util/CodiusDB'
import BigNumber from 'bignumber.js'
import { create as createLogger } from '../common/log'
const log = createLogger('PodDatabase')

function addDuration (duration: string, _date?: string): string {
  const date = _date || new Date().toISOString()
  return new Date(Number(new Date(date)) + Number(duration) * 1000)
    .toISOString()
}

export interface AddPodParams {
  id: string,
  running: boolean,
  duration: string,
  pullPointer: string,
  memory: number
}

export default class PodDatabase {
  private pods: Map<string, PodInfo> = new Map()
  private codiusdb: CodiusDB

  constructor (deps: Injector) {
    this.codiusdb = deps(CodiusDB)
    this.loadPodsFromDB()
      .catch(err => log.error(err))
  }

  public getPod (id: string): PodInfo | void {
    return this.pods.get(id)
  }

  public async deletePod (id: string) {
    this.pods.delete(id)
    await this.savePodsToDB()
    log.debug(`deleted pod from db. id=${id}`)
  }

  public deletePods (pods: Array<string>): void {
    pods.map(pod => this.deletePod(pod))
  }

  public getExpiredPods (): Array<string> {
    const now = new Date()
    return Array.from(this.pods.values())
      .filter(p => {
        return now > new Date(p.expiry)
      })
      .map(p => p.id)
  }

  public getRunningPods (): Array<string> {
    return Array.from(this.pods.values())
      .filter(p => p.running)
      .map(p => p.id)
  }

  public async addDurationToPod (id: string, duration: string) {
    const info = this.pods.get(id)
    if (!info) {
      throw Boom.notFound('no pod found with id. id=' + id)
    }

    // TODO: be more economical with saving pods
    info.expiry = addDuration(duration, info.expiry)
    await this.savePodsToDB()

    log.debug('added duration to pod. ' +
      `id=${info.id} ` +
      `duration=${duration} ` +
      `expiry=${info.expiry}`)
  }

  public async setPodIP (id: string, ip: string) {
    const info = this.pods.get(id)
    if (!info) {
      throw Boom.notFound('no pod found with id. id=' + id)
    }

    info.ip = ip
    await this.savePodsToDB()

    log.trace('set pod ip. ' +
      `id=${id} ` +
      `ip=${ip}`)
  }

  public async setPodPort (id: string, port: string) {
    const info = this.pods.get(id)
    if (!info) {
      throw Boom.notFound('no pod found with id. id=' + id)
    }

    info.port = Number(port)
    await this.savePodsToDB()

    log.trace('set pod port. ' +
      `id=${id} ` +
      `port=${port}`)
  }

  public async addPod (params: AddPodParams) {
    const existing = this.pods.get(params.id)
    const uptime = ((existing && existing.totalUptime) || 0) + Number(params.duration)

    const info: PodInfo = {
      id: params.id,
      running: params.running,
      start: new Date().toISOString(),
      expiry: addDuration(params.duration),
      memory: params.memory,
      totalUptime: uptime,
      pullPointer: params.pullPointer
    }

    this.pods.set(info.id, info)
    await this.savePodsToDB()

    log.debug('added pod. ' +
      `id=${info.id} ` +
      `running=${info.running} ` +
      `duration=${params.duration} ` +
      `pullPointer=${params.duration} ` +
      `expiry=${info.expiry} ` +
      `memory=${info.memory} `)
  }

  public getLifetimePodsUptime (): BigNumber {
    let lifetimeUp = 0
    for (const value of this.pods.values()) {
      if (value.totalUptime) {
        lifetimeUp += Number(value.totalUptime)
      }
    }

    return new BigNumber(lifetimeUp)
  }

  private async savePodsToDB () {
    await this.codiusdb.savePods(Array.from(this.pods.values()))
  }

  private async loadPodsFromDB () {
    const podsFromDB = await this.codiusdb.getPods()
    log.debug(`Loading ${podsFromDB.length} pods from db...`)
    for (let pod of podsFromDB) {
      this.pods.set(pod.id, pod)
    }
  }
}
