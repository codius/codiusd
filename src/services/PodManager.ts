import axios from 'axios'

export default class PodManager {
  async startPod (podSpec: object) {
    await axios('/pod/start', {
      method: 'post',
      socketPath: '/var/run/hyper.sock'
    })
  }
}
