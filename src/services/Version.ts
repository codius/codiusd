const pkg = require('../../package.json')

export default class Version {
  public getVersion () {
    return pkg.version
  }

  public get major {
    return pkg.version.split('.')[0]
  }

  public get minor {
    return pkg.version.split('.')[1]
  }

  public getImplementationName () {
    return 'Codiusd (JavaScript)'
  }
}
