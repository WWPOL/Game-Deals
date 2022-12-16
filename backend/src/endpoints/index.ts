import {
  EndpointCtx,
  EndpointHandler,
} from "./base";
import {
  Endpoints as V1Endpoints,
} from "./v1/";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    ...V1Endpoints(ctx),
  ];
}