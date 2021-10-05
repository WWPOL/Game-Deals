import * as t from "io-ts";
import { fromNullable } from 'io-ts-types/lib/fromNullable'
import { getConnection } from "typeorm";

import {
  BaseEndpoint,
  EndpointCtx,
  QUERY_LIMIT,
} from "../../base";
import {
  VoidParser,
  EndpointRequest,
  decodeQueryParams,
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
import { MkEndpointError } from "../../error";

/**
 * List deals endpoint response.
 */
type ListDealsResp = {
  /**
   * Array of game deals sorted by their start date. Maximum of QUERY_LIMIT items.
   */
  deals: Deal[];

  /**
   * Next offset value to provide to access the next page of results. Is -1 if this page is the last page of results.
   */
  next_offset: number;
};

/**
 * List deals endpoint query parameters.
 */
const ListDealsReqParamsShape = t.type({
  /**
   * Game deals will be returned sorted by their start date. This parameter indicates the index of the first game deal to retrieve using this ordering.
   */
  offset: fromNullable(t.number, 0),

  /**
   * If game deals which have expired should be retrieved.
   */
  expired: fromNullable(t.boolean, false),
});

type ListDealsReqParams = t.TypeOf<typeof ListDealsReqParamsShape>;

export class ListDeals extends BaseEndpoint<void> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "get",
      path: "/api/v1/deal",
      bodyParserFactory: () => VoidParser,
    });
  }

  async authorization(req: EndpointRequest<void>): Promise<AuthorizationRequest[]> {
    return [
      {
        resourceURI: new APIURI(DBResource.Deal, "/*"),
        actions: [ DealAction.Retrieve ],
      },
    ];
  }

  async handle(req: EndpointRequest<void>): Promise<JSONResponder<ListDealsResp>> {
    // URL query parameters
    const params = decodeQueryParams<ListDealsReqParams>({
      req,
      decoder: ListDealsReqParamsShape,
    });

    // Query
    const query = Deal.createQueryBuilder("deal");
    
    if (params.expired === false) {
      query.where("deal.end_date < :now", { now: new Date() });
    }

    const deals = await query.skip(params.offset).limit(QUERY_LIMIT).getMany();
    
    const nextOffset = deals.length < QUERY_LIMIT ? -1 : params.offset + QUERY_LIMIT;

    return new JSONResponder({
      deals: deals,
      next_offset: nextOffset,
    });
  }
}
