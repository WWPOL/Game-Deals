import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";

import { ListDeals } from "./list";
import { CreateDeal } from "./create";

/**
 * @returns Game deal endpoints.
 */
export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new ListDeals(ctx),
    new CreateDeal(ctx),
  ];
}
