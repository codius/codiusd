import * as childProcess from 'child_process'

export default function spawn (cmd: string, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const spawned = childProcess.spawn(cmd, args)
    spawned.stdout.on('data', (d: string) => process.stdout.write(d))
    spawned.stderr.on('data', (e: string) => process.stderr.write(e))
    spawned.on('error', (e: Error) => reject(e))
    spawned.on('close', (code: number) => resolve(code))
  })
}
