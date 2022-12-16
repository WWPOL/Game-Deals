import * as T from "io-ts";

import { apiFetch } from "./fetch";
import { UserNonSecureC } from "./shapes";

/**
   * Get an admin.
   * @param ids - IDs of users to retrieve.
   * @returns Resolves with admin object.
   */
export async function listUsers(ids: number[]) {
  return apiFetch({
    method: "GET",
    path: "/api/v1/user",
    queryParams: {
      ids,
    },
    respDecoder: T.type({
      users: T.array(UserNonSecureC),
    }),
  });
}
