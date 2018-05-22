module.exports = function (w) {
  return {
    files: [
      'src/**/*.ts'
    ],

    tests: [
      'test/**/*.test.ts'
    ],

    env: {
      type: 'node'
    }
  }
}
