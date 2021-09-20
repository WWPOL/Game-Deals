import {
  EndpointCtx,
  EndpointHandler,
} from "./base";
import { HealthEndpoint } from "./health";

export function Endpoints(ctx: EndpointCtx): EndpointHandler[] {
  return [
    new HealthEndpoint(ctx),
  ];
}
