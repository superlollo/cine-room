import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-12 py-6">
      <section>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </section>
    </div>
  );
}
