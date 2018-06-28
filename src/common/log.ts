import * as riverpig from 'riverpig'
import * as debug from 'debug'
import * as through2 from 'through2'
type LoggerConfig = riverpig.LoggerConfig

let outputStream = process.stdout
const logStream = through2()
logStream.pipe(outputStream)

export class Logger {
  river: any
  tracer: any

  constructor (namespace: string, config0?: LoggerConfig) {
    this.river = riverpig(namespace, config0)
    this.tracer = this.river.trace || debug(namespace + ':trace')
  }

  info (...msg: any[]): void {
    this.river.info(msg)
  }

  warn (...msg: any[]): void {
    this.river.warn(msg)
  }

  error (...msg: any[]): void {
    this.river.error(msg)
  }

  debug (...msg: any[]): void {
    this.river.debug(msg)
  }

  trace (...msg: any[]): void {
    this.tracer(msg)
  }
}

export const createRaw = (namespace: string): Logger => {
  return new Logger(namespace, {
    stream: logStream
  })
}
export const create = (namespace: string) => createRaw('codiusd:' + namespace)

export const setOutputStream = (newOutputStream: NodeJS.WriteStream) => {
  logStream.unpipe(outputStream)
  logStream.pipe(newOutputStream)
  outputStream = newOutputStream
}
