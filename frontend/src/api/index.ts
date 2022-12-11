import * as E from "fp-ts/Either";
import * as D from "io-ts/Decoder";

import {
  FriendlyError,
  EndpointError,
  UnauthorizedError,
} from "./errors";

import { login } from "./login";
import { listGameDeals } from "./list-game-deals";

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
   * Create a new game deal.
   * @param {GameDeal} deal The game deal to create.
   * @returns {Promise} Resolves with created game deal, rejects with error.
   * @throws {Error} If creating game deal fails.
   */
  async createGameDeal(deal) {
    const authToken = await this.getAuth();

    // Make API request
    try {
      const resp = await this.fetch("POST", "/api/v1/deals", { game_deal: deal }, {
        headers: {
          "Authorization": authToken,
        },
      });

      const body = await resp.json();

      return body.game_deal;
    } catch (e) {
      console.trace(`Failed to create a game deal=${JSON.stringify(deal)}, error=${e}`);
      
      if (e instanceof FriendlyError) {
        this.setError(e.toString());
      } else {
        this.setError("sorry, something unexpected happened while create the new game deal");
      }
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
}
