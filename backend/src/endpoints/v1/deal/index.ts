import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";

import { ListDeals } from "./list";

/**
 * @returns Game deal endpoints.
 */
export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new ListDeals(ctx),
  ];
}
