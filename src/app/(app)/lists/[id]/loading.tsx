import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="py-6">
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3]" />
        ))}
      </div>
    </div>
  );
}
