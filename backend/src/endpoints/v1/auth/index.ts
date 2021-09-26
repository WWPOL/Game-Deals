import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";
import { LoginEndpoint } from "./login";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new LoginEndpoint(ctx),
  ];
}
