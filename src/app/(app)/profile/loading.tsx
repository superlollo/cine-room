import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="py-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}
