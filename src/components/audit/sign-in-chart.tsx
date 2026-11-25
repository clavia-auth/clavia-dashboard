import { Badge } from "@/components/ui/badge";

import type { DayCounts } from "./activity";

const WEEKDAY = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Sign-ins and refusals by day, as paired bars: no chart library, so nothing to ship and nothing to
 * theme twice (the bars use the palette's tokens, which follow light and dark). The numbers are on the
 * bars and in a table for screen readers, since colour alone should not carry them.
 */
export function SignInChart({ days }: { days: readonly DayCounts[] }) {
  const peak = Math.max(1, ...days.flatMap((day) => [day.signedIn, day.refused]));
  const total = days.reduce((sum, day) => sum + day.signedIn, 0);
  const refused = days.reduce((sum, day) => sum + day.refused, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Legend swatch="bg-primary" label="Signed in" value={total} />
        <Legend swatch="bg-gold" label="Refused" value={refused} />
        <span className="text-muted-foreground">Days are UTC.</span>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-4" aria-hidden>
        {days.map((day) => (
          <div key={day.day.toISOString()} className="flex flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end justify-center gap-1 border-b">
              <Bar value={day.signedIn} peak={peak} className="bg-primary" label={`${day.signedIn} signed in`} />
              <Bar value={day.refused} peak={peak} className="bg-gold" label={`${day.refused} refused`} />
            </div>
            <div className="text-center text-xs leading-tight text-muted-foreground">
              <span className="block font-medium text-foreground">{WEEKDAY.format(day.day)}</span>
              <span className="hidden sm:block">{DATE.format(day.day)}</span>
            </div>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Sign-ins and refused sign-ins by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Signed in</th>
            <th scope="col">Refused</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day.toISOString()}>
              <th scope="row">{DATE.format(day.day)}</th>
              <td>{day.signedIn}</td>
              <td>{day.refused}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2.5 rounded-sm ${swatch}`} aria-hidden />
      {label}
      <Badge variant="secondary" className="tabular-nums">
        {value.toLocaleString()}
      </Badge>
    </span>
  );
}

function Bar({ value, peak, className, label }: { value: number; peak: number; className: string; label: string }) {
  return (
    <div className="flex h-full w-full max-w-8 flex-col items-center justify-end gap-1" title={label}>
      <span className="text-[0.7rem] leading-none tabular-nums text-muted-foreground">{value > 0 ? value : ""}</span>
      <div
        className={`w-full rounded-t-sm ${className}`}
        style={{ height: `${(value / peak) * 100}%`, minHeight: value > 0 ? 2 : 0 }}
      />
    </div>
  );
}
