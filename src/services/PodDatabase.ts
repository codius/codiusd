import { PodInfo } from '../schemas/PodInfo'
import { create as createLogger } from '../common/log'
const log = createLogger('PodDatabase')

export default class PodDatabase {
  private pods: Map<string, PodInfo> = new Map()

  public getPod (id: string): PodInfo | void {
    return this.pods.get(id)
  }

  public getExpiredPods (): Array<string> {
    const now = new Date()
    return Object.values(this.pods)
      .filter(p => now > new Date(p.expiry))
      .map(p => p.id)
  }

  public getRunningPods (): Array<string> {
    return Object.values(this.pods)
      .filter(p => p.running)
      .map(p => p.id)
  }

  public addPod (info: PodInfo): void {
    this.pods.set(info.id, info)
  }
}
