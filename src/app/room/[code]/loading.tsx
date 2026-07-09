import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-32 w-full rounded-3xl" />
    </div>
  );
}
