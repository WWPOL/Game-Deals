/**
 * API client.
 * @property {function(msg)} showError Function which displays the error msg argument to the user.
 * @property {async function(action)} getAuth Function which returns an API authentication token. The action argument should be a user friendly description of requires authorization. If the user is not logged in this function should request login information from the user and use the login API endpoint to obtain an API authentication token.
 */
export class API {
  /**
   * Create a new API client.
   * @param {function(msg)} showError Set showError prop.
   * @param {async function(action)} getAuth Set getAuth property.
   * @returns {API} New API client.
   */
  constructor(showError, getAuth) {
    this.showError = showError;
    this.getAuth = getAuth;
  }

  /**
   * Make a HTTP API request.
   * @param {string} method HTTP method for request.
   * @param {string} path API endpoint to call.
   * @param {object} [body] API request data to encode as JSON. Pass undefined to not encode a body.
   * @param {object} [opts] Additional fetch options. The `method` field will always be overriden by the `method` argument. The `Content-Type` header and request `body` will be overriden if the `body` argument is provided. The __body_sensitive field can be set to true which will cause any error messages not to include the body. The "Authorization" header is censored by default.
   * @returns {Promise} Resolves with the response. Rejects with API errors.
   * @throws {Error} If an error occurs while making the API request.
   * @throws {EndpointError} If the API returned an error response.
   */
  async fetch(method, path, body, opts) {
    if (opts === undefined) {
      opts = {};
    }

    // Check __body_sensitive
    let bodySensitive = false;
    if (opts.__body_sensitive === true) {
      bodySensitive = true;
      delete opts.__body_sensitive;
    }

    // Set method
    opts.method = method;
    
    // Encode body
    if (body !== undefined) {
      if (opts.headers === undefined) {
        opts.headers = {};
      }

      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    // Make request
    try {
      const resp = await fetch(path, opts);

      // Censor body after request is made
      if (bodySensitive === true) {
        opts.body = "***censored***";
      }

      if (opts.headers !== undefined && opts.headers.Authorization !== undefined && opts.headers.Authorization.length > 0) {
        opts.headers.Authorization = "***censored***";
      }

      // Ensure success result
      if (resp.status == 401) {
        throw new UnauthorizedError(`options=${JSON.stringify(opts)}`);
      } else if (resp.status != 200) {
        const body = await resp.json();
        throw new EndpointError(body.error, body.error_code);
      }

      return resp;
    } catch(e) {
      throw new Error(`failed to make HTTP API request ${JSON.stringify(opts)}: ${e}`);
    }
  }

  /**
   * Exchange API admin user login credentials for an API authentication token. Optionally allows setting a new password in the process.
   * @param {string} username Login name of admin.
   * @param {string} password Plain text login password.
   * @param {string} [new_password] A new password for the admin user to be set after login.
   * @returns {Promise} Resolves with API authentication token, rejects with error.
   * @throws {Error} If login failed.
   */
  async login(username, password, new_password) {
    try {
      const resp = await this.fetch("POST", "/api/v0/login", { username, password, new_password }, { __body_sensitive: true });

      const body = await resp.json();

      return body.auth_token;
    } catch (e) {
      const censor = (value) => {
        if (value === undefined || value === null) {
          return value;
        }
        
        if (value.length > 0) {
          return "***censored***";
        }

        return "";
      };
      
      console.trace(`Failed to login for username="${username}", password=${censor(password)}, new_password=${censor(new_password)}, error=${e}`);

      if (e instanceof FriendlyError) {
        this.showError(`failed to login: ${e}`);
      } else {
        this.showError(`sorry, something unexpected happened when logging in as "${username}"`);
      }

      throw e;
    }
  }

  /**
   * List game deals.
   * @param {number} offset List offset index.
   * @param {boolean} [expired] Include expired deals. Defaults to false.
   * @returns {Promise} Resolves with game deals array. Rejects with error.
   * @throws {Error} If listing game deals fails.
   */
  async listGameDeals(offset, expired) {
    if (expired === undefined) {
      expired = false;
    }
    
    try {
      const resp = await this.fetch("GET", `/api/v0/game_deal?expired=${expired}`);

      const body = await resp.json();
      return body.game_deals;
    } catch (e) {
      console.trace(`Failed to list game deals: ${e}`);
      
      if (e instanceof EndpointError) {
        this.showError(new FriendlyError(e.error));
      } else {
        this.showError("sorry, something unexpected went wrong when trying to get a list game deals");
      }

      throw e;
    }
  }

  /**
   * Create a new game deal.
   * @param {GameDeal} deal The game deal to create.
   * @returns {Promise} Resolves with created game deal, rejects with error.
   * @throws {Error} If creating game deal fails.
   */
  async createGameDeal(deal) {
    const authToken = await this.getAuth();

    // Make API request
    try {
      const resp = await this.fetch("POST", "/api/v0/game_deal", { game_deal: deal }, {
        headers: {
          "Authorization": authToken,
        },
      });

      const body = await resp.json();

      return body.game_deal;
    } catch (e) {
      console.trace(`Failed to create a game deal=${JSON.stringify(deal)}, error=${e}`);
      
      if (e instanceof FriendlyError) {
        this.showError(e);
      } else {
        this.showError("sorry, something unexpected happened while create the new game deal");
      }

      throw e;
    }
  }

  /**
   * Get an admin.
   * @param {string} id ID of admin to retrieve.
   * @returns {Promise} Resolves with admin object.
   * @throws {Error} If getting the admin fails.
   */
  async getAdmin(id) {
    try {
      const resp = await this.fetch("GET", `/api/v0/admin/${id}`);

      const body = await resp.json();
      
      return body.admin;
    } catch (e) {
      console.trace(`failed to retrieve admin by ID "${id}": ${e}`);
      
      if (e instanceof FriendlyError) {
        this.showError(e);
      } else {
        this.showError("sorry, something unexpected happened while retrieving an admin's information");
      }

      throw e;
    }
  }
}

/**
 * An error which can be shown to the user. All other errors will be hidden behind a console.error call and a "internal error" message for the user.
 */
export class FriendlyError extends Error {
  /**
   * Creates a new FriendlyError.
   * @param {string} msg User friendly error message. Should not contain any jargon. This message will be transformed so that it always starts with a capital letter and ends with a period (or other punctuation if already present).
   * @returns {FriendlyError} New error to show to user.
   */
  constructor(msg) {
    // Capitalize first letter
    msg[0] = msg[0].toUpperCase();

    // Ensure ends with punctuation
    const endI = msg.length - 1;
    if ([".", "?", "!"].indexOf(msg[endI]) === -1) {
      msg += ".";
    }
    
    super(msg);
    this.name = "FriendlyError";
  }
}

/**
 * Indicates an API endpoint request returned an error response.
 * @property {string} error Contains a user friendly message.
 * @property {string} [error_code] Machine code for a specific condition which API clients are supposed to have knowledge of, it can be undefined if the server did not return one.
 */
export class EndpointError extends Error {
  /**
   * Create an EndpointError.
   * @param {string} error See error property.
   * @param {string} error_code See error_code property.
   * @returns {EndpointError} New error.
   */
  constructor(error, error_code) {
    super(`The API returned an error response: error=${error}, error_code=${error_code}`);
    this.name = "EndpointError";

    this.error = error;
    this.error_code = error_code;
  }
}

/**
 * Indicates the API client does not have permission to perform the specified action.
 */
export class UnauthorizedError extends EndpointError {
  /**
   * Creates a new UnauthorizedError.
   * @param {string} msg A short technical message about what was not authorized. 
   * @returns {UnauthorizedError} New error.
   */
  constructor(error, errorCode) {
    super(error, errorCode);

    this.name = "UnauthorizedError";
  }

  /**
   * Constructs a FriendlyError to show to the user.
   * @param {string} action A user friendly description of the action which was taking place.
   * @returns {FriendlyError} Describing what happened and how the user is unauthorized.
   */
  asFriendlyError(action) {
    return new FriendlyError(`you do not have permission to ${action}`);
  }
}
