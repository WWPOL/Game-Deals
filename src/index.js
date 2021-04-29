/**
 * Game Deals HTTP server.
 * 
 * The web frontend is server under path /.
 * The HTTP API is server under path /api/v0/. API requests use URL query parameters and JSON encoded bodies. API responses use JSON encoded bodies.
 * 
 * Data is stored in MongoDB in the "admins" and "game_deals" collections. Documents meet the ADMIN_SCHEMA and GAME_DEAL_SCHEMA respectively.
 */

const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const Ajv = require("ajv");
const ajv = new Ajv();

/**
 * The number of items which should be returned by queries.
 */
const QUERY_LIMIT = 20;

/**
 * Get the unix timestamp for the date.
 * @param date {Date} To convert.
 * @returns {integer}
 */
function unixTime(date) {
  return Math.floor(date.getTime() / 1000);
}

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
const ADMIN_SCHEMA = ajv.compile({
  type: "object",
  properties: {
    /**
     * Short unique login name.
     */
    username: { type: "string" },

    /**
     * Bcrypt password hash.
     */
    password_hash: { type: "string" },
  },
  required: [ "username", "password_hash" ],
  additionalProperties: false,
});

/*
 * Schema for a game deal.
 */
const GAME_DEAL_SCHEMA = ajv.compile({
  type: "object",
  properties: {
    /**
     * Author user ID.
     */
    author_id: { type: "string" },
    
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
});

class Server {
  /**
   * Initializes the server.
   * @param cfg {Config} Application configuration from CFG.
   */
  constructor(cfg) {
    this.cfg = cfg;

    this.dbClient = new MongoClient(this.cfg.mongoURI, { useUnifiedTopology: true });

    // Setup express HTTP API
    this.app = express();
    
    this.app.use(this.mwLog);
    
    this.app.get("/api/v0/health", this.epHealth);
    this.app.get("/api/v0/game_deal", this.epListGameDeals);

    // Initialize in init()
    this.db = null;
  }

  /**
   * Initialize server dependencies.
   */
  async init() {
    // Connect to MongoDB
    console.log(`Connecting to Mongo database "${this.cfg.mongoDBName}"`);
    
    try{
      await this.dbClient.connect();
    } catch(e) {
      throw `Error connecting to Mongo: ${e}`;
    }
    
    console.log("Connected to Mongo");

    const _db = this.dbClient.db(this.cfg.mongoDBName);
    this.db = {
      db: _db,
      admins: _db.collection("admins"),
      game_deals: _db.collection("game_deals"),
    };
  }

  /**
   * Tear down server dependencies.
   */
  deinit() {
    this.dbClient.close();
  }

  /**
   * Listen for HTTP API requests. 
   * @returns {Promise} Resolves when HTTP server closes.
   */
  async httpListen() {
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
   * Log requests and responses.
   */
  mwLog(req, res, next) {
    console.log(`${req.method} ${req.path}`);

    let startT = new Date();
    next();
    let endT = new Date();

    console.log(`${req.method} ${req.path} => ${res.statusCode} (${endT - startT}ms)`);
  }

  /**
   * Provide API status.
   * Request: GET
   * Response: 200 JSON:
   *   - ok (bool): Indicates if the API should be used.
   */
  epHealth(req, res) {
    res.json({
      ok: true,
    });
  }

  /**
   * List game deals.
   * Request: GET,  URL parameters:
   *   - offset (uint, optional, default 0): Game deals will be returned sorted by their start date. This parameter indicates the index of the first game deal to retrieve using this ordering.
   *   - expired (bool, optional, default false): If game deals which have expired should be retrieved.
   * Response: 200 JSON
   *   - game_deals (GameDeal[]): Array of game deals sorted by their start date. Maximum of QUERY_LIMIT items.
   *   - next_offset (int): Next offset value to provide to access the next page of results.
   */
  async epListGameDeals(req, res) {
    // URL query parameters
    const offset = req.query.offset || 0;
    const expired = req.query.offset || false;

    // Query
    let query = {};
    if (expired === false) {
      query["end_date"] = {
        $lte: unixTime(new Date()),
      };
    }
    
    const deals = await db.game_deals.find(query).skip(offset).limit(QUERY_LIMIT).toArray();

    res.json({
      game_deals: deals,
      next_offset: offset + QUERY_LIMIT,
    });
  }
}

// Start server
(async function() {
  const server = new Server(CFG);

  await server.init();

  await server.httpListen();

  server.deinit();
  
  console.log("Gracefully exiting");
})();
