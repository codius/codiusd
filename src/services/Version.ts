const pkg = require('../../package.json')

export default class Version {
  public getVersion () {
    return pkg.version
  }

  public getImplementationName () {
    return 'Codiusd (JavaScript)'
  }
}
