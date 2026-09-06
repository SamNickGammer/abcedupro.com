import { DashboardSkeleton } from "@/components/panel/sa/SaSkeletons";

/**
 * Shown the instant a panel route is navigated to, while the server resolves
 * the session and renders. Without it the browser sits on the previous page
 * with no feedback for as long as that takes.
 */
export default function Loading() {
  return <DashboardSkeleton />;
}
