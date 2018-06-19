import BigNumber from 'bignumber.js'
import Config from '../services/Config'
// const config = process.env
import { Injector } from 'reduct'

export function getCurrencyPerSecond (deps: Injector): number {
  const config = deps(Config)

  // TODO: add support to send information on what currency to use. Then again surely this depends on the moneyd uplink the host is using? Could malicious users lie about their currency?
  const secondsPerMonth = 2.628e6
  const currencyAssetScale = config.hostAssetScale
  const currencyPerMonth = config.hostCostPerMonth * Math.pow(10, currencyAssetScale)
  const currencyPerSecond = currencyPerMonth / secondsPerMonth
  return currencyPerSecond
}
