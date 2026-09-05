import { endSession } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const POST = handler(async () => {
  // Deletes the session row, not just the cookie — so a copy of the cookie
  // taken beforehand is dead too.
  await endSession();
  return ok("Logged out.");
});
