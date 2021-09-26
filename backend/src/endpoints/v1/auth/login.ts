import * as t from "io-ts";
import {
  BaseEndpoint,
  HTTPMethod,
} from "../../base";
import {
  EndpointRequest,
  BodyParser,
  DecoderParser,
} from "../../request";
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
export class LoginEndpoint extends BaseEndpoint {
  bodyParser(): BodyParser<LoginReq> {
    return new DecoderParser(LoginReqShape);
  }

  method(): HTTPMethod {
    return "post";
  }

  path() {
    return "/api/v1/auth/login";
  }

  async handle(req: EndpointRequest<LoginReq>): Promise<JSONResponder<LoginResp>> {
    const body = req.body();
    
    console.log("users=", await User.find());

    return new JSONResponder(200, { auth_token: "123" });

    // // Get user
    // let user = null;
    // try {
    //   user = await this.db.admins.findOne({
    //     username: req.body.username,
    //   });
    // } catch (e) {
    //   console.trace(`Failed to retrieve a user: ${e}`);
    //   res.status(500).json({
    //     error: "internal error",
    //   });
    //   return;
    // }

    // if (user === null) {
    //   res.status(401).json({
    //     error: "unauthorized",
    //   });
    //   return;
    // }

    // // Check password
    // try {
    //   let passwordOk = await bcrypt.compare(req.body.password, user.password_hash)
    //   if (passwordOk === false) {
    //     res.status(401).json({
    //       error: "unauthorized",
    //     });
    //     return;
    //   }
    // } catch (e) {
    //   res.status(401).json({
    //     error: "unauthorized",
    //   });
    //   return;
    // }

    // // Set new password if needed
    // if (user.must_reset_password === true && req.body.new_password === undefined) {
    //   res.status(401).json({
    //     error: "user must reset their password before logging in",
    //     error_code: ERROR_CODES.must_reset_password,
    //   });
    //   return;
    // }

    // if (req.body.new_password !== undefined) {
    //   // Check the new password is allowed
    //   const newPwOk = passwordAllowed(req.body.new_password);
    //   if (newPwOk !== null) {
    //     res.status(400).json({
    //       error: `failed to set new password: ${newPwOk}`,
    //     });
    //     return;
    //   }

    //   // Hash the password
    //   let newPwHash = null;
    //   try {
    //     newPwHash = await bcrypt.hash(req.body.new_password, BCRYPT_SALT_ROUNDS);
    //   } catch (e) {
    //     console.trace(`Failed to hash new password: ${e}`);

    //     res.status(500).json({
    //       error: "internal error",
    //     });
    //     return;
    //   }

    //   // Save the new password
    //   try {
    //     await this.db.admins.updateOne({
    //       _id: user._id,
    //     }, {
    //       $set: {
    //         password_hash: newPwHash,
    //         must_reset_password: false,
    //       },
    //     });
    //   } catch (e) {
    //     console.trace(`Failed to set new password: ${e}`);
        
    //     res.status(500).json({
    //       error: "internal error",
    //     });
    //     return;
    //   }
    // }

    // // Generate authentication token
    // const token = await new Promise((resolve, reject) => {
    //   jwt.sign({
    //     aud: AUTH_TOKEN_AUDIENCE,
    //     iss: AUTH_TOKEN_AUDIENCE,
    //     sub: user._id,
    //   }, this.cfg.authTokenSecret, {
    //     algorithm: AUTH_TOKEN_JWT_ALGORITHM,
    //     expiresIn: '2w',
    //   }, (err, token) => {
    //     if (err !== undefined && err !== null) {
    //       reject(err);
    //       return;
    //     }

    //     resolve(token);
    //   });
    // });

    // res.json({
    //   auth_token: token,
    // });
  }
}
