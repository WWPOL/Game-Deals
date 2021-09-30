import * as bcrypt from "bcrypt";
import * as dumbPasswords from "dumb-passwords";
import * as jwt from "jsonwebtoken";

import { Config } from "./config";

/**
 * Algorithm to use when signing JWT authentication tokens.
 */
export const AUTH_TOKEN_JWT_ALGORITHM = "HS256";

/**
 * Audience to use when signing JWT authentication tokens.
 */
export const AUTH_TOKEN_AUDIENCE = "game-deals";

/**
 * Number of rounds to salt passwords when hashing with bcrypt.
 */
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Sign a JWT token.
 * @param userID - The ID of the user for which the token will identify.
 */
export async function jwtSign(cfg: Config, userID: number): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign({
      aud: AUTH_TOKEN_AUDIENCE,
      iss: AUTH_TOKEN_AUDIENCE,
      sub: userID,
    }, cfg.authTokenSecret, {
      algorithm: AUTH_TOKEN_JWT_ALGORITHM,
      expiresIn: '2w',
    }, (err, token) => {
      if (err !== undefined && err !== null) {
        reject(err);
        return;
      }

      resolve(token);
    });
  });
}

/**
 * Use bcrypt to hash plaintext.
 * @param plaintext - Text to be hashed.
 * @returns Hashed plaintext.
 */
export async function passwordsHash(plaintext: string): Promise<string> {
  return await bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

/**
 * Check if a plaintext secret matches a hashed version.
 * @param plaintext - Secret to check.
 * @param hash - Hash which potentially equals secret.
 * @returns If plaintext secret matches hash.
 */
export async function passwordsCompare({
  plaintext,
  hash,
}: {
  readonly plaintext: string
  readonly hash: string
}): Promise<boolean> {
  return await bcrypt.compare(plaintext, hash);
}

/**
 * Determines if a password is allowed.
 * Doesn't allow passwords less than 8 characters or common passwords.
 * @param plainText Plain text password to check.
 * @returns The ok key indicates if password meets requirements, if it doens't then the error field indicates why.
 */
export function passwordsCheckRequirements(plainText: string): { ok: true } | { ok: false, error: string } {
  if (plainText.length < 8) {
    return {
      ok: false,
      error: "must be longer than 8 characters",
    };
  } else if (dumbPasswords.Check(plainText) === true) {
    const rate = dumbPasswords.RateOfUsage(plainText);
    const percent = (rate.frequency / 100000) * 100;
    return {
      ok: false,
      error: `this password is used in about ${percent}% of hacked accounts on the internet, please use something more secure`,
    };
  }

  return { ok: true };
}