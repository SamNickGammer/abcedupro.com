import { TableSkeleton } from "@/components/panel/sa/SaSkeletons";

export default function Loading() {
  return <TableSkeleton title={160} columns={8} rows={12} />;
}
