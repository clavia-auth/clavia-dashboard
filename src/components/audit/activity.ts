/** One day of the sign-in chart: `since` included, `until` excluded, as the audit API reads them. */
export type DayBucket = Readonly<{ since: Date; until: Date }>;

const DAY = 24 * 3600 * 1000;

/**
 * The last `days` days up to and including today, oldest first, each cut at midnight UTC: the
 * audit API counts instants, so a day is the same for every operator and for the server's own clock.
 */
export function dayBuckets(now: Date, days: number): DayBucket[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Array.from({ length: days }, (_, index) => {
    const start = today - (days - 1 - index) * DAY;

    return { since: new Date(start), until: new Date(start + DAY) };
  });
}

/** A day's counts, for the chart. */
export type DayCounts = Readonly<{ day: Date; signedIn: number; refused: number }>;
