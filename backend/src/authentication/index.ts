import { Request } from "express";
import { User } from "../models/user";

/**
 * Extract user authentication token from a request.
 * @param req - Request
 * @returns User if valid authentication information found in request, null if request is unauthenticated.
 */
export async function authenticateReq(req: Request): Promise<User | null> {
  // TODO: Authentication
  return null;
}
