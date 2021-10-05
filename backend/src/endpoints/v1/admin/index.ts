import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";

import { CreateAdmin } from "./create";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new CreateAdmin(ctx),
  ];
}
