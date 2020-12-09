#!/usr/bin/env node
const path = require('path')
const minimist = require('minimist')
const PicGo = require('picgo')
const SHA1 = require('crypto-js/sha1')

let argv = minimist(process.argv.slice(2))
let configPath = argv.c || argv.config || ''
if (configPath !== true && configPath !== '') {
  configPath = path.resolve(configPath)
} else {
  configPath = ''
}
const picgo = new PicGo(configPath)
picgo.registerCommands()

// sha1哈希值重命名
picgo.on('beforeUpload', ctx => {
  ctx.output.map((row) => {
    let hash = SHA1(row.buffer).toString();
    row.fileName = hash + row.extname;
    
    return row;
  })
})

try {
  picgo.cmd.program.parse(process.argv)
} catch (e) {
  picgo.log.error(e)
  if (process.argv.includes('--debug')) {
    Promise.reject(e)
  }
}
