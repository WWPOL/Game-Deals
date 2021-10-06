import * as t from "io-ts";
import * as tt from "io-ts-types";
import { date } from "io-ts-types/date";

import {
  BaseEndpoint,
  EndpointCtx,
} from "../../base";
import {
  DecoderParser,
  EndpointRequest,
} from "../../request";
import { JSONResponder } from "../../response";
import {
  AuthorizationRequest,
} from "../../../authorization";
import {
  APIURI,
  DBResource,
} from "../../../models";
import {
  Deal,
  DealAction,
} from "../../../models/deal";
import { Game } from "../../../models/game";
import { unwrapPanic } from "../../../lib/optional";
import { MkEndpointError } from "../../error";

/**
 * Create game deal request.
 */
const CreateDealReqShape = t.type({
  /**
   * Information about the new game deal.
   */
  game_deal: t.type({
    /**
     * ID of the game involved in the deal.
     */
    game_id: t.number,

    /**
     * Start date of new deal.
     */
    start_date: date,

    /**
     * End date of the new deal.
     */
    end_date: date,
  }),
});

type CreateDealReq = t.TypeOf<typeof CreateDealReqShape>;

/**
 * Create game deal response.
 */
type CreateDealResp = {
  /**
   * The created game deal.
   */
  deal: Deal,
};

/**
 * Create game deal.
 */
export class CreateDeal extends BaseEndpoint<CreateDealReq> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "post",
      path: "/api/v1/deal",
      bodyParserFactory: () => new DecoderParser(CreateDealReqShape),
    });
  }

  async authorization(): Promise<AuthorizationRequest[]> {
    return [
      {
        resourceURI: new APIURI(DBResource.Deal),
        actions: [ DealAction.Create ],
      },
    ];
  }

  async handle(req: EndpointRequest<CreateDealReq>): Promise<JSONResponder<CreateDealResp>> {
    const body = req.body();

    // Find game referred to in request
    const game = await Game.findOne(body.game_deal.game_id);
    if (game === null) {
      throw MkEndpointError({
        http_status: 404,
        error: `Game with ID ${body.game_deal.game_id} does not exist`,
      });
    }

    const deal = new Deal();
    deal.author = unwrapPanic(req.user);
    deal.game = game;
    deal.start_date = body.game_deal.start_date;
    deal.end_date = body.game_deal.end_date;
    await deal.save();

    return new JSONResponder({ deal });
  }
}
