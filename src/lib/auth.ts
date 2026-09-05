import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionTtlSeconds,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session";

export { SESSION_COOKIE, verifySessionToken };
export type { SessionUser };

// ------------------------------------------------------------------ password

/**
 * The legacy hashes were written by PHP's `Hash::make(…, ['rounds' => 12])`,
 * which emits the `$2y$` bcrypt variant. bcryptjs verifies `$2y$` against the
 * same algorithm as `$2a$`/`$2b$`, so every existing password keeps working
 * after the migration with no reset.
 */
export function verifyPassword(plain: string, hash: string) {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 12);
}

// ------------------------------------------------------------------- session

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds(user.isAdmin),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** The signed claims only. Cheap — no database round trip. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// --------------------------------------------------------------- authorisers

/**
 * Resolves the caller from the session cookie and re-reads the branch row, so a
 * branch that was suspended, deleted or demoted since login stops working
 * immediately rather than at token expiry.
 *
 * This is the piece the Laravel app never had: identity comes from a signed
 * cookie the client cannot forge, not from a `branch_id` in the request body.
 */
export async function requireBranch() {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated.", 401);

  const branch = await prisma.branch.findUnique({
    where: { id: BigInt(session.branchId) },
  });

  if (!branch) throw new AuthError("Account no longer exists.", 401);
  if (!branch.active) throw new AuthError("This branch is not active.", 403);

  return branch;
}

export async function requireAdmin() {
  const branch = await requireBranch();

  if (branch.role.toLowerCase() !== "admin") {
    throw new AuthError("Unauthorized. Admin access required.", 403);
  }

  return branch;
}

export type AuthedBranch = Awaited<ReturnType<typeof requireBranch>>;
