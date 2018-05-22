import * as riverpig from 'riverpig'
import * as through2 from 'through2'

let outputStream = process.stdout
const logStream = through2()
logStream.pipe(outputStream)

export interface Logger extends riverpig.Logger { }

export const createRaw = (namespace: string): Logger => {
  return riverpig(namespace, {
    stream: logStream
  })
}
export const create = (namespace: string) => createRaw('codiusd:' + namespace)

export const setOutputStream = (newOutputStream: NodeJS.WriteStream) => {
  logStream.unpipe(outputStream)
  logStream.pipe(newOutputStream)
  outputStream = newOutputStream
}
