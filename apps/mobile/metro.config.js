const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

// Monorepo pnpm: watchFolders + nodeModulesPaths + symlinks, senão o Metro
// resolve o react-native (e outros pacotes) por dois caminhos diferentes
// (hoist da raiz vs. store simlinkado do pnpm) e carrega módulos duplicados
// — sintoma: "getDevServer is not a function (it is Object)" no device.
// https://docs.expo.dev/guides/monorepos/
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
config.resolver.unstable_enableSymlinks = true

module.exports = withNativeWind(config, { input: "./global.css" })
