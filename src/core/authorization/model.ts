import type { AuthorizationModel, RelationshipSubject } from "@/contract";

/**
 * Clavia's types in an API's model: the people (`user`) and applications (`client`) it knows, and
 * the roles and groups it writes the members of. An API writes no relationship on them, and the
 * dashboard reads none: who holds a role is the Roles section's to tell.
 */
export const RESERVED_TYPES = ["user", "client", "role", "group"] as const;

/** Who a question can be about: a person, by the `sub` of their tokens, or an application, by its client id. */
export const SUBJECT_TYPES = ["user", "client"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

const isReserved = (type: string) => (RESERVED_TYPES as readonly string[]).includes(type);

/**
 * The types the model declares, in its order. A model is OpenFGA's JSON, which the contract leaves
 * open: what is not shaped as a type definition is passed over, never guessed at.
 */
export function declaredTypes(model: AuthorizationModel): string[] {
  return model.type_definitions.flatMap((definition) =>
    typeof definition.type === "string" && definition.type !== "" ? [definition.type] : [],
  );
}

/** The API's own types: those its relationships are written on, and a decision is asked about. */
export function objectTypes(model: AuthorizationModel): string[] {
  return declaredTypes(model).filter((type) => !isReserved(type));
}

/** The subjects a decision can be asked about, as far as the model declares them. */
export function subjectTypes(model: AuthorizationModel): SubjectType[] {
  const declared = declaredTypes(model);

  return SUBJECT_TYPES.filter((type) => declared.includes(type));
}

/** The relations of one type, in the order the model declares them: the actions a decision can ask about. */
export function relationsOf(model: AuthorizationModel, type: string): string[] {
  const definition = model.type_definitions.find((candidate) => candidate.type === type);
  const relations = definition?.relations;

  return typeof relations === "object" && relations !== null && !Array.isArray(relations) ? Object.keys(relations) : [];
}

/**
 * An object as OpenFGA writes it, `type:id`: a type with no `:`, `#`, `@` or space, and an id with no
 * `#`, `:` or space, as the contract's pattern holds them. Null for anything else, so a browser can
 * say what is wrong before asking.
 */
export function parseObject(value: string): { type: string; id: string } | null {
  const match = /^([^:#@\s]+):([^#:\s]+)$/.exec(value.trim());

  return match === null || match[0].length > 512 ? null : { type: match[1]!, id: match[2]! };
}

/** A subject as OpenFGA writes it: `user:ada`, or a set of them, `team:finance#member`. */
export function subjectNotation(subject: RelationshipSubject): string {
  return subject.relation === undefined
    ? `${subject.type}:${subject.id}`
    : `${subject.type}:${subject.id}#${subject.relation}`;
}
