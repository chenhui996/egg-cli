'use strict'

module.exports = core

// require 支持的文件加载格式：.js/.json/.node
// .js   -> module.exports/exports
// .json -> JSON.parse
// .node -> process.dlopen (基本不用)
// .any  -> .js
const path = require('path')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const log = require('@egg-cli-dev/log')

const constant = require('./const') // 环境变量
const pkg = require('../package.json')

let args

async function core() {
  try {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    log.verbose('debug', 'test debug log')
    checkEnv()
    await checkGlobalUpdate()
  } catch (e) {
    log.error(e.message)
  }
}

// 检查是否需要进行全局更新 -> cli 版本
async function checkGlobalUpdate() {
  // 获取当前版本号和模块名
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 调用 npm API, 获取所有版本号 -> https://registry.npmjs.org/@egg-cli-dev/core
  // 提取所有版本号，比对哪些版本号是大于当前版本号
  // 获取最新的版本号，提示用户更新到该版本
  const {getNpmSemverVersion} = require('@egg-cli-dev/get-npm-info')
  const lastVersions = await getNpmSemverVersion(currentVersion, npmName)
  if (lastVersions && semver.gt(lastVersions, currentVersion)) {
    log.warn(
      '更新提示',
      colors.yellow(
        `请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${lastVersions}
更新命令： npm install -g ${npmName}`,
      ),
    )
  }
}

// 检查环境变量
function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    })
  }
  createDefaultConfig()
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  }

  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

// 检查入参
function checkInputArgs() {
  const minimist = require('minimist')
  args = minimist(process.argv.slice(2))
  checkArgs()
}

function checkArgs() {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose'
  } else {
    process.env.LOG_LEVEL = 'info'
  }
  log.level = process.env.LOG_LEVEL
}

// 检查用户主目录
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登陆用户主目录不存在'))
  }
}

// 检查 root 账户 -> 自动降级
function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}

// 检查 node 版本号
function checkNodeVersion() {
  const currentVersion = process.version // 获取当前版本号
  const lowestNodeVersion = constant.LOWEST_NODE_VERSION // 获取最低版本号
  // 比对校验版本号 -> semver
  if (!semver.gte(currentVersion, lowestNodeVersion)) {
    throw new Error(
      colors.red(`egg-cli 需要安装 v${lowestNodeVersion} 以上版本的 Node.js`),
    )
  }
}

// 检查版本号
function checkPkgVersion() {
  // console.log(pkg.version)
  // log.success('cli start test', 'test success...')
  log.notice('cli', pkg.version)
}
