/**
 * Typing _tag field value for the Config type.
 */
export const TAG_CONFIG = "config";

/**
 * Server configuration.
 */
export type Config = {
  /**
   * Indicates that this data structure is a Config type.
   */
  _tag: "config";
  
  /**
   * Port on which to run HTTP API.
   * Env key: GAME_DEALS_HTTP_PORT
   */
  httpPort: number;

  /**
   * Postgres database information.
   */
  db: DBConfig;

  /**
   * Secret key used to sign authentication tokens.
   * Env key: GAME_DEALS_AUTH_TOKEN_SECRET
   */
  authTokenSecret: string;
}

/**
 * Postgres database configuration.
 */
export type DBConfig = {
  /**
   * Network address of server, not including port or scheme.
   * Env key: GAME_DEALS_DB_HOST
   */
  host: string;

  /**
   * Network port on which server is listening.
   * Env key: GAME_DEALS_DB_PORT
   */
  port: number;

  /**
   * Name of identity with which to authenticate.
   * Env Key: GAME_DEALS_DB_USERNAME
   */
  username: string;

  /**
   * Authentication secret.
   * Env key: GAME_DEALS_DB_PASSWORD
   */
  password: string;

  /**
   * Name of database to connect to within server.
   * Env key: GAME_DEALS_DB_DATABASE
   */
  database: string;

  /**
   * If true migrations will automatically be run. Dangerous in production.
   * Env key: GAME_DEALS_DB_AUTO_MIGRATE
   *          If not empty sets to true.
   */
  synchronize: boolean;
}

export function EnvConfig(): Config {
  return {
    _tag: TAG_CONFIG,
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
