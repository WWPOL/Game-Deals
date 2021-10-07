import {
  EndpointCtx,
  EndpointHandler,
} from "../../base";

import { CreateUser } from "./create";
import { ListUsersNonSecure } from "./list-non-secure";

export function Endpoints(ctx: EndpointCtx): EndpointHandler<any>[] {
  return [
    new CreateUser(ctx),
    new ListUsersNonSecure(ctx),
  ];
}
