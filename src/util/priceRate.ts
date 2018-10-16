import BigNumber from 'bignumber.js'
import Config from '../services/Config'
import Ildcp from '../services/Ildcp'

export function getCurrencyPerSecond (config: Config, ildcp: Ildcp): BigNumber {
  // TODO: add support to send information on what currency to use. Then again surely this depends on the moneyd uplink the host is using? Could malicious users lie about their currency?
  const secondsPerMonth = new BigNumber(2.628e6)
  const currencyAssetScale = Number(ildcp.getAssetScale())
  const currencyPerMonth = new BigNumber(config.hostCostPerMonth).times(new BigNumber(10).pow(currencyAssetScale))
  const currencyPerSecond = currencyPerMonth.div(secondsPerMonth)
  return currencyPerSecond
}
