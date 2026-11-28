import { Skeleton } from "@/components/ui/skeleton";

/** A tab of the API's authorization, read from the decision engine: the tabs stay, the card waits. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
