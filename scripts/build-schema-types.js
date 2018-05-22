'use strict'

const { readdirSync, writeFileSync} = require('fs')
const { resolve } = require('path')
const { compileFromFile } = require('json-schema-to-typescript')

// compile from file
;(async function () {
  const schemas = readdirSync(resolve(__dirname, '../src/schemas'))
  for (let schema of schemas) {
    if (!schema.endsWith('.json')) continue
    // Have to pass an empty options object, otherwise we trigger a bug where
    // the cwd for the JSON schema $ref resolver defaults to the current
    // working directory instead of the file's directory.
    let ts = await compileFromFile(resolve(__dirname, '../src/schemas/', schema), {})

    writeFileSync(resolve(__dirname, '../src/schemas/', schema.split('.')[0] + '.ts'), ts)
  }
})()
  .catch(err => console.error(err))
