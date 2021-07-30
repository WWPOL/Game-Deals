/**
 * Server configuration.
 */
export type Config {
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
  };

  /**
   * Name of MongoDB database in which to store data.
   */
  mongoDBName: string;

  /**
   * Secret key used to sign authentication tokens.
   */
  authTokenSecret: string;
}

export EnvConfig(): Config = {
  httpPort: process.env.GAME_DEALS_HTTP_PORT || 8000,
  mongoURI: process.env.GAME_DEALS_MONGO_URI || "mongodb://mongo",
  mongoDBName: process.env.GAME_DEALS_MONGO_DB_NAME || "dev-game-deals",
  authTokenSecret: process.env.GAME_DEALS_AUTH_TOKEN_SECRET || "thisisaverybadsecret",
};
