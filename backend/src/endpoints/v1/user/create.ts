import * as t from "io-ts";

import {
  EndpointCtx,
  BaseEndpoint,
} from "../../base";
import {
  EndpointRequest,
  DecoderParser,
} from "../../request";
import { JSONResponder } from "../../response";
import {
  MkEndpointError,
  ErrorCode,
} from "../../error";
import {
  passwordsCheckRequirements,
  passwordsHash,
} from "../../../encryption";
import { AuthorizationRequest } from "../../../authorization";
import {
  APIURI,
  DBResource,
} from "../../../models";
import {
  User,
  UserAction,
} from "../../../models/user";

/**
 * Create user request.
 */
const CreateUserReqShape = t.type({
  /**
   * The new user's username.
   */
  username: t.string,

  /**
   * The password the new user will login with for the first time. Tell them this password. The new user must then change this password.
   */
  invite_password: t.string,
});

type CreateUserReq = t.TypeOf<typeof CreateUserReqShape>;

/**
 * Create user response.
 */
type CreateUserResp = {
  /**
   * ID of the newly created user.
   */
  new_user_id: number;
};

/**
 * Create a user. Requires the new user to change their password after they first login.
 */
export class CreateUser extends BaseEndpoint<CreateUserReq> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "post",
      path: "/api/v1/user",
      bodyParserFactory: () => new DecoderParser(CreateUserReqShape),
    });
  }

  async authorization(req: EndpointRequest<CreateUserReq>): Promise<AuthorizationRequest[]> {
    return [
      {
        resourceURI: new APIURI(DBResource.User),
        actions: [ UserAction.Create ],
      },
    ];
  }
  
  async handle(req: EndpointRequest<CreateUserReq>): Promise<JSONResponder<CreateUserResp>> {
    const body = req.body();
    
    // Check the new password is allowed
    const newPwOk = passwordsCheckRequirements({
      username: body.username,
      password: body.invite_password,
    });
    if (newPwOk.ok === false) {
      throw MkEndpointError({
        http_status: 400,
        error: `failed to create new user: invite password is not allowed: ${newPwOk.error}`,
        error_code: ErrorCode.NotMeetPasswordRequirements,
      });
    }

    // Hash the password
    const pwHash = await passwordsHash(body.invite_password);

    // Insert user
    const user = new User()
    user.username = body.username;
    user.password_hash = pwHash;
    user.must_reset_password = true;
    
    await user.save();

    return new JSONResponder({
      new_user_id: user.id,
    });
  }
}
