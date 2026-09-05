import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gate the two panels at the edge so an unauthenticated visitor never sees the
 * shell, let alone the data. This is a coarse check on the signed cookie only —
 * every API route re-reads the branch row through `requireBranch`/`requireAdmin`,
 * which is what actually enforces access.
 */
const BRANCH_PREFIX = "/branch";
const ADMIN_PREFIX = "/admin-abc";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isBranchArea = pathname === BRANCH_PREFIX || pathname.startsWith(`${BRANCH_PREFIX}/`);
  const isAdminArea = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  if (!isBranchArea && !isAdminArea) return NextResponse.next();

  const loginPath = isAdminArea ? `${ADMIN_PREFIX}/login` : `${BRANCH_PREFIX}/login`;
  if (pathname === loginPath) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // An admin landing in the branch panel (or vice versa) goes to their own.
  if (isAdminArea && !session.isAdmin) {
    return NextResponse.redirect(new URL(BRANCH_PREFIX, request.url));
  }

  if (isBranchArea && session.isAdmin) {
    return NextResponse.redirect(new URL(ADMIN_PREFIX, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/branch/:path*", "/admin-abc/:path*"],
};
