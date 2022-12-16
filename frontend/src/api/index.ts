import * as E from "fp-ts/Either";
import * as D from "io-ts/Decoder";

import {
  FriendlyError,
  EndpointError,
  UnauthorizedError,
} from "./errors";

import { login } from "./login";
import { listGameDeals } from "./list-game-deals";
import { createGameDeal } from "./create-game-deal";

export const ERROR_CODE_MUST_RESET_PASSWORD = "must_reset_password";

/**
 * API client.
 */
export class API {
  /**
   * Function which returns an API authentication token. The action argument should be a user friendly description of requires authorization. If the user is not logged in this function should request login information from the user and use the login API endpoint to obtain an API authentication token.
   */
  getAuth: () => Promise<string>;

  /**
   * Create a new API client.
   * @param {async function(action)} getAuth Set getAuth property.
   * @returns {API} New API client.
   */
  constructor(getAuth: () => Promise<string>) {
    this.getAuth = getAuth;
  }

  /**
   * Get an admin.
   * @param {string} id ID of admin to retrieve.
   * @returns {Promise} Resolves with admin object.
   * @throws {Error} If getting the admin fails.
   */
  async getAdmin(id) {
    try {
      const resp = await this.fetch("GET", `/api/v1/admin/${id}`);

      const body = await resp.json();
      
      return body.admin;
    } catch (e) {
      console.trace(`failed to retrieve admin by ID "${id}": ${e}`);
      
      if (e instanceof FriendlyError) {
        this.setError(e.toString());
      } else {
        this.setError("sorry, something unexpected happened while retrieving an admin's information");
      }
    }
  }
}

export default {
  login,
  listGameDeals,
  createGameDeal,
}
