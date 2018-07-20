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

  info (msg: any, ...elements: any[]): void {
    this.river.info(msg, ...elements)
  }

  warn (msg: any, ...elements: any[]): void {
    this.river.warn(msg, ...elements)
  }

  error (msg: any, ...elements: any[]): void {
    this.river.error(msg, ...elements)
  }

  debug (msg: any, ...elements: any[]): void {
    this.river.debug(msg, ...elements)
  }

  trace (msg: any, ...elements: any[]): void {
    this.tracer(msg, ...elements)
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
