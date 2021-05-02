const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongo = require("mongodb");
const Ajv = require("ajv");
const ajv = new Ajv();
const dumbPasswords = require("dumb-passwords");
const path = require("path");

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
 * Get the unix timestamp for the date.
 * @param {Date} date To convert.
 * @returns {integer}
 */
function unixTime(date) {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Determines if a password is allowed.
 * @param {string} plainText Plain text password to check.
 * @returns {string|null} String describing problem with password or null if password is ok.
 */
function passwordAllowed(plainText) {
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

  /**
   * Secret key used to sign authentication tokens.
   */
  authTokenSecret: process.env.GAME_DEALS_AUTH_TOKEN_SECRET || "thisisaverybadsecret",
};

/**
 * Schema for an admin user.
 */
const ADMIN_SCHEMA = {
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

    /**
     * If true then the next time the user logs in they must set a new password.
     */
    must_reset_password: { type: "boolean" },
  },
  required: [ "username", "password_hash" ],
  additionalProperties: false,
};

/*
 * Schema for a game deal.
 */
const GAME_DEAL_SCHEMA = {
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
};

/**
 * Game Deals HTTP server.
 * 
 * # Frontend
 * The web frontend is server under path /.
 *
 * # HTTP API
 * The HTTP API is server under path /api/v0/.
 * API requests use URL query parameters and JSON encoded bodies.
 * API responses use JSON encoded bodies.
 * 
 * If an API error occurs the "error" response field will contain a user friendly error. If it is an error which the API client is supposed to recognize and change its behavior based on, and the response HTTP code doesn't clearly indicate the problem (ex., like how "401 Anauthorized" is clear), the "error_code" field will be present (see ERROR_CODES for all relevant values).
 * 
 * Data is stored in MongoDB in the "admins" and "game_deals" collections. Documents meet the ADMIN_SCHEMA and GAME_DEAL_SCHEMA respectively.
 */
class Server {
  /**
   * Initializes the server.
   * @param {Config} cfg Application configuration from CFG.
   */
  constructor(cfg) {
    this.cfg = cfg;

    this.dbClient = new mongo.MongoClient(this.cfg.mongoURI, { useUnifiedTopology: true });

    // Setup express HTTP API
    this.app = express();

    this.app.use(this.mwLogReq);
    
    this.app.use(bodyParser.json());
    this.app.use(express.static("./dist"));
    
    this.app.use(this.mwLogRes); // Must be last
    
    this.app.get(
      "/api/v0/health",
      this.epHealth.bind(this));
    
    this.app.post(
      "/api/v0/login",
      this.mwValidateBodyFactory(ajv.compile({
        type: "object",
        properties: {
          username: { type: "string" },
          password: { type: "string" },
          new_password: { type: "string" },
        },
        required: [ "username", "password" ],
        additionalProperties: false,
      })).bind(this),
      this.epLogin.bind(this));

    this.app.post(
      "/api/v0/admin",
      this.mwAuthenticate.bind(this),
      this.mwValidateBodyFactory(ajv.compile({
        type: "object",
        properties: {
          username: { type: "string" },
          invite_password: { type: "string" },
        },
        required: [ "username", "invite_password" ],
        additionalProperties: false,
      })),
      this.epCreateAdmin.bind(this));
    
    this.app.get(
      "/api/v0/game_deal",
      this.epListGameDeals.bind(this));

    let createGameDealSchema = GAME_DEAL_SCHEMA;
    delete createGameDealSchema.properties.author_id;
    createGameDealSchema.required.splice(createGameDealSchema.required.indexOf("author_id"), 1);
    
    this.app.post(
      "/api/v0/game_deal",
      this.mwAuthenticate.bind(this),
      this.mwValidateBodyFactory(ajv.compile({
        type: "object",
        properties: {
          game_deal: createGameDealSchema,
        },
        required: [ "game_deal" ],
        additionalProperties: false,
      })).bind(this),
      this.epCreateGameDeal.bind(this));

    this.app.get("*", (req, res) => {
      res.sendFile(path.resolve("./dist/index.html"));
    });

    // Initialize this in init()
    this.initCalled = false;
    this.db = null;
  }

  /**
   * Initialize server dependencies.
   */
  async init() {
    this.initCalled = true;
    
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

    // Ensure at least one user has been setup
    const totalUsers = await this.db.admins.find({}).count();
    if (totalUsers === 0) {
      // Setup an initial admin user
      try {
        await this.db.admins.insertOne({
          username: "admin",
          password_hash: await bcrypt.hash("admin", BCRYPT_SALT_ROUNDS),
          must_reset_password: true,
        });
      } catch (e) {
        throw `Failed to insert initial admin user into database: ${e}`;
      }

      console.log("Inserted initial admin user with username \"admin\" and password \"admin\"");
    }
  }

