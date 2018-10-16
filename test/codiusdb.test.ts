import CodiusDB from '../src/util/CodiusDB'
import BigNumber from 'bignumber.js'
import chai = require('chai')
import * as reduct from 'reduct'

const assert = chai.assert

describe('CodiusDB', () => {

  let codiusdb: any
  beforeEach(() => {
    codiusdb = reduct()(CodiusDB)
  })

  it('should create an object', () => {
    assert.isObject(codiusdb)
  })

  describe('getProfit', () => {
    it('should return zero for no profit', async () => {
      const assetScale = 9
      const profit = await codiusdb.getProfit('XRP', assetScale)
      assert(profit.isEqualTo(new BigNumber(0)))
    })

    it('should return zero for no profit for particular asset', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(10))
      const profit = await codiusdb.getProfit('XRP', 9)
      assert(profit.isEqualTo(new BigNumber(0)))
    })

    it('should return zero for no profit for particular asset scale', async () => {
      await codiusdb.setProfit('XRP', 6, new BigNumber(10))
      const profit = await codiusdb.getProfit('XRP', 9)
      assert(profit.isEqualTo(new BigNumber(0)))
    })

    it('should get stored profit', async () => {
      const profit = new BigNumber(10)
      await codiusdb.setProfit('XRP', 9, profit)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })

    it('should only get stored profit for specified asset', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(10))
      const profit = new BigNumber(20)
      await codiusdb.setProfit('XRP', 9, profit)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })

    it('should only get stored profit for specified asset  & scale', async () => {
      await codiusdb.setProfit('XRP', 6, new BigNumber(10))
      const profit = new BigNumber(20)
      await codiusdb.setProfit('XRP', 9, profit)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })
  })

  describe('getProfits', () => {
    it('should return empty object for no profits', async () => {
      const profits = await codiusdb.getProfits()
      assert.deepEqual(profits, {})
    })

    it('should return stored profits for all assets', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(1))
      await codiusdb.setProfit('XRP', 6, new BigNumber(2))
      await codiusdb.setProfit('XRP', 9, new BigNumber(3))
      const profits = await codiusdb.getProfits()
      assert.deepEqual(profits, {
        USD: {
          '2': new BigNumber(1)
        },
        XRP: {
          '6': new BigNumber(2),
          '9': new BigNumber(3)
        }
      })
    })
  })

  describe('setProfit', () => {
    it('should store profit value', async () => {
      const profit = new BigNumber(10)
      await codiusdb.setProfit('XRP', 9, profit)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })

    it('should store profit value for specified asset', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(10))
      const profit = new BigNumber(20)
      await codiusdb.setProfit('XRP', 9, profit)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })

    it('should store profit value for specified asset scale', async () => {
      const profit6 = new BigNumber(10)
      await codiusdb.setProfit('XRP', 6, profit6)
      const profit9 = new BigNumber(20)
      await codiusdb.setProfit('XRP', 9, profit9)
      assert(profit6.isEqualTo(await codiusdb.getProfit('XRP', 6)))
      assert(profit9.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })

    it('should update profit value', async () => {
      await codiusdb.setProfit('XRP', 9, new BigNumber(10))
      const profitUp = new BigNumber(100)
      await codiusdb.setProfit('XRP', 9, profitUp)
      assert(profitUp.isEqualTo(await codiusdb.getProfit('XRP', 9)))
      const profitDown = new BigNumber(1)
      await codiusdb.setProfit('XRP', 9, profitDown)
      assert(profitDown.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })
  })

  describe('deleteProfit', () => {
    it('should accept unknown asset', async () => {
      await codiusdb.deleteProfit('XRP', 9)
    })

    it('should accept unknown asset scale', async () => {
      const profit = new BigNumber(10)
      await codiusdb.setProfit('XRP', 6, profit)
      await codiusdb.deleteProfit('XRP', 9)
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 6)))
    })

    it('should delete stored profit for specified asset & scale', async () => {
      const profit = new BigNumber(10)
      await codiusdb.setProfit('XRP', 6, profit)
      await codiusdb.setProfit('XRP', 9, profit)
      await codiusdb.deleteProfit('XRP', 9)
      assert(new BigNumber(0).isEqualTo(await codiusdb.getProfit('XRP', 9)))
      assert(profit.isEqualTo(await codiusdb.getProfit('XRP', 6)))
    })
  })

  describe('deleteProfits', () => {
    it('should allow no stored profits', async () => {
      await codiusdb.deleteProfits()
    })

    it('should delete all stored profits', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(10))
      await codiusdb.setProfit('XRP', 6, new BigNumber(20))
      await codiusdb.setProfit('XRP', 9, new BigNumber(30))
      await codiusdb.deleteProfits()
      const profitDeleted = new BigNumber(0)
      assert(profitDeleted.isEqualTo(await codiusdb.getProfit('USD', 2)))
      assert(profitDeleted.isEqualTo(await codiusdb.getProfit('XRP', 6)))
      assert(profitDeleted.isEqualTo(await codiusdb.getProfit('XRP', 9)))
    })
  })
})
