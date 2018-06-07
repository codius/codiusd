import * as childProcess from 'child_process'

export interface Options {
  swallowStdErr?: boolean,
  swallowStdOut?: boolean
}

export default function spawn (cmd: string, args: string[], options = {} as Options): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const spawned = childProcess.spawn(cmd, args)
    if (!options.swallowStdOut) {
      spawned.stdout.on('data', (d: string) => process.stdout.write(d))
    }
    if (!options.swallowStdErr) {
      spawned.stderr.on('data', (e: string) => process.stderr.write(e))
    }
    spawned.on('error', (e: Error) => reject(e))
    spawned.on('close', (code: number) => resolve(code))
  })
}
