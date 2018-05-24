// import axios from 'axios'
import { spawn } from 'child_process'
import tempy from 'tempy'
import fs from 'fs-extra'

export default class PodManager {
  async startPod (podSpec: object) {
    // TODO: switch this to an HTTP request
    // await axios('/pod/start', {
    //   method: 'post',
    //   socketPath: '/var/run/hyper.sock'
    // })

    const tmpFile = tempy.file({ extension: 'json' })
    await fs.writeJson(tmpFile, podSpec)

    const start = spawn('hyperctl', [
      'run', '--rm', '-p', tmpFile
    ])

    start.stdout.pipe(process.stderr)
    start.stderr.pipe(process.stderr)

    return new Promise((resolve, reject) => {
      start.on('close', code => {
        if (code) reject(new Error(`command failed. ` +
          `code=${code} `
          `command="hyperctl run --rm -p ${tmpFile}"`))
        resolve()
      })
    })
  }
}
