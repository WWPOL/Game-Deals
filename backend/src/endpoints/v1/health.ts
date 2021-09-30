import {
  BaseEndpoint,
  EndpointCtx,
} from "../base";
import {
  BodyParser,
  VoidParser,
  EndpointRequest,
} from "../request";
import { JSONResponder } from "../response";
import {
  APIURI,
  APIURIResource,
  APIMetadataAction,
} from "../../models";
import { AuthorizationRequest } from "../../authorization";

/**
 * Health endpoint response.
 */
export type HealthResp = {
  /**
   * Indicates if the API should be used.
   */
  ok: boolean;
};

export class HealthEndpoint extends BaseEndpoint<void> {
  constructor(ctx: EndpointCtx) {
    super(ctx, {
      method: "get",
      path: "/api/v1/health",
      bodyParserFactory: () => VoidParser,
    });
  }

  authorization(req: EndpointRequest<void>): AuthorizationRequest[] {
    return [
      {
        resourceURI: new APIURI(APIURIResource.APIMetadata, "/health"),
        actions: [ APIMetadataAction.Retrieve ],
      },
    ];
  }

  async handle(req: EndpointRequest<void>): Promise<JSONResponder<HealthResp>> {
    return new JSONResponder(200, {
      ok: true,
    });
  }
}
