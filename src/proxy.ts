import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Sends a signed-out visitor to the right login screen before a panel route
 * renders.
 *
 * This is convenience, not enforcement. Middleware runs on the Edge runtime,
 * which cannot open a database connection, so all it can tell is whether a
 * cookie is present — not whether it names a live session, nor what role that
 * session has.
 *
 * Everything that matters is decided in Node: `requirePanelUser` in the panel
 * layouts and `requireBranch`/`requireAdmin` in every route handler, each of
 * which looks the session up and re-reads the branch row. Forging a cookie
 * value gets you past this file and no further.
 */
const BRANCH_PREFIX = "/branch";
const ADMIN_PREFIX = "/admin-abc";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isBranchArea = pathname === BRANCH_PREFIX || pathname.startsWith(`${BRANCH_PREFIX}/`);
  const isAdminArea = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  if (!isBranchArea && !isAdminArea) return NextResponse.next();

  const loginPath = isAdminArea ? `${ADMIN_PREFIX}/login` : `${BRANCH_PREFIX}/login`;
  if (pathname === loginPath) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/branch/:path*", "/admin-abc/:path*"],
};
