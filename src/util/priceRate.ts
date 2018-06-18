const config = process.env

export function getCurrencyPerSecond (): number {
  // TODO: add support to send information on what currency to use. Then again surely this depends on the moneyd uplink the host is using? Could malicious users lie about their currency?
  const secondsPerMonth = 2.628e6
  const currencyAssetScale = Number(config.hostAssetScale)
  const currencyPerMonth = Number(config.hostCostPerMonth) * Math.pow(10, currencyAssetScale)
  const currencyPerSecond = currencyPerMonth / secondsPerMonth
  return currencyPerSecond
}
