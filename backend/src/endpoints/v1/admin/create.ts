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
 * Create admin request.
 */
const CreateAdminReqShape = t.type({
  /**
   * The new admin user's username.
   */
  username: t.string,

  /**
   * The password the new user will login with for the first time. Tell them this password. The new user must then change this password.
   */
  invite_password: t.string,
});

type CreateAdminReq = t.TypeOf<typeof CreateAdminReqShape>;

/**
 * Create admin response.
 */
type CreateAdminResp = {
  /**
   * ID of the newly created user.
   */
  new_admin_id: number;
};

/**
 * Create an admin user. Requires the new user to change their password after they first login.
 */
export class CreateAdmin extends BaseEndpoint<CreateAdminReq> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "post",
      path: "/api/v1/admin",
      bodyParserFactory: () => new DecoderParser(CreateAdminReqShape),
    });
  }

  async authorization(req: EndpointRequest<CreateAdminReq>): Promise<AuthorizationRequest[]> {
    return [
      {
        resourceURI: new APIURI(DBResource.User),
        actions: [ UserAction.Create ],
      },
    ];
  }
  
  async handle(req: EndpointRequest<CreateAdminReq>): Promise<JSONResponder<CreateAdminResp>> {
    const body = req.body();
    
    // Check the new password is allowed
    const newPwOk = passwordsCheckRequirements({
      username: body.username,
      password: body.invite_password,
    });
    if (newPwOk.ok === false) {
      throw MkEndpointError({
        http_status: 400,
        error: `failed to create new admin: invite password is not allowed: ${newPwOk.error}`,
        error_code: ErrorCode.NotMeetPasswordRequirements,
      });
    }

    // Hash the password
    const pwHash = await passwordsHash(body.invite_password);

    // Insert admin user
    const user = new User()
    user.username = body.username;
    user.password_hash = pwHash;
    user.must_reset_password = true;
    
    await user.save();

    return new JSONResponder({
      new_admin_id: user.id,
    });
  }
}
