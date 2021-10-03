import { Request } from "express";
import {
  Optional,
  Some,
  None,
} from "../lib/optional";
import { Config } from "../config";
import { MkEndpointError } from "../endpoints/error";
import { User } from "../models/user";
import { jwtVerify } from "../encryption";

/**
 * Extract user authentication token from a request.
 * @param cfg - Application configuration.
 * @param req - Request.
 * @returns User if valid authentication information found in request, null if request is unauthenticated.
 */
export async function authenticateReq(cfg: Config, req: Request): Promise<Optional<User>> {
  // Get header
  const tokenStr = req.header("Authorization");
  if (tokenStr === undefined) {
    return None();
  }

  // Verify token
  const authToken = await (async function() {
    try {
      return await jwtVerify(cfg, tokenStr);
    } catch(e) {
      throw MkEndpointError({
        http_status: 401,
        error: "unauthorized",
      });
    }
  })();

  // Fetch user
  const authUser = await User.findOne({ id: authToken.sub });
  if (authUser === null) {
    throw MkEndpointError({
      http_status: 401,
      error: "unauthorized",
    });
  }

  return Some(authUser);
}
