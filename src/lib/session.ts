/**
 * The one piece of session handling the Edge runtime can use.
 *
 * Everything else — looking a token up, reading the role, deciding what is
 * allowed — needs the database and therefore lives in `@/lib/auth`, which only
 * runs in Node.
 */
export const SESSION_COOKIE = "abc_session";
