import { App } from '../src'
import chai = require('chai')
import chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
const assert = chai.assert

describe('App', function () {
  it('is a constructor', function () {
    assert.isFunction(App)
  })
})
