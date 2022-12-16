import * as E from "fp-ts/Either";
import * as T from "io-ts";

import {
  apiFetch,
} from "./fetch";

/**
* Exchange API admin user login credentials for an API authentication token. Optionally allows setting a new password in the process.
* @param username - Login name of admin.
* @param password - Plain text login password.
* @param new_password - A new password for the admin user to be set after login.
* @returns Resolves with left being an error and right being the API authentication token response.
*/
export async function login(
 username: string,
 password: string,
 new_password?: string,
) {
 return await this.fetch({
   method: "POST",
   path: "/api/v1/auth/login",
   respDecoder: T.type({
     auth_token: T.string,
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
