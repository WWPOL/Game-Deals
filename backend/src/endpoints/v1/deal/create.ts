import * as t from "io-ts";
import * as tt from "io-ts-types";
import { DateFromUnixTime } from "io-ts-types/DateFromUnixTime";

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
  deal: t.type({
    /**
     * ID of the game involved in the deal.
     */
    game_id: t.number,

    // TODO: image_url, price

    /**
     * Start date of new deal.
     */
    start_date: DateFromUnixTime,

    /**
     * End date of the new deal.
     */
    end_date: DateFromUnixTime,
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
  deal: {
    id: number,
    author_id: number,
    start_date: Date,
    end_date: Date,
  };
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
    const game = await Game.findOne(body.deal.game_id);
    if (game === undefined) {
      throw MkEndpointError({
        http_status: 404,
        error: `Game with ID ${body.deal.game_id} does not exist`,
      });
    }

    const deal = new Deal();
    deal.author = unwrapPanic(req.user);
    deal.game = game;
    deal.start_date = body.deal.start_date;
    deal.end_date = body.deal.end_date;
    await deal.save();

    return new JSONResponder({
      deal: {
        id: deal.id,
        author_id: deal.author.id,
        start_date: deal.start_date,
        end_date: deal.end_date,
      },
    });
  }
}
