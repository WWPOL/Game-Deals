import {
  EndpointCtx,
  EndpointHandler,
} from "../base";
import { HealthEndpoint } from "./health";
import {
  Endpoints as AuthEndpoints,
} from "./auth/";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new HealthEndpoint(ctx),
    ...AuthEndpoints(ctx),
  ];
}
