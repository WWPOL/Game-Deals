import * as T from "io-ts";

import { apiFetch } from "./fetch";
import { UserNonSecureC } from "./shapes";

export const ListUsersRespC = T.type({
  users: T.array(UserNonSecureC),
});
export type ListUsersResp = T.TypeOf<typeof ListUsersRespC>;

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
    respDecoder: ListUsersRespC,
  });
}
