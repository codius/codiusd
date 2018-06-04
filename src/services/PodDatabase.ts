import { Injector } from 'reduct'
import { PodInfo } from '../schemas/PodInfo'
import CodiusDB from '../util/CodiusDB'
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
  memory: number
}

export default class PodDatabase {
  private pods: Map<string, PodInfo> = new Map()
  private codiusdb: CodiusDB

  constructor (deps: Injector) {
    this.codiusdb = deps(CodiusDB)
    this.loadPodsFromDB()
  }

  public getPod (id: string): PodInfo | void {
    return this.pods.get(id)
  }

  public deletePod (id: string): void {
    this.pods.delete(id)
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

  public addDurationToPod (id: string, duration: string): void {
    const info = this.pods.get(id)
    if (!info) {
      throw new Error('no pod found with id. id=' + id)
    }

    info.expiry = addDuration(duration, info.expiry)

    log.debug('added duration to pod. ' +
      `id=${info.id} ` +
      `duration=${duration} ` +
      `expiry=${info.expiry}`)
  }

  public setPodIP (id: string, ip: string): void {
    const info = this.pods.get(id)
    if (!info) {
      throw new Error('no pod found with id. id=' + id)
    }

    info.ip = ip

    log.debug('set pod ip. ' +
      `id=${id} ` +
      `ip=${ip}`)
  }

  public setPodPort (id: string, port: string): void {
    const info = this.pods.get(id)
    if (!info) {
      throw new Error('no pod found with id. id=' + id)
    }

    info.port = Number(port)

    log.debug('set pod port. ' +
      `id=${id} ` +
      `port=${port}`)
  }

  public addPod (params: AddPodParams): void {
    const info: PodInfo = {
      id: params.id,
      running: params.running,
      expiry: addDuration(params.duration),
      memory: params.memory
    }

    this.pods.set(info.id, info)

    log.debug('added pod. ' +
      `id=${info.id} ` +
      `running=${info.running} ` +
      `duration=${params.duration} ` +
      `expiry=${info.expiry} ` +
      `memory=${info.memory} `)
  }

  private async loadPodsFromDB () {
    const podsFromDB = await this.codiusdb.getPods()
    log.debug(`Loading ${podsFromDB.length} pods from db...`)
    for (let pod of podsFromDB) {
      this.pods.set(pod.id, pod)
    }
  }
}
