import * as t from "io-ts";
import {
  timingSafeEqual,
} from "crypto";

import {
  passwordsCompare,
  passwordsHash,
  passwordsCheckRequirements,
  jwtSign,
} from "../../../encryption";
import {
  BaseEndpoint,
  EndpointCtx,
} from "../../base";
import {
  EndpointRequest,
  DecoderParser,
} from "../../request";
import {
  MkEndpointError,
  ErrorCode,
} from "../../error";
import { JSONResponder } from "../../response";
import { User } from "../../../models/user";

/**
 * Login endpoint request body shape.
 */
const LoginReqShape = t.type({
  username: t.string,
  password: t.string,

  /**
   * If provided the user's password will be changed. This is required if the .must_reset_password field is true on the user.
   */
  new_password: t.union([t.string, t.undefined]),
});
type LoginReq = t.TypeOf<typeof LoginReqShape>;

/**
 * Login response.
 */
type LoginResp = {
  /**
   * API authentication token.
   */
  auth_token: string;
}

/**
 * Login. Optionally change password.
 */
export class LoginEndpoint extends BaseEndpoint<LoginReq> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "post",
      path: "/api/v1/auth/login",
      bodyParserFactory: () => new DecoderParser(LoginReqShape),
    });
  }

  async handle(req: EndpointRequest<LoginReq>): Promise<JSONResponder<LoginResp>> {
    const body = req.body();
    
    // Get user
    let user = await User.findOne({
      username: body.username,
    });

    if (user === null) {
      throw MkEndpointError({
        http_status: 401,
        error: "unauthorized",
      });
    }

    // Check password
    const passwordOk = await passwordsCompare({
      plaintext: body.password,
      hash: user.password_hash,
    });
    if (passwordOk === false) {
      throw MkEndpointError({
        http_status: 401,
        error: "unauthorized",
      });
    }

    // Set new password if needed
    if (user.must_reset_password === true && body.new_password === undefined) {
      throw MkEndpointError({
        http_status: 401,
        error: "user must reset their password before logging in",
        error_code: ErrorCode.MustResetPassword,
      });
    }

    if (body.new_password !== undefined) {
      // Check the new password is allowed
      if (body.password.length === body.new_password.length && timingSafeEqual(Buffer.from(body.password), Buffer.from(body.new_password))) {
        throw MkEndpointError({
          http_status: 400,
          error: "failed to set new password: cannot be same as current",
        });
      }
      
      const newPwOk = passwordsCheckRequirements(body.new_password);
      if (newPwOk.ok === false) {
        throw MkEndpointError({
          http_status: 400,
          error: `failed to set new password: ${newPwOk.error}`,
        });
      }

      // Hash the password
      const newPwHash = await (async function() {
        try {
          return await passwordsHash(body.new_password);
        } catch (e) {
          this.log.error(`Failed to hash new password`, e);

          throw MkEndpointError({
            http_status: 500,
            error: "internal error",
          });
        }
      })();

      // Save the new password
      try {
        user.password_hash = newPwHash;
        user.must_reset_password = false;
        
        await user.save();
      } catch (e) {
        this.log.error(`Failed to set new password`, e);

        throw MkEndpointError({
          http_status: 500,
          error: "internal error",
        });
      }
    }

    // Generate authentication token
    const token = await jwtSign(this.cfg, user.id);

    return new JSONResponder(200, {
      auth_token: token,
    });
  }
}
