/**
 * What a server action tells the form that called it — shared by the actions (server) and
 * the forms (client), so it imports nothing server-only. `fields` holds a message per
 * form field, by the API's field name, for the field to show under itself; `at` tells two
 * identical outcomes apart, so each is announced once.
 */
export type ActionState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "success"; message: string; at: number }>
  | Readonly<{ status: "error"; message: string; fields: Readonly<Record<string, string>>; at: number }>;

export const IDLE: ActionState = { status: "idle" };

/** The message for one field of a refused form, if there is one. */
export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fields[name] : undefined;
}
