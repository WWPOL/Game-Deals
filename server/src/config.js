"use strict";
exports.__esModule = true;
exports.EnvConfig = void 0;
function EnvConfig() {
    return {
        httpPort: process.env.GAME_DEALS_HTTP_PORT || 8000,
        db: {
            host: process.env.GAME_DEALS_DB_HOST || "postgres",
            port: process.env.GAME_DEALS_DB_PORT || 5432,
            user: process.env.GAME_DEALS_DB_USERNAME || "devgamedeals",
            password: process.env.GAME_DEALS_DB_PASSWORD || "devgamedeals",
            database: process.env.GAME_DEALS_DB_DATABASE || "devgamedeals",
            autoMigrate: process.env.GAME_DEALS_DB_AUTO_MIGRATE.length > 0 || false
        },
        authTokenSecret: process.env.GAME_DEALS_AUTH_TOKEN_SECRET || "thisisaverybadsecret"
    };
}
exports.EnvConfig = EnvConfig;
