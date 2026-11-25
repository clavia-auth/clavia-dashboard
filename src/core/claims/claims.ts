import type { ApplicationClaimMapping, ClaimMapping } from "@/contract";

/** The profile fields a claim can read, as Clavia names them. */
export const PROFILE_FIELDS = ["name", "given_name", "family_name", "nickname", "picture", "locale"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Where an application's claim goes. An API's claims go to its access tokens, and say nothing of it. */
export type ClaimDestination = "id_token" | "userinfo";
export const CLAIM_DESTINATIONS: readonly ClaimDestination[] = ["id_token", "userinfo"];

/** How many mappings an API or an application may have. */
export const MAX_MAPPINGS = 20;

/** The kinds of source, as an operator picks them; Clavia writes one as `profile.name`, `app_metadata.plan`… */
export type SourceKind = "email" | "email_verified" | "connection" | "profile" | "app_metadata" | "roles" | "constant";

export const SOURCE_KINDS: readonly SourceKind[] = [
  "email",
  "email_verified",
  "connection",
  "profile",
  "app_metadata",
  "roles",
  "constant",
];

/** A source as the API writes it, taken apart: `profile.name` is the kind `profile` and the detail `name`. */
export function splitSource(source: string): { kind: SourceKind; detail: string } {
  for (const kind of ["profile", "app_metadata"] as const) {
    if (source.startsWith(`${kind}.`)) {
      return { kind, detail: source.slice(kind.length + 1) };
    }
  }
  const plain = SOURCE_KINDS.find((kind) => kind === source);

  return plain === undefined ? { kind: "constant", detail: "" } : { kind: plain, detail: "" };
}

export function joinSource(kind: SourceKind, detail: string): string {
  return kind === "profile" || kind === "app_metadata" ? `${kind}.${detail}` : kind;
}

/** A mapping as the editor holds it: every field text or a flag, nothing parsed. */
export type ClaimDraft = Readonly<{
  name: string;
  kind: SourceKind;
  /** The profile field, or the path into the application metadata (`tenant.id`). */
  detail: string;
  /** A constant's value, as JSON text. */
  value: string;
  in: readonly ClaimDestination[];
}>;

export type DraftProblem = Readonly<{ index: number; message: string }>;

/** The editor's row for a stored mapping. */
export function draftOf(mapping: ClaimMapping | ApplicationClaimMapping): ClaimDraft {
  const { kind, detail } = splitSource(mapping.source);

  return {
    name: mapping.name,
    kind,
    detail,
    value: kind === "constant" ? (JSON.stringify(mapping.value) ?? "") : "",
    in: "in" in mapping ? mapping.in : CLAIM_DESTINATIONS,
  };
}

/**
 * The mappings an editor's rows say, or what is wrong with them. Only what the dashboard can
 * tell is checked here (a missing name, a constant that is not JSON); Clavia holds the names,
 * the paths and the sizes to its rules and says where it refuses.
 */
export function mappingsOf(
  drafts: readonly ClaimDraft[],
  application: boolean,
):
  | { ok: true; mappings: (ClaimMapping | ApplicationClaimMapping)[] }
  | { ok: false; problems: readonly DraftProblem[] } {
  const problems: DraftProblem[] = [];
  const mappings: (ClaimMapping | ApplicationClaimMapping)[] = [];

  drafts.forEach((draft, index) => {
    const name = draft.name.trim();
    const detail = draft.detail.trim();
    const problem = (message: string) => problems.push({ index, message });

    if (name === "") {
      return problem("Name the claim.");
    }
    if ((draft.kind === "app_metadata" || draft.kind === "profile") && detail === "") {
      return problem(
        draft.kind === "profile"
          ? "Choose the profile field."
          : "Name the key in the application metadata, such as plan or tenant.id.",
      );
    }
    if (application && draft.in.length === 0) {
      return problem("Choose where the claim goes: the ID token, userinfo, or both.");
    }
    const source = joinSource(draft.kind, detail);
    const base = { name, source };

    if (draft.kind === "constant") {
      const value = jsonValue(draft.value);
      if (value === undefined || value === null) {
        return problem('A fixed value is JSON, but not null: "gold", 3, true, or a list or object.');
      }
      mappings.push(application ? { ...base, value, in: [...draft.in] } : { ...base, value });

      return;
    }
    mappings.push(application ? { ...base, in: [...draft.in] } : base);
  });

  return problems.length === 0 ? { ok: true, mappings } : { ok: false, problems };
}

function jsonValue(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** What a source reads: the account, and the roles that apply (an API's own, or all of them). */
export type ClaimSubject = Readonly<{
  email: string;
  email_verified: boolean;
  connection: string;
  profile: Readonly<Partial<Record<ProfileField, string | null>>>;
  app_metadata: Readonly<Record<string, unknown>>;
  roles: readonly string[];
}>;

/**
 * The claims mappings give a person, as Clavia works them out (docs/design/custom-claims.md
 * §5.3): a source with no value leaves its claim out, never `null`; an empty list of roles is no
 * value; a constant is always a value. With a `destination`, an application's mapping that does
 * not go there is skipped.
 */
export function claimsFor(
  mappings: readonly (ClaimMapping | ApplicationClaimMapping)[],
  subject: ClaimSubject,
  destination?: ClaimDestination,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (destination !== undefined && "in" in mapping && !mapping.in.includes(destination)) {
      continue;
    }
    const value = read(mapping, subject);
    if (value !== undefined && value !== null) {
      claims[mapping.name] = value;
    }
  }

  return claims;
}

function read(mapping: ClaimMapping | ApplicationClaimMapping, subject: ClaimSubject): unknown {
  const { kind, detail } = splitSource(mapping.source);

  switch (kind) {
    case "constant":
      return mapping.value;
    case "email":
      return subject.email;
    case "email_verified":
      return subject.email_verified;
    case "connection":
      return subject.connection;
    case "profile":
      return subject.profile[detail as ProfileField];
    case "roles":
      return subject.roles.length === 0 ? undefined : subject.roles;
    case "app_metadata":
      return detail.split(".").reduce<unknown>((value, key) => {
        return typeof value === "object" && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)[key]
          : undefined;
      }, subject.app_metadata);
  }
}

/** What an operator typed as application metadata: a JSON object, or null when it is anything else. */
export function parseMetadata(text: string): Record<string, unknown> | null {
  const value = jsonValue(text);

  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** An account's metadata as the editor first shows it. */
export function metadataText(metadata: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(metadata, null, 2);
}

/** What a preview says: the claims a chosen person would get, by where they go, or why it cannot. */
export type ClaimsPreview =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "error"; message: string }>
  | Readonly<{
      status: "success";
      person: string;
      sections: readonly Readonly<{ title: string; claims: Readonly<Record<string, unknown>> }>[];
    }>;
