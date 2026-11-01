import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-40 rounded-md" />
      </div>

      {/* Main card skeleton */}
      <Skeleton className="h-44 w-full rounded-xl" />

      {/* Secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  );
}
