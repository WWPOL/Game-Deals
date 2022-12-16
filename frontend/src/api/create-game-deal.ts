import * as T from "io-ts";

import { apiFetch } from "./fetch";
import {
    DealC,
    Deal,
 } from "./shapes";

export const CreateGameDealRespC = T.type({
    deal: DealC,
});
export type CreateGameDealResp = T.TypeOf<typeof CreateGameDealRespC>;

/**
 * Create a new game deal.
 * @param deal - The game deal to create.
 * @returns Resolves with created game deal.
 */
 export async function createGameDeal(deal: Omit<Deal, "id" | "author_id">) {
    return apiFetch({
        method: "POST",
        path: "/api/v1/deals",
        respDecoder: CreateGameDealRespC,
        body: {
            deal,
        },
    });
  }
