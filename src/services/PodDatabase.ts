import { PodInfo } from '../schemas/PodInfo'
import { create as createLogger } from '../common/log'
const log = createLogger('PodDatabase')

export default class PodDatabase {
  private pods: Map<string, PodInfo> = new Map()

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

  public addPod (info: PodInfo): void {
    log.debug('added pod. ' +
      `id=${info.id} ` +
      `running=${info.running} ` +
      `expiry=${info.expiry} ` +
      `now=${new Date().toISOString()}`)

    this.pods.set(info.id, info)
  }
}
