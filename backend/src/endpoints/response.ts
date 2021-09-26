import { Response } from "express";
import {
  EndpointError,
  ErrorCode,
} from "./error";

/**
 * Sends a response to the client.
 */
export interface EndpointResponder {
  /**
   * The HTTP status of the response.
   */
  status(): number;
  
  /**
   * Performs the action of responding to the request.
   */
  respond(resp: Response): Promise<void>;
}

/**
 * Responds with JSON.
 * @typeParam T - Type of JSON response.
 */
export class JSONResponder<T> implements EndpointResponder {
  /**
   * HTTP status code.
   */
  httpStatus: number;

  /**
   * JSON response data.
   */
  data: T;

  /**
   * Initialize a JSON responder.
   * @param httpStatus - HttpStatus code.
   * @param data - Response data.
   */
  constructor(httpStatus: number, data: T) {
    this.httpStatus = httpStatus;
    this.data = data;
  }

  /**
   * @returns HTTP status of response.
   */
  status(): number {
    return this.httpStatus;
  }

  /**
   * Set the response HTTP status code and send the JSON body.
   */
  async respond(resp: Response): Promise<void> {
    resp.status(this.httpStatus).json(this.data);
  }
}

/**
 * The response sent when an error occurs during a handler.
 */
type ErrorResponse = {
  /**
   * Technical description of the error.
   */
  error: string;

  /**
   * Programmatic code indicating the type of error.
   * Usually only provided when the HTTP status code is not self describing and / or the API client is expecte to take application specific action when this error is received.
   */
  error_code?: ErrorCode;
};

export class ErrorResponder implements EndpointResponder {
  /**
   * The error which occurred.
   */
  errResp: ErrorResponse;

  /**
   * HTTP status.
   */
  httpStatus: number;

  /**
   * Initialize error responder.
   */
  constructor(error: EndpointError | any) {
    if (error._tag === "endpoint_error") {
      this.errResp = {
        error: error.error,
        error_code: error.error_code,
      };
      this.httpStatus = error.http_status;
    } else {
      this.errResp = {
        error: "An unknown internal error occurred",
      };
      this.httpStatus = 500;
    }
  }

  /**
   * @returns HTTP status.
   */
  status(): number {
    return this.httpStatus;
  }

  /**
   * Send the error to the user via a JSONResponder.
   */
  async respond(resp: Response): Promise<void> {
    const jsonResponder = new JSONResponder(this.httpStatus, this.errResp);
    await jsonResponder.respond(resp);
  }
}
