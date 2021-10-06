import {
  EndpointCtx,
  EndpointHandler,
} from "../base";
import { HealthEndpoint } from "./health";
import {
  Endpoints as AuthEndpoints,
} from "./auth/";
import {
  Endpoints as UserEndpoints,
} from "./user/";
import {
  Endpoints as DealEndpoints,
} from "./deal/";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new HealthEndpoint(ctx),
    ...AuthEndpoints(ctx),
    ...UserEndpoints(ctx),
    ...DealEndpoints(ctx),
  ];
}
