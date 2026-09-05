import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Token primitives only — no Prisma, no bcrypt, no `next/headers`.
 *
 * Middleware runs on the Edge runtime, which cannot load the Prisma client or
 * any native module, so the pieces it needs live here and the database-backed
 * authorisers stay in `@/lib/auth`.
 */

export const SESSION_COOKIE = "abc_session";

const DEFAULT_TTL_SECONDS = 60 * 60 * 12;

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

export function sessionTtlSeconds() {
  const parsed = Number(process.env.AUTH_SESSION_TTL);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
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
    .setExpirationTime(Math.floor(Date.now() / 1000) + sessionTtlSeconds())
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