  /**
   * Tear down server dependencies.
   */
  deinit() {
    this.dbClient.close();
  }

  /**
   * Listen for HTTP API requests. The init() method must be called before this.
   * @returns {Promise} Resolves when HTTP server closes.
   */
  async httpListen() {
    // Check init() called
    if (this.initCalled === false) {
      throw new Error("init() method must be called before server can start");
    }

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
  mwLogReq(req, res, next) {
    console.log(`${req.method} ${req.path}`);

    req.mwLogReqStartT = new Date();
    next();
  }

  /**
   * Log responses.
   */
  mwLogRes(req, res, next) {
    next()
    
    let endT = new Date();

    console.log(`${req.method} ${req.path} => ${endT - req.mwLogReqStartT}ms`);
  }

  /**
   * Factory which creates middleware that verifies a request body meets a JSON schema.
   * @param {Avj Compiled Schema} schema
   * @returns {function(req, res, next)} Middleware which responds with code 400 if the request body does not meet schema requirements.
   */
  mwValidateBodyFactory(schema) {
    return (req, res, next) => {
      const valid = schema(req.body);
      if (valid !== true) {
        let errsStr = schema.errors.map((e) => {
          let field = ".";
          if (e.instancePath.length > 0) {
            field = e.instancePath.toString().replace(/\//g, ".");
          }
          return `for JSON field "${field}": ${e.message}`;
        });
        
        res.status(400).json({
          error: `HTTP body does not meet schema requirements: ${errsStr}`,
        });
        return;
      }

      next();
    };
  }

  /**
   * Ensures the request contains a valid authentication token in the Authorization header. Sets the req.authUser field with the authenticated user and req.authToken with the authentication token. Responds with code 401 if no, or incorrect, authentication data was found.
   */
  async mwAuthenticate(req, res, next) {
    // Get header
    const tokenStr = req.header("Authorization");
    if (tokenStr === undefined) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Verify token
    try {
      req.authToken = await new Promise((resolve, reject) => {
        jwt.verify(
          tokenStr,
          this.cfg.authTokenSecret,
          {
            algorithms: [ AUTH_TOKEN_JWT_ALGORITHM ],
            audience: AUTH_TOKEN_AUDIENCE,
            issuer: AUTH_TOKEN_AUDIENCE,
          },
          (err, decoded) => {
            if (err !== undefined && err !== null) {
              reject(err);
              return;
            }

            resolve(decoded);
          });
      });
    } catch(e) {
      console.trace(`Error verifying JWT authentication token: ${e}`);
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Fetch user
    try {
      req.authUser = await this.db.admins.findOne({ _id: mongo.ObjectId(req.authToken.sub) });
      if (req.authUser === null) {
        res.status(401).json({
          error: "unauthorized",
        });
        return;
      }
    } catch (e) {
      console.trace(`Error retrieving user for authentication token, token.sub=${req.authToken.sub}, error: ${e}`);
      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    next();
  }
  
  /**
   * Provide API status.
   * # Request
   * GET
   * 
   * # Response
   * 200 JSON:
   *   - ok (bool): Indicates if the API should be used.
   */
  epHealth(req, res) {
    res.json({
      ok: true,
    });
  }

  /**
   * Login. Optionally change password.
   * # Request
   * POST, Body:
   *   - username (string)
   *   - password (string)
   *   - new_password (string, optional): If provided the user's password will be changed. This is required if the .must_reset_password field is true on the user.
   * 
   * # Response
   * 200, Body:
   *   - auth_token (string)
   */
  async epLogin(req, res) {
    // Get user
    let user = null;
    try {
      user = await this.db.admins.findOne({
        username: req.body.username,
      });
    } catch (e) {
      console.trace(`Failed to retrieve a user: ${e}`);
      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    if (user === null) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Check password
    try {
      let passwordOk = await bcrypt.compare(req.body.password, user.password_hash)
      if (passwordOk === false) {
        res.status(401).json({
          error: "unauthorized",
        });
        return;
      }
    } catch (e) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Set new password if needed
    if (user.must_reset_password === true && req.body.new_password === undefined) {
      res.status(401).json({
        error: "user must reset their password before logging in",
        error_code: ERROR_CODES.must_reset_password,
      });
      return;
    }

    if (req.body.new_password !== undefined) {
      // Check the new password is allowed
      const newPwOk = passwordAllowed(req.body.new_password);
      if (newPwOk !== null) {
        res.status(400).json({
          error: `failed to set new password: ${newPwOk}`,
        });
        return;
      }

      // Hash the password
      let newPwHash = null;
      try {
        newPwHash = await bcrypt.hash(req.body.new_password, BCRYPT_SALT_ROUNDS);
      } catch (e) {
        console.trace(`Failed to hash new password: ${e}`);

        res.status(500).json({
          error: "internal error",
        });
        return;
      }

      // Save the new password
      try {
        await this.db.admins.updateOne({
          _id: user._id,
        }, {
          $set: {
            password_hash: newPwHash,
            must_reset_password: false,
          },
        });
      } catch (e) {
        console.trace(`Failed to set new password: ${e}`);
        
        res.status(500).json({
          error: "internal error",
        });
        return;
      }
    }

    // Generate authentication token
    const token = await new Promise((resolve, reject) => {
      jwt.sign({
        aud: AUTH_TOKEN_AUDIENCE,
        iss: AUTH_TOKEN_AUDIENCE,
        sub: user._id,
      }, this.cfg.authTokenSecret, {
        algorithm: AUTH_TOKEN_JWT_ALGORITHM,
        expiresIn: '2w',
      }, (err, token) => {
        if (err !== undefined && err !== null) {
          reject(err);
          return;
        }

        resolve(token);
      });
    });

    res.json({
      auth_token: token,
    });
  }

  /**
   * Create an admin user. Requires the new user to change their password after they first login.
   * # Request
   * JSON body:
   *   - username (string): The new admin user's username.
   *   - invite_password (string): The password the new user will login with for the first time. Tell them this password. The new user must then change this password.
   * 
   * # Response
   * 200, Body:
   *   - new_admin_id (string): ID of the newly created user.
   */
  async epCreateAdmin(req, res) {
    // Check the new password is allowed
    const newPwOk = passwordAllowed(req.body.invite_password);
    if (newPwOk !== null) {
      res.status(400).json({
        error: `failed to create new admin: invite password is not allowed: ${newPwOk}`,
      });
      return;
    }

    // Hash the password
    let pwHash = null;
    try {
      pwHash = await bcrypt.hash(req.body.invite_password, BCRYPT_SALT_ROUNDS);
    } catch (e) {
      console.trace(`Failed to hash new admin's invite password: ${e}`);

      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    // Insert admin user
    const inserted = await this.db.admins.insertOne({
      username: req.body.username,
      password_hash: pwHash,
      must_reset_password: true,
    });

    res.json({
      new_admin_id: inserted.insertedId,
    });
  }

  /**
   * List game deals.
   * # Request
   * GET, URL parameters:
   *   - offset (uint, optional, default 0): Game deals will be returned sorted by their start date. This parameter indicates the index of the first game deal to retrieve using this ordering.
   *   - expired (bool, optional, default false): If game deals which have expired should be retrieved.
   * 
   * # Response
   * 200, Body:
   *   - game_deals (GameDeal[]): Array of game deals sorted by their start date. Maximum of QUERY_LIMIT items.
   *   - next_offset (int): Next offset value to provide to access the next page of results. Is -1 if this page is the last page of results.
   */
  async epListGameDeals(req, res) {
    // URL query parameters
    let offset = null;
    try {
      offset = Number(req.query.offset) || 0;
    } catch (e) {
      res.status(400).json({
        error: "\"offset\" query parameter must be a number",
      });
      return;
    }
    
    const expired = req.query.offset || false;

    // Query
    let query = {};
    if (expired === false) {
      query["end_date"] = {
        $lte: unixTime(new Date()),
      };
    }

    const allDealsCount = await this.db.game_deals.find(query).count();
    const deals = await this.db.game_deals.find(query).skip(offset).limit(QUERY_LIMIT).toArray();
    
    let next_offset = -1;
    const nextPageDealsCount = (allDealsCount - offset) - QUERY_LIMIT;
    if (nextPageDealsCount > 0) {
      next_offset = offset + deals.length;
    }

    res.json({
      game_deals: deals,
      next_offset: next_offset,
    });
  }

  /**
   * Create a game deal.
   * # Request
   * POST, Authenticated, Body:
   *   - game_deal (GameDeal): Game deal to create. Should not include the "author_id" field.
   * 
   * # Response
   * 200, Body:
   *   - game_deal (GameDeal): Created game deal with all fields.
   */
  async epCreateGameDeal(req, res) {
    let deal = req.body.game_deal;
    deal.author_id = req.authUser._id;
      
    const inserted = (await this.db.game_deals.insertOne(deal)).ops[0];

    res.json({
      game_deal: inserted,
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
