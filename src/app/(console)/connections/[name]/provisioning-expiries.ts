/** How long a provisioning token lasts, the choices the form offers (Clavia allows a day to two years). */
export const PROVISIONING_EXPIRIES = [
  { seconds: 2_592_000, label: "30 days" },
  { seconds: 7_776_000, label: "90 days" },
  { seconds: 15_552_000, label: "6 months" },
  { seconds: 31_536_000, label: "1 year" },
  { seconds: 63_072_000, label: "2 years" },
] as const;

/** A year, Clavia's own default. */
export const DEFAULT_PROVISIONING_EXPIRY = 31_536_000;
