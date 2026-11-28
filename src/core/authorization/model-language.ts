import type { AuthorizationModel } from "@/contract";

/** Where the text of a model is wrong: 1-based, as an editor counts lines and columns. */
export type ModelProblem = Readonly<{ line: number | null; column: number | null; message: string }>;

export type ModelReading =
  Readonly<{ ok: true; model: AuthorizationModel }> | Readonly<{ ok: false; problems: readonly ModelProblem[] }>;

/**
 * OpenFGA's modelling language, which operators write, and the JSON form Clavia takes and keeps.
 * Reading a model checks its syntax only: whether its types and relations make sense is the
 * decision engine's to say when the model is sent.
 */
export interface ModelLanguage {
  /** The JSON form of a model written in the language, or where its syntax is wrong. */
  read(text: string): ModelReading;
  /** A model's JSON form written in the language, as an operator edits it. Null when it cannot be. */
  write(model: AuthorizationModel): string | null;
}
