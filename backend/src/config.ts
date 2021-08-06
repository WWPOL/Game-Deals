/**
 * Server configuration.
 */
export type Config = {
  /**
   * Port on which to run HTTP API.
   */
  httpPort: number;

  /**
   * Postgres database information.
   */
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    autoMigrate: boolean;
  };

  /**
   * Secret key used to sign authentication tokens.
   */
  authTokenSecret: string;
}

export function EnvConfig(): Config {
  return {
    httpPort: process.env.GAME_DEALS_HTTP_PORT || 8000,
    db: {
      host: process.env.GAME_DEALS_DB_HOST || "postgres",
      port: process.env.GAME_DEALS_DB_PORT || 5432,
      user: process.env.GAME_DEALS_DB_USERNAME || "devgamedeals",
      password: process.env.GAME_DEALS_DB_PASSWORD || "devgamedeals",
      database: process.env.GAME_DEALS_DB_DATABASE || "devgamedeals",
      autoMigrate: process.env.GAME_DEALS_DB_AUTO_MIGRATE.length > 0 || false,
    },
    authTokenSecret: process.env.GAME_DEALS_AUTH_TOKEN_SECRET || "thisisaverybadsecret",
  };
}
