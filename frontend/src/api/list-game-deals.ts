import * as T from "io-ts";

import { apiFetch } from "./fetch";
import { DealC } from "./shapes";

export const ListGameDealsRespC = T.type({
  deals: T.array(DealC),
  next_offset: T.number,
});
export type ListGameDealsResp = T.TypeOf<typeof 
ListGameDealsRespC>;

/**
   * List game deals.
   * @param offset - List offset index.
   * @param beforeStart - Include game deals which haven't started.
   * @param expired - Include expired deals.
   * @returns Resolves with game deals.
   */
 export async function listGameDeals(offset?: number, beforeStart?: boolean, expired?: boolean) {
  return await apiFetch({
    method: "GET",
    path: "/api/v1/deal",
    queryParams: {
      offset,
      beforeStart,
      expired,
    },
    respDecoder: ListGameDealsRespC,
  });
}
