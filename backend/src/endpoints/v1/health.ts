import {
  BaseEndpoint,
  HTTPMethod,
} from "../base";
import {
  BodyParser,
  VoidParser,
  EndpointRequest,
} from "../request";
import { JSONResponder } from "../response";

/**
 * Health endpoint response.
 */
export type HealthResp = {
  /**
   * Indicates if the API should be used.
   */
  ok: boolean,
}

export class HealthEndpoint extends BaseEndpoint {
  bodyParser(): BodyParser<void> {
    return VoidParser;
  }
  
  method(): HTTPMethod {
    return "get";
  }
  
  path() {
    return "/api/v1/health";
  }

  async handle(req: EndpointRequest<void>): Promise<JSONResponder<HealthResp>> {
    return new JSONResponder(200, {
      ok: true,
    });
  }
}
