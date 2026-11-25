import { EVENT_TYPES } from "@/components/audit/describe";
import type { AuditEventType } from "@/contract";

/** The value that stands for every event type. */
export const ALL_EVENTS = "*";

/**
 * The event types an endpoint can hear, as the picker offers them: what changes the configuration
 * and what concerns security first, then the traffic. `token.issued` is most of the volume, so
 * the picker says so where it sits.
 */
export type PickerSection = Readonly<{
  title: string;
  description?: string;
  groups: readonly Readonly<{ group: string; types: readonly AuditEventType[] }>[];
}>;

const CONFIGURATION = [
  "Users",
  "Applications",
  "APIs",
  "Roles",
  "Connections",
  "Signing keys",
  "SAML keys",
  "Initial access tokens",
  "Webhooks",
  "Passkeys",
] as const;
const ACTIVITY = ["Sign-in", "Consent", "Tokens"] as const;

/** `webhook.tested` goes to the endpoint tested and to no other: it is never one to subscribe to. */
const NOT_SUBSCRIBABLE: readonly AuditEventType[] = ["webhook.tested"];

function groupsOf(names: readonly string[]) {
  return names.map((group) => ({
    group,
    types: (Object.keys(EVENT_TYPES) as AuditEventType[]).filter(
      (type) => EVENT_TYPES[type].group === group && !NOT_SUBSCRIBABLE.includes(type),
    ),
  }));
}

export const PICKER_SECTIONS: readonly PickerSection[] = [
  {
    title: "Configuration and security",
    description: "Changes to users, applications, APIs and keys, and what concerns how people sign in. Few events.",
    groups: groupsOf(CONFIGURATION),
  },
  {
    title: "Activity",
    description: "Sign-ins, consent and tokens. Many events: token.issued alone is most of the volume.",
    groups: groupsOf(ACTIVITY),
  },
];

/** Every type the picker offers. */
export const SUBSCRIBABLE: readonly AuditEventType[] = PICKER_SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) => group.types),
);

/** What an endpoint hears, in a few words, for a table. */
export function eventsSummary(events: readonly string[]): string {
  if (events.includes(ALL_EVENTS)) {
    return "Every event";
  }

  return events.length === 1
    ? (EVENT_TYPES[events[0] as AuditEventType]?.label ?? events[0]!)
    : `${events.length} event types`;
}
