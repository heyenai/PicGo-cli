const path = require('path')
const minimist = require('minimist')
const PicGo = require('picgo')

let argv = minimist(process.argv.slice(2))
let configPath = argv.c || argv.config || ''
if (configPath !== true && configPath !== '') {
  configPath = path.resolve(configPath)
} else {
  configPath = ''
}
const picgo = new PicGo(configPath)
picgo.registerCommands()

try {
  picgo.cmd.program.parse(process.argv)
} catch (e) {
  picgo.log.error(e)
  if (process.argv.includes('--debug')) {
    Promise.reject(e)
  }
}
