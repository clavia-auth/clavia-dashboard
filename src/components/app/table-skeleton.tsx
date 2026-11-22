import { Skeleton } from "@/components/ui/skeleton";

/** The shape of a table while its rows stream in. */
export function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="divide-y" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className={column === 0 ? "h-8 flex-[2]" : "h-5 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}
