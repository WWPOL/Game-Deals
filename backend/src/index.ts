import * as express from "express";
import * as bodyParser from "body-parser";
import "reflect-metadata"; // For TypeORM
import { Connection as DBConnection } from "typeorm";
import {
  EnvConfig,
  Config,
} from "./config";
import { ConsoleLogger } from "./logger";
import { createDBConnection } from "./models";
import { AuthorizationClient } from "./authorization";
import { Endpoints } from "./endpoints";
import { wrapHandler } from "./endpoints/base";
import { passwordsHash } from "./encryption";
import { User } from "./models/user";

/**
 * The number of items which should be returned by queries.
 */
const QUERY_LIMIT = 20;

/**
 * @param date To convert.
 * @returns Unix timestamp for date.
 */
function unixTime(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Game Deals HTTP server.
 * 
 * # HTTP API
 * The HTTP API is server under path /api/v1/.
 * API requests use URL query parameters and JSON encoded bodies.
 * API responses use JSON encoded bodies.
 * 
 * If an API error occurs the "error" response field will contain a user friendly error. If it is an error which the API client is supposed to recognize and change its behavior based on, and the response HTTP code doesn't clearly indicate the problem (ex., like how "401 Anauthorized" is clear), the "error_code" field will be present (see ERROR_CODES for all relevant values).

 * Data is stored in Postgres, see the ./models module.
 */
class Server {
  /**
   * Server configuration values.
   */
  cfg: Config;

  /**
   * Database connection.
   */
  dbConn: null | DBConnection;

  /**
   * Authorization client.
   */
  authorizationClient: AuthorizationClient;

  /**
   * Base Express server.
   */
  app: express.Application;
  
  /**
   * Initializes the server.
   * @param {Config} cfg Application configuration from CFG.
   */
  constructor(cfg: Config) {
    this.cfg = cfg;
    this.dbConn = null;
    this.authorizationClient = new AuthorizationClient(this.cfg);

    // Setup express HTTP API
    this.app = express();

    this.app.use(bodyParser.json());

    const epCtx = {
      cfg: this.cfg,
      db: this.db,
      log: new ConsoleLogger("HTTP API"),
      authorizationClient: this.authorizationClient,
    };
    Endpoints(epCtx).forEach((handler) => {
      this.app[handler.method()](handler.path(), wrapHandler(epCtx, handler));
    });

    // this.app.get(
    //   "/api/v1/health",
    //   this.epHealth.bind(this));
    
    // this.app.post(
    //   "/api/v1/login",
    //   this.mwValidateBodyFactory(ajv.compile({
    //     type: "object",
    //     properties: {
    //       username: { type: "string" },
    //       password: { type: "string" },
    //       new_password: { type: "string" },
    //     },
    //     required: [ "username", "password" ],
    //     additionalProperties: false,
    //   })).bind(this),
    //   this.epLogin.bind(this));

    // this.app.post(
    //   "/api/v1/admin",
    //   this.mwAuthenticate.bind(this),
    //   this.mwValidateBodyFactory(ajv.compile({
    //     type: "object",
    //     properties: {
    //       username: { type: "string" },
    //       invite_password: { type: "string" },
    //     },
    //     required: [ "username", "invite_password" ],
    //     additionalProperties: false,
    //   })),
    //   this.epCreateAdmin.bind(this));
    
    // this.app.get(
    //   "/api/v1/game_deal",
    //   this.epListGameDeals.bind(this));

    // let createGameDealSchema = GAME_DEAL_SCHEMA;
    // delete createGameDealSchema.properties.author_id;
    // createGameDealSchema.required.splice(createGameDealSchema.required.indexOf("author_id"), 1);
    
    // this.app.post(
    //   "/api/v1/game_deal",
    //   this.mwAuthenticate.bind(this),
    //   this.mwValidateBodyFactory(ajv.compile({
    //     type: "object",
    //     properties: {
    //       game_deal: createGameDealSchema,
    //     },
    //     required: [ "game_deal" ],
    //     additionalProperties: false,
    //   })).bind(this),
    //   this.epCreateGameDeal.bind(this));

    // this.app.get("/api/v1/admin/:id", this.epGetAdmin.bind(this));
  }

  /**
   * Listen for HTTP API requests.
   * @returns Resolves when HTTP server closes.
   */
  async httpListen(): Promise<void> {
    // Start server
    console.log(`Opening HTTP API listener on :${this.cfg.httpPort}`);
    
    const server = this.app.listen(this.cfg.httpPort, () => {
      console.log("Listening for HTTP API");
    });

    return new Promise((resolve, reject) => {
      server.on("close", () => {
        resolve();
      });
    });
  }

  /**
   * Connects to database if not already connected.
   * @returns Database connection.
   */
  async db(): Promise<DBConnection> {
    if (this.dbConn === null) {
      this.dbConn = await createDBConnection(this.cfg);
    }

    return this.dbConn;        
  }

  /**
   * Initializes all authorization and authentication components.
   * Sets up authorization policies. 
   * Creates an initial admin user if one does not exist.
   */
  async initAuthAuth(): Promise<void> {
    // Setup authoriztion policies
    await this.authorizationClient.init();
    
    // Ensure at least an admin user exists
    await this.initAdmin();
  }

  /**
   * Initializes an admin user if none exists.
   */
  async initAdmin(): Promise<void> {
    const totalUsers = await User.count({});
    if (totalUsers === 0) {
      // Setup an initial admin user
      try {
        const admin = new User();
        admin.username = "admin";
        admin.password_hash = await passwordsHash("admin");
        admin.must_reset_password = true;
        
        await admin.save();
      } catch (e) {
        throw new Error(`Failed to insert initial admin user into database: ${e}`);
      }

      console.log("Inserted initial admin user with username \"admin\" and password \"admin\"");
    }
  }
}

// Start server
(async function() {
  const server = new Server(EnvConfig());

  // Call lazily initialized clients so we know if anything will fail immediately
  try {
    await server.db();
  } catch (e) {
    console.error(`Failed to connect to database`, e);
    return;
  }

  try {
    await server.initAuthAuth();
  } catch (e) {
    console.error(`Failed to setup authorization and authentication`, e);
    return;
  }

  // Run HTTP API
  try {
    await server.httpListen();
  } catch (e) {
    console.error(`Failed to start the HTTP API`, e);
    return;
  }
  
  console.log("Gracefully exiting");
})();
