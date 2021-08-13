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
  db: DBConfig;

  /**
   * Secret key used to sign authentication tokens.
   */
  authTokenSecret: string;
}

export type DBConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}

export function EnvConfig(): Config {
  return {
    httpPort: parseInt(process.env.GAME_DEALS_HTTP_PORT) || 8001,
    db: {
      host: process.env.GAME_DEALS_DB_HOST || "postgres",
      port: parseInt(process.env.GAME_DEALS_DB_PORT) || 5432,
      username: process.env.GAME_DEALS_DB_USERNAME || "devgamedeals",
      password: process.env.GAME_DEALS_DB_PASSWORD || "devgamedeals",
      database: process.env.GAME_DEALS_DB_DATABASE || "devgamedeals",
      synchronize: process.env.GAME_DEALS_DB_AUTO_MIGRATE?.length > 0 || false,
    },
    authTokenSecret: process.env.GAME_DEALS_AUTH_TOKEN_SECRET || "thisisaverybadsecret",
  };
}
