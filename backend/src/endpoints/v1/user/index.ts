import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";

import { CreateUser } from "./create";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new CreateUser(ctx),
  ];
}
