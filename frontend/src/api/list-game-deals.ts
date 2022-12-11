import * as E from "fp-ts/Either";
import * as D from "io-ts/Decoder";

import {
  FetchError,
  apiFetch,
} from "./fetch";

/**
   * List game deals.
   * @param offset List offset index.
   * @param [expired] Include expired deals. Defaults to false.
   * @returns {Promise} Resolves with game deals array.
   */
 export async function listGameDeals(offset: number, expired?: boolean) {
  if (expired === undefined) {
    expired = false;
  }
  
  try {
    const resp = await this.fetch("GET", `/api/v1/deal?expired=${expired}`);

    const body = await resp.json();
    return body.game_deals;
  } catch (e) {
    console.trace(`Failed to list game deals: ${e}`);
    
    if (e instanceof EndpointError) {
      this.setError(new FriendlyError(e.error).toString());
    } else {
      this.setError("sorry, something unexpected went wrong when trying to get a list game deals");
    }
  }
}
