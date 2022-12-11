import * as E from "fp-ts/Either";
import * as D from "io-ts/Decoder";

import {
  apiFetch,
  FetchError,
} from "./fetch";

interface LoginResp {
  auth_token: string,
}

/**
* Exchange API admin user login credentials for an API authentication token. Optionally allows setting a new password in the process.
* @param username - Login name of admin.
* @param password - Plain text login password.
* @param new_password - A new password for the admin user to be set after login.
* @returns Resolves with API authentication toke.
*/
export async function login(
 username: string,
 password: string,
 new_password?: string,
): Promise<E.Either<FetchError, LoginResp>> {
 return await this.fetch({
   method: "POST",
   path: "/api/v1/auth/login",
   respDecoder: D.struct({
     auth_token: D.string,
   }),
   body: {
     username,
     password,
     new_password,
   },
   opts: {
     bodySensitive: true,
   },
 });
}
