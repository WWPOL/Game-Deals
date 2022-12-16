/**
 * Error codes returned by the API.
 */
export enum ErrorCode {
  /**
   * Indicates the API client must reset their password before continuing.
   */
  MustResetPassword = "must_reset_password",

  /**
   * Indicates that the user cannot reset their password to their existing password.
   */
  ResetPasswordOldNotAllowed = "old_password_not_allowed",

  /**
   * Indicates the API client cannot create a user because the password does not meet requirements. The error field will container a user friendly message.
   */
  NotMeetPasswordRequirements = "not_meet_password_requirements",
};

/**
 * Data stored in an EndpointError. Without typing _tag field.
 */
export type UntaggedEndpointError = {
  /**
   * Technical description of the error.
   */
  error: string;

  /**
   * HTTP status code associated with the error.
   */
  http_status: number;

  /**
   * Provides programmatic information about the type of the error.
   * Usually only provided when the HTTP status code is not self describing and / or the API client is expecte to take application specific action when this error is received.
   */
  error_code?: ErrorCode;
};

/**
 * Error which occurs during an endpoint.
 */
export type EndpointError = {
  /**
   * Typing information.
   */
  _tag: "endpoint_error";
} & UntaggedEndpointError;

export function MkEndpointError(data: UntaggedEndpointError): EndpointError {
  return {
    _tag: "endpoint_error",
    ...data,
  };
}

