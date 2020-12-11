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
    let base64Image = row.base64Image || row.buffer.toString('base64');
    let hash = SHA1(base64Image).toString();
    row.fileName = hash + row.extname;
    
    return row;
  })
})

// hook
let picBed = picgo.config.picBed;
let type = picBed.uploader || picBed.current || '';
if (type == 'github' && picBed.github) {

  let { Octokit } = require('@octokit/rest');
  let uploader = picgo.helper.uploader.get('github');
  let {repo, branch, token, path, customUrl} = picBed.github;
  let [owner, repo2] = repo.split('/');
  let octokit = new Octokit({
    auth: token ? `token ${token}` : undefined
  });

  async function create(data) {
    try {
      let response = await octokit.repos.createOrUpdateFileContents(data);
      if (response.status == 201 || response.status == 200) {
        return response.data;
      } else {
        return !1;
      }
    } catch (e) {
      return !1;
    }
  }

  async function get(data) {
    let response = await octokit.repos.getContent(data);
    if(response.status == 200) {
      return response.data;
    } else {
      return !1;
    }
  }

  uploader.handle = async (ctx) => {
    try {
      let imgList = ctx.output;
      for (let img of imgList) {
        if (img.fileName && img.buffer) {
          let base64Image = img.base64Image || Buffer.from(img.buffer).toString('base64');
          let data = {
            owner,
            repo: repo2,
            path: path + encodeURI(img.fileName)
          };
          let resData = await create(Object.assign({
            message: 'Upload by PicGo CLI DIY',
            content: base64Image
          }, data)) || await get(data);
          if (resData) {
            delete img.base64Image;
            delete img.buffer;
            if (customUrl) {
              img.imgUrl = `${customUrl}/${path}${img.fileName}`;
            } else {
              img.imgUrl = resData.content.download_url || resData.download_url;
            }
          } else {
            throw new Error('Server error, please try again');
          }
        }
      }
      return ctx;
    } catch(e) {
      ctx.emit('notification', {
        title: '上传失败',
        body: '服务端出错，请重试'
      });
      throw e;
    }
  }

  picgo.helper.uploader.unregister('github') && picgo.helper.uploader.register('github', uploader);
}

try {
  picgo.cmd.program.parse(process.argv)
} catch (e) {
  picgo.log.error(e)
  if (process.argv.includes('--debug')) {
    Promise.reject(e)
  }
}
