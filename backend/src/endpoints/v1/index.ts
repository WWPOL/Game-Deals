import {
  EndpointCtx,
  EndpointHandler,
} from "../base";
import { HealthEndpoint } from "./health";
import {
  Endpoints as AuthEndpoints,
} from "./auth/";
import {
  Endpoints as AdminEndpoints,
} from "./admin/";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new HealthEndpoint(ctx),
    ...AuthEndpoints(ctx),
    ...AdminEndpoints(ctx),
  ];
}
