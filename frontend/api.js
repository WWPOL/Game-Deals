/**
 * API client.
 * @property {function(msg)} showError Function which displays the error msg argument to the user.
 */
export default class API {
  /**
   * Create a new API client.
   * @param {function(msg)} showError Set showError prop.
   * @returns {API} New API client.
   */
  constructor(showError) {
    this.showError = showError;
  }

  /**
   * Make a HTTP API request.
   * @param {string} method HTTP method for request.
   * @param {string} path API endpoint to call.
   * @param {object} [body] API request data to encode as JSON. Pass undefined to not encode a body.
   * @param {object} [opts] Additional fetch options. The `method` field will always be overriden by the `method` argument. The `Content-Type` header and request `body` will be overriden if the `body` argument is provided.
   * @returns {Promise} Resolves with the response. Rejects with API errors.
   * @throws {Error} If an error occurs while making the API request.
   * @throws {EndpointError} If the API returned an error response.
   */
  async fetch(method, path, body, opts) {
    if (opts === undefined) {
      opts = {};
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

      // Ensure success result
      if (resp.status != 200) {
        const body = await resp.json();
        throw new EndpointError(body.error, body.error_code);
      }

      return resp;
    } catch(e) {
      throw new Error(`failed to make HTTP API request ${JSON.stringify(opts)}: ${e}`);
    }
  }

  /**
   * List game deals.
   * @param {number} offset List offset index.
   * @param {boolean} [expired] Include expired deals. Defaults to false.
   * @returns {Promise} Resolves with game deals array. Rejects with error.
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
        this.showError("sorry, something unexpected went wrong when trying to list game deals");
      }        
    }
  }

  /**
   * Get an admin.
   * @param {string} id ID of admin to retrieve.
   * @returns {Promise} Resolves with admin object.
   */
  async getAdmin(id) {
    try {
      const resp = await this.fetch("GET", `/api/v0/admin/${id}`);

      const body = await resp.json();
      
      return body.admin;
    } catch (e) {
      console.trace(`failed to retrieve admin by ID "${id}": ${e}`);
      
      if (e instanceof EndpointError) {
        this.showError(new FriendlyError(e.error));
      } else {
        this.showError("sorry, something unexpected happened while retrieving an admin's information");
      }
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
