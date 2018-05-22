import App from './services/App'
import * as reduct from 'reduct'
import { create as createLogger } from './common/log'
const log = createLogger('index')

if (require.main === module) {
  const app = reduct()(App)
  app.start()
    .catch(err => log.error(err))
}

export {
  App
}
