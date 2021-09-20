import {
  EndpointHandler,
  HTTPMethod,
} from "./base";

export type HealthResp = {
  ok: boolean;
}

export class HealthEndpoint extends EndpointHandler {
  method(): HTTPMethod {
    return "get";
  }
  
  path() {
    return "/api/v1/health";
  }

  async handle(req, res) {
    res.json({
      ok: true,
    });
  }
}
