/**
 * API client.
 */
export default class API {
  constructor() {
  }

  /**
   * Make a HTTP API request.
   * @param method {string} HTTP method for request.
   * @param path {string} API endpoint to call.
   * @param body {object} API request data to encode as JSON. Pass undefined to not encode a body.
   * @param opts {object} Additional fetch options. The `method` field will always be overriden by the `method` argument. The `Content-Type` header and request `body` will be overriden if the `body` argument is provided.
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
      throw new Error(`failed to make HTTP API request ${opts}: ${e}`);
    }
  }

  /**
   * List game deals.
   * @param offset {number} List offset index.
   * @param expired {boolean} Include expired deals.
   * @returns {Promise} Resolves with game deals array. Rejects with error.
   * @throws {FriendlyError} If a problem occurs which can be explained to the user.
   * @throws {Error} If an error occurs which cannot be explained to the user.
   */
  async listGameDeals(offset, expired) {
    try {
      const resp = await this.fetch("GET", "/api/v0/game_deal");

      const body = await resp.json();
      return body.game_deals;
    } catch (e) {
      console.trace(`Failed to list game deals: ${e}`);
      
      if (e instanceof EndpointError) {
        throw FriendlyError(e.error);
      } else {
        throw e;
      }        
    }
  }
}

/**
 * An error which can be shown to the user. All other errors will be hidden behind a console.error call and a "internal error" message for the user.
 */
export class FriendlyError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "FriendlyError";
  }
}

/**
 * Indicates an API endpoint request returned an error response. The `error` field contains a user friendly message. The `error_code` field is a machine code for a specific condition which API clients are supposed to have knowledge of, it can be undefined.
 */
export class EndpointError extends Error {
  constructor(error, error_code) {
    super(`The API returned an error response: error=${error}, error_code=${error_code}`);
    this.name = "EndpointError";

    this.error = error;
    this.error_code = error_code;
  }
}
