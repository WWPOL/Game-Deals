import * as express from "express";
import * as bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongo from "mongodb";
import Ajv from "ajv";
import dumbPasswords from "dumb-passwords";

import {
  EnvConfig,
  Config,
} from "./config";
import { Endpoints } from "./endpoints";
import { wrapHandler } from "./endpoints/base";

const ajv = new Ajv();

/**
 * The number of items which should be returned by queries.
 */
const QUERY_LIMIT = 20;

/**
 * Algorithm to use when signing JWT authentication tokens.
 */
const AUTH_TOKEN_JWT_ALGORITHM = "HS256";

/**
 * Audience to use when signing JWT authentication tokens.
 */
const AUTH_TOKEN_AUDIENCE = "game-deals";

/**
 * Number of rounds to salt passwords when hashing with bcrypt.
 */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Error codes returned by the API.
 */
const ERROR_CODES = {
  /**
   * Indicates the API client must reset their password before continuing.
   */
  must_reset_password: "must_reset_password",
};

/**
 * @param date To convert.
 * @returns Unix timestamp for date.
 */
function unixTime(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Determines if a password is allowed.
 * Doesn't allow passwords less than 8 characters or common passwords.
 * @param plainText Plain text password to check.
 * @returns String describing problem with password or null if password is ok.
 */
function passwordAllowed(plainText: string): string | null {
  if (plainText.length < 8) {
    return "must be longer than 8 characters";
  } else if (dumbPasswords.check(plainText) === true) {
    const rate = dumbPasswords.rateOfUsage(plainText);
    const percent = (rate.frequency / 100000) * 100;
    return `this password is used in about ${percent}% of hacked accounts on the internet, please use something more secure`;
  }

  return null;
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
 * 
 * Data is stored in MongoDB in the "admins" and "game_deals" collections. Documents meet the ADMIN_SCHEMA and GAME_DEAL_SCHEMA respectively.
 */
class Server {
  /**
   * Server configuration values.
   */
  cfg: Config;

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

    // this.dbClient = new mongo.MongoClient(this.cfg.mongoURI, { useUnifiedTopology: true });

    // Setup express HTTP API
    this.app = express();

    this.app.use(this.mwLog);
    this.app.use(bodyParser.json());

    Endpoints({
      cfg,
    }).forEach((handler) => {
      this.app[handler.method()](handler.path(), wrapHandler(handler));
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
   * Log requests. Sets req.mwLogReqStartT as the start time.
   */
  mwLog(req, res, next) {
    console.log(`${req.method} ${req.path}`);

    const startT = new Date().getTime();
    
    next();

    const endT = new Date().getTime();

    const dt = endT - startT;

    console.log(`${req.method} ${req.path} => ${dt}ms`);
  }
}

// Start server
(async function() {
  const server = new Server(EnvConfig());

  await server.httpListen();
  
  console.log("Gracefully exiting");
})();
