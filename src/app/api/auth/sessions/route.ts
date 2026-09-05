import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { SESSION_COOKIE, requireBranch, revokeAllSessions } from "@/lib/auth";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

/**
 * The browsers currently signed in as this account.
 *
 * Worth having because every branch in the imported data shares one password:
 * if that password gets around, this is how you notice, and DELETE is how you
 * end it. A stateless token cannot offer either.
 */
export const GET = handler(async () => {
  const branch = await requireBranch();

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const currentHash = token ? createHash("sha256").update(token).digest("hex") : null;

  const sessions = await prisma.session.findMany({
    where: { branchId: branch.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: {
      tokenHash: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      ip: true,
      userAgent: true,
    },
  });

  return ok(
    "Active sessions retrieved.",
    sessions.map((session) => ({
      // The hash itself never leaves the server; a short prefix is enough to
      // tell two rows apart in a list.
      id: session.tokenHash.slice(0, 12),
      current: session.tokenHash === currentHash,
      signed_in_at: session.createdAt.toISOString(),
      last_seen_at: session.lastSeenAt.toISOString(),
      expires_at: session.expiresAt.toISOString(),
      ip: session.ip,
      user_agent: session.userAgent,
    })),
  );
});

/** Signs this account out everywhere, including here. */
export const DELETE = handler(async () => {
  const branch = await requireBranch();
  const ended = await revokeAllSessions(branch.id);

  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });

  return ok("Signed out of every device.", undefined, { sessions_ended: ended });
});
