import {
  EndpointHandler,
  HTTPMethod,
  JSONResponder,
} from "./base";

/**
 * Health endpoint response.
 */
export type HealthResp = {
  /**
   * Indicates if the API should be used.
   */
  ok: boolean,
}

export class HealthEndpoint extends EndpointHandler {
  method(): HTTPMethod {
    return "get";
  }
  
  path() {
    return "/api/v1/health";
  }

  async handle(req, res): Promise<JSONResponder<HealthResp>> {
    return new JSONResponder(200, {
      ok: true,
    });
  }
}
