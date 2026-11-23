/** How long a new token lasts, the choices the form offers (Clavia allows a minute to ninety days). */
export const EXPIRIES = [
  { seconds: 3600, label: "1 hour" },
  { seconds: 86_400, label: "1 day" },
  { seconds: 604_800, label: "7 days" },
  { seconds: 2_592_000, label: "30 days" },
  { seconds: 7_776_000, label: "90 days" },
] as const;

/** Seven days, Clavia's own default. */
export const DEFAULT_EXPIRY = 604_800;
