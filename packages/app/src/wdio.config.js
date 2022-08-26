const { Wdio, Runner } = require(__dirname);

const wdio = new Wdio(process.env[Runner.CURRENT_SESSION_CONFIG_PATH_VAR_NAME]);
export const config = wdio.config;
