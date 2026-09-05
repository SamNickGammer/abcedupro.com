import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { AuthError, HttpError } from "@/lib/errors";
import { SESSION_COOKIE } from "@/lib/session";

export { SESSION_COOKIE };

/**
 * Sessions are rows, not self-contained tokens.
 *
 * The browser holds 256 random bits and nothing else — no role, no expiry, no
 * claims. Every request looks the token up, joins the branch, and reads the
 * role from the `branch` table. So the answer to "is this an admin?" always
 * comes from current data, never from something the client presented.
 *
 * Two things follow that a signed token cannot give you:
 *
 *   - Revocation is immediate. Delete the row and the session is over, which
 *     covers a stolen laptop or a departing employee. A stateless JWT stays
 *     valid until it expires no matter what you do.
 *   - There is no signing key that could leak and let someone mint an admin
 *     session. The token is a random number; it means nothing on its own.
 *
 * Only the SHA-256 of the token is stored, so a database leak yields nothing
 * usable — the same reason passwords are hashed.
 */

/** Lifetimes carried over from the Blade panels: 30 min branch, 60 min admin. */
const BRANCH_TTL_SECONDS = 30 * 60;
const ADMIN_TTL_SECONDS = 60 * 60;

/** How stale `lastSeenAt` may get before a request refreshes it. */
const TOUCH_AFTER_SECONDS = 60;

export function sessionTtlSeconds(isAdmin: boolean) {
  const override = Number(
    isAdmin ? process.env.AUTH_ADMIN_SESSION_TTL : process.env.AUTH_BRANCH_SESSION_TTL,
  );

  if (Number.isFinite(override) && override > 0) return override;

  return isAdmin ? ADMIN_TTL_SECONDS : BRANCH_TTL_SECONDS;
}

// ------------------------------------------------------------------ password

/**
 * The legacy hashes were written by PHP's `Hash::make(…, ['rounds' => 12])`,
 * which emits the `$2y$` bcrypt variant. bcryptjs verifies `$2y$` against the
 * same algorithm as `$2a$`/`$2b$`, so every existing password keeps working.
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

// -------------------------------------------------------------------- tokens

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requestContext() {
  const list = await headers();

  // Vercel and Cloudflare both put the real client address in these.
  const ip =
    list.get("x-real-ip") ??
    list.get("cf-connecting-ip") ??
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  return { ip: ip?.slice(0, 64) ?? null, userAgent: list.get("user-agent")?.slice(0, 255) ?? null };
}

// ------------------------------------------------------------------- session

export type SessionUser = {
  branchId: number;
  branchCode: string;
  branchName: string;
  role: string;
  isAdmin: boolean;
};

/** Issues a new session row and sets the cookie. */
export async function startSession(branch: {
  id: bigint;
  branchCode: string;
  branchName: string;
  role: string;
}) {
  const isAdmin = branch.role.toLowerCase() === "admin";
  const ttl = sessionTtlSeconds(isAdmin);

  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await requestContext();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      branchId: branch.id,
      expiresAt: new Date(Date.now() + ttl * 1000),
      ip,
      userAgent,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });

  // Opportunistic tidy-up, so expired rows do not accumulate. Cheap, indexed,
  // and only on the login path.
  void prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
}

/** Ends this browser's session, both the row and the cookie. */
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined); // already gone is fine
  }

  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Ends every session for a branch.
 *
 * Called when a password changes or a branch is suspended: the point of a
 * password change is that whoever knew the old one is locked out, which means
 * their other browsers too, not just this one.
 */
export async function revokeAllSessions(branchId: bigint) {
  const { count } = await prisma.session.deleteMany({ where: { branchId } });
  return count;
}

/**
 * The signed-in branch, resolved from the token and re-read from the database.
 *
 * Returns null rather than throwing, for callers that merely want to know.
 */
export async function getAuthenticatedBranch() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { branch: true },
  });

  if (!session) return null;

  // Expired sessions are deleted on sight rather than merely refused.
  if (session.expiresAt.getTime() <= Date.now()) {
    void prisma.session.delete({ where: { tokenHash: session.tokenHash } }).catch(() => undefined);
    return null;
  }

  // Sliding expiry: activity extends the session, idleness ends it. Written at
  // most once a minute so a burst of requests is not a burst of writes.
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_AFTER_SECONDS * 1000) {
    const ttl = sessionTtlSeconds(session.branch.role.toLowerCase() === "admin");
    void prisma.session
      .update({
        where: { tokenHash: session.tokenHash },
        data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ttl * 1000) },
      })
      .catch(() => undefined);
  }

  return session.branch;
}

/** Claims only, for callers that do not need the whole row. */
export async function getSession(): Promise<SessionUser | null> {
  const branch = await getAuthenticatedBranch();
  if (!branch) return null;

  const isAdmin = branch.role.toLowerCase() === "admin";

  return {
    branchId: Number(branch.id),
    branchCode: branch.branchCode,
    branchName: branch.branchName,
    role: branch.role,
    isAdmin,
  };
}

// --------------------------------------------------------------- authorisers

/**
 * The gate every write goes through.
 *
 * `role` and `active` are read from the branch row on this request, so a
 * suspension or a role change takes effect immediately rather than at token
 * expiry — and neither can be influenced by anything the caller sent.
 */
export async function requireBranch() {
  const branch = await getAuthenticatedBranch();

  if (!branch) throw new AuthError("Not authenticated.", 401);
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

// ------------------------------------------------------------- login throttle

const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;

/**
 * Refuses further attempts once a branch code has collected too many failures.
 *
 * Every branch in the imported data shares one password, so an unthrottled
 * guess rate against a known branch code was the entire attack surface. The
 * counter is per branch code and per address, so one attacker cannot lock a
 * branch out of its own account from elsewhere.
 */
export async function assertLoginAllowed(identifier: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const { ip } = await requestContext();

  const [byIdentifier, byIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier, succeeded: false, createdAt: { gte: since } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: { ip, succeeded: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  if (byIdentifier >= MAX_FAILURES || byIp >= MAX_FAILURES * 3) {
    throw new HttpError(
      `Too many failed sign-in attempts. Please wait ${WINDOW_MINUTES} minutes and try again.`,
      429,
    );
  }
}

export async function recordLoginAttempt(identifier: string, succeeded: boolean) {
  const { ip } = await requestContext();

  await prisma.loginAttempt
    .create({ data: { identifier, ip, succeeded } })
    .catch(() => undefined); // never let bookkeeping break a sign-in

  // A successful sign-in clears the counter for that branch code.
  if (succeeded) {
    void prisma.loginAttempt
      .deleteMany({ where: { identifier, succeeded: false } })
      .catch(() => undefined);
  }
}
