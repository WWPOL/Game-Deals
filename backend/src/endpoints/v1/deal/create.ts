import * as T from "io-ts";
import * as ET from "io-ts-types";

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
  TDealC,
  DealAction,
} from "../../../models/deal";
import { Game } from "../../../models/game";
import { unwrapPanic } from "../../../lib/optional";
import { MkEndpointError } from "../../error";

/**
 * Create game deal request.
 */
const CreateDealReqShape = T.type({
  /**
   * Information about the new game deal.
   */
  deal: T.type({
    game_id: T.number,
    image_url: T.union([T.null, T.string]),
    link: T.string,
    price: T.number,
    start_date: ET.DateFromISOString,
    end_date: ET.DateFromISOString,
  }),
});

type CreateDealReq = T.TypeOf<typeof CreateDealReqShape>;

/**
 * Create game deal response.
 */
type CreateDealResp = {
  /**
   * The created game deal.
   */
  deal: TDealC,
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
      deal: deal.toDealC(),
    });
  }
}
