/**
 * Game Deals HTTP server.
 * 
 * The web frontend is server under path /.
 * The HTTP API is server under path /api/v0/. API requests use URL query parameters and JSON encoded bodies. API responses use JSON encoded bodies.
 * 
 * Data is stored in MongoDB in the "admins" and "game_deals" collections. Documents meet the ADMINS_SCHEMA and GAME_DEAL_SCHEMA respectively.
 */

import express from "express";
import { MongoClient } from "mongodb";
import Ajv from "ajv";

/**
 * Server configuration.
 */
const CFG = {
  /**
   * Port on which to run HTTP API.
   */
  httpPort: process.env.GAME_DEALS_HTTP_PORT || 8000,

  /**
   * URI used to connect to MongoDB.
   */
  mongoURI: process.env.GAME_DEALS_MONGO_URI || "mongodb://127.0.0.1/",

  /**
   * Name of MongoDB database in which to store data.
   */
  mongoDBName: process.env.GAME_DEALS_MONGO_DB_NAME || "dev-game-deals",
};

/**
 * Schema for an admin user.
 */


/*
 * Schema for a game deal.
 */
const GAME_DEAL_SCHEMA = {
  type: "object",
  properties: {
    /**
     * A unix timestamp of when the deal becomes available.
     */
    start_date: { type: "integer" },

    /**
     * A unix timestamp of when the deal expires.
     */
    end_date: { type: "integer" },

    /**
     * The game which the deal provides.
     */
    game: {
      type: "object",

      properties: {
        /**
         * Title of game.
         */
        name: { type: "string" },

        /**
         * URL to a cover image for the game.
         */
        image_url: { type: "string" },
      },
      required: [ "name", "image_url" ],
      additionalProperties: false,
    },

    /**
     * Link at which the game can be found using the deal. This cannot be an affiliate link which earns Game Deals money.
     */
    link: { type: "string" },

    /**
     * Price of the game which the deal provides. Set 0 if the game will be free.
     */
    price: { type: "integer" },
  },
  required: [ "start_date", "end_date", "game", "link", "price" ],
  additionalProperties: false,
};

// Connect to MongoDB
const dbClient = new MongoClient(CFG.mongoURI);

try {
  console.log(`Connecting to Mongo database "${CFG.mongoDBName}"`);
  await dbClient.connect();
} catch (e) {
  console.error(`Failed to connect to Mongo: ${e}`);
  process.exit(1);
}

const _db = dbClient.db(CFG.mongoDBName);
const db = {
  db: _db,
  admins: _db.collection("admins"),
  game_deals: _db.collection("game_deals"),
};

// Setup Express for HTTP API
const app = express();

// Log HTTP requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);

  let startT = new Date();
  next();
  let endT = new Date();

  console.log(`${req.method} ${req.path} => ${res.statusCode} (${endT - startT}ms)`);
});

/**
 * Provide API status.
 * Request: GET
 * Response: 200 JSON:
 *   - ok (bool): Indicates if the API should be used.
 */
app.get("/api/v0/health", (req, res) => {
  res.json({
    ok: true,
  });
});

/**
 * List game deals.
 * Request: GET with URL parameters:
 *   - offset (uint): Game deals will be returned sorted by their start date. This parameter indicates the index of the first game deal to retrieve using this ordering.
 *   - size (uint): Number of game deals to retrieve.
 * Response: 200 JSON
 *   - game_deals (GameDeal[]): Array of game deals sorted by their start date.
*/
app.get("/api/v0/game_deal", (req, res) => {
  
});

// Listen
app.listen(CFG.httpPort, () => {
  console.log(`HTTP API listening :${CFG.httpPort}`);
});

dbClient.close();

console.log("Gracefully exiting");
