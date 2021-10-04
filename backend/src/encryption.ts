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
 * A JSON web token.
 */
export type JWTToken = {
  /**
   * Audience, indicates by who the token is meant to be received.
   */
  aud: string;

  /**
   * Issuer, indicates who issued the token.
   */
  iss: string;

  /**
   * Subject, the user being identified by the token.
   */
  sub: number;
};

/**
 * Verify a JWT token is valid.
 * @param cfg - Application configuration.
 * @param tokenStr - The raw encoded JSON web token.
 * @returns Resolves with the decoded JSON web token. Rejects if there was an error authenticating the token.
 */
export async function jwtVerify(cfg: Config, tokenStr: string): Promise<JWTToken> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      tokenStr,
      cfg.authTokenSecret,
      {
        algorithms: [ AUTH_TOKEN_JWT_ALGORITHM ],
        audience: AUTH_TOKEN_AUDIENCE,
        issuer: AUTH_TOKEN_AUDIENCE,
      },
      (err, decoded) => {
        if (err !== undefined && err !== null) {
          reject(err);
          return;
        }

        resolve(decoded);
      });
  });
}

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
  } else if (dumbPasswords.check(plainText) === true) {
    const rate = dumbPasswords.rateOfUsage(plainText);
    const percent = (rate.frequency / 100000) * 100;
    return {
      ok: false,
      error: `this password is used in about ${percent}% of hacked accounts on the internet, please use something more secure`,
    };
  }

  return { ok: true };
}
