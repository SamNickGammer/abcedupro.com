import { TableSkeleton } from "@/components/panel/sa/SaSkeletons";

export default function Loading() {
  return <TableSkeleton title={150} columns={6} rows={10} />;
}
