import { Skeleton } from "@/components/ui/skeleton";

/** Shown at once on every navigation inside the console, while the page streams in. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
