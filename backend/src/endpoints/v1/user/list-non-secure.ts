import * as t from "io-ts";
import { fromNullable } from "io-ts-types/lib/fromNullable";
import { IntFromString } from "io-ts-types/lib/IntFromString";

import {
  BaseEndpoint,
  EndpointCtx,
} from "../../base";
import {
  VoidParser,
  EndpointRequest,
  decodeQueryParams,
} from "../../request";
import { JSONResponder } from "../../response";
import {
  AuthorizationRequest,
} from "../../../authorization";
import {
  APIURI,
  DBResource,
} from "../../../models";
import {
  User,
  IUserNonSecure,
  UserAction,
} from "../../../models/user";

/**
 * List users request URL parameters.
 */
const ListUsersQueryParamsShape = t.type({
  /**
   * Identifier number of users to retrieve.
   * If not provided then all users are retrieved.
   */
  id: fromNullable(t.array(IntFromString), []),
});

/**
 * List users non-secure information response.
 */
type ListUsersResp = {
  /**
   * The users retrieved by the endpoint. Only non-secure data is included.
   */
  users: IUserNonSecure[],
};

/**
 * Retrieves non-secure information about user(s).
 * Results are sorted in ascending order by the user's ID.
 */
export class ListUsersNonSecure extends BaseEndpoint<void> {
  /**
   * IDs of users to retrieve. If none provided then retrieve all users.
   */
  listUserIDs: number[];
  
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "get",
      path: "/api/v1/user",
      bodyParserFactory: () => VoidParser,
    });

    this.listUserIDs = [];
  }

  async authorization(req: EndpointRequest<void>): Promise<AuthorizationRequest[]> {
    // Get IDs of users to retrieve
    const params = decodeQueryParams({
      req: req,
      decoder: ListUsersQueryParamsShape,
    });
    this.listUserIDs = params.id;

    if (this.listUserIDs.length > 0) {
      // Require specific permissions to access just the users specified
      return this.listUserIDs.map((id) => {
        return {
          resourceURI: new APIURI(DBResource.User, `/${id}`),
          actions: [ UserAction.RetrieveNonSecure ],
        };
      });
    }
    
    // If asking to view all users, then require this permission
    return [
      {
        resourceURI: new APIURI(DBResource.User, "/*"),
        actions: [ UserAction.RetrieveNonSecure ],
      },
    ]
  }

  async handle(req: EndpointRequest<void>): Promise<JSONResponder<ListUsersResp>> {
    const queryBuilder = User.createQueryBuilder("user");

    // If filtering by ID
    if (this.listUserIDs.length > 0) {
      queryBuilder.where("user.id IN (:...ids)", { ids: this.listUserIDs });
    }

    queryBuilder.orderBy("user.id");

    const users = await queryBuilder.getMany();
    
    return new JSONResponder({
      users: users.map((user) => user.toNonSecure()),
    });
  }
}
