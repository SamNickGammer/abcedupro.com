import { Badge, type BadgeTone } from "@/components/ui";

export type MarksheetStage = "started" | "pending" | "verified";

/**
 * The three-state marksheet workflow plus the separate certificate gate held by
 * head office. Rendering them as one chip is what makes a long list scannable.
 */
export function StudentStatus({
  stage,
  certificateApproved,
  active = true,
}: {
  stage: MarksheetStage;
  certificateApproved: boolean;
  active?: boolean;
}) {
  if (certificateApproved) return <Badge tone="green">Certified</Badge>;

  const map: Record<MarksheetStage, { label: string; tone: BadgeTone }> = {
    verified: { label: "Verified", tone: "blue" },
    pending: { label: "Awaiting approval", tone: "amber" },
    started: { label: active ? "Enrolled" : "Inactive", tone: active ? "neutral" : "red" },
  };

  const { label, tone } = map[stage];
  return <Badge tone={tone}>{label}</Badge>;
}
