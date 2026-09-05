/** Any error that should surface to the client as a specific status code. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class AuthError extends HttpError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "AuthError";
  }
}
