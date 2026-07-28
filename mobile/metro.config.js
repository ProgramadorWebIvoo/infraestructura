// Config de Metro para monorepo: `mobile/api.ts` importa `../packages/shared`,
// fuera de la raíz del proyecto (`mobile/`), que Metro no observa por defecto.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

module.exports = config;
