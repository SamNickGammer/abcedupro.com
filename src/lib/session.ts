import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Token primitives only — no Prisma, no bcrypt, no `next/headers`.
 *
 * Middleware runs on the Edge runtime, which cannot load the Prisma client or
 * any native module, so the pieces it needs live here and the database-backed
 * authorisers stay in `@/lib/auth`.
 */

export const SESSION_COOKIE = "abc_session";

/**
 * Session lifetimes, carried over from the Blade panels: a branch session
 * lasted 30 minutes and an admin session 60. They were enforced in
 * sessionStorage, which the user could edit; here they are the JWT's own
 * expiry, so the clock is the server's.
 */
const BRANCH_TTL_SECONDS = 30 * 60;
const ADMIN_TTL_SECONDS = 60 * 60;

export type SessionUser = {
  branchId: number;
  branchCode: string;
  branchName: string;
  role: string;
  isAdmin: boolean;
};

type SessionClaims = JWTPayload & {
  branchCode?: string;
  branchName?: string;
  role?: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 48",
    );
  }

  return new TextEncoder().encode(value);
}

export function sessionTtlSeconds(isAdmin: boolean) {
  const override = Number(
    isAdmin ? process.env.AUTH_ADMIN_SESSION_TTL : process.env.AUTH_BRANCH_SESSION_TTL,
  );

  if (Number.isFinite(override) && override > 0) return override;

  return isAdmin ? ADMIN_TTL_SECONDS : BRANCH_TTL_SECONDS;
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    branchCode: user.branchCode,
    branchName: user.branchName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.branchId))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + sessionTtlSeconds(user.isAdmin))
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionClaims>(token, secret());
    const branchId = Number(payload.sub);

    if (!Number.isFinite(branchId)) return null;

    const role = String(payload.role ?? "branch");

    return {
      branchId,
      branchCode: String(payload.branchCode ?? ""),
      branchName: String(payload.branchName ?? ""),
      role,
      isAdmin: role.toLowerCase() === "admin",
    };
  } catch {
    return null;
  }
}
