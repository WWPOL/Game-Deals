import * as T from "io-ts";

import { apiFetch } from "./fetch";
import { DealC } from "./shapes";

/**
   * List game deals.
   * @param offset - List offset index.
   * @param expired - Include expired deals. Defaults to false.
   * @returns Resolves with game deals.
   */
 export async function listGameDeals(offset: number, expired: boolean=false) {
  return apiFetch({
    method: "GET",
    path: `/api/v1/deal?expired=${expired}`,
    respDecoder: T.type({
      deals: T.array(DealC),
      next_offset: T.number,
    }),
  });
}
