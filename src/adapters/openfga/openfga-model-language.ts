import "server-only";

import { transformer } from "@openfga/syntax-transformer";

import type { AuthorizationModel } from "@/contract";
import type { ModelLanguage, ModelProblem, ModelReading } from "@/core/authorization/model-language";

/** A condition's head, `condition name(parameters)`, as the language writes it. */
const CONDITION_HEAD = /condition\s+([A-Za-z_][\w-]*)\s*\(([^)]*)\)/g;
/** A parameter whose values can be anything: `facts: map<any>`, `tags: list<any>`. */
const ANY_PARAMETER = /([A-Za-z_][\w]*)\s*:\s*(map|list)<any>/g;

/**
 * OpenFGA's modelling language through OpenFGA's own syntax transformer, the conversion its tools
 * make.
 *
 * One gap is bridged. A condition reads Clavia's facts about a person through a parameter of type
 * `map<any>`, which OpenFGA's engine takes and the transformer writes, but which its grammar refuses
 * to read. So a parameter written `map<any>` (or `list<any>`) is read as `map<string>`, and its type
 * set back to `any` in the JSON: what an operator sees is what they type, both ways.
 */
export class OpenFgaModelLanguage implements ModelLanguage {
  read(text: string): ModelReading {
    const anyParameters: { condition: string; parameter: string }[] = [];
    const readable = text.replace(CONDITION_HEAD, (head: string, condition: string) =>
      head.replace(ANY_PARAMETER, (_: string, parameter: string, kind: string) => {
        anyParameters.push({ condition, parameter });

        return `${parameter}: ${kind}<string>`;
      }),
    );

    let model: Record<string, unknown>;
    try {
      model = transformer.transformDSLToJSONObject(readable) as unknown as Record<string, unknown>;
    } catch (error) {
      return { ok: false, problems: problemsOf(error) };
    }
    if (model.schema_version !== "1.1") {
      return {
        ok: false,
        problems: [{ line: null, column: null, message: "Clavia takes models of schema 1.1: write `schema 1.1`." }],
      };
    }

    for (const { condition, parameter } of anyParameters) {
      const conditions = model.conditions as Record<string, { parameters?: Record<string, Record<string, unknown>> }>;
      const declared = conditions[condition]?.parameters?.[parameter];
      if (declared !== undefined) {
        declared.generic_types = [{ type_name: "TYPE_NAME_ANY" }];
      }
    }

    return { ok: true, model: model as AuthorizationModel };
  }

  /**
   * The transformer writes what it is given without checking it (a definition without a type comes
   * out as `type undefined`), so what it wrote is read back: text that does not read as the same
   * types is no model of this one.
   */
  write(model: AuthorizationModel): string | null {
    let text: string;
    try {
      text = transformer.transformJSONToDSL(model as never).trimEnd() + "\n";
    } catch {
      return null;
    }
    const reading = this.read(text);
    const types = (definitions: AuthorizationModel["type_definitions"]) => definitions.map(({ type }) => type);

    return reading.ok &&
      JSON.stringify(types(reading.model.type_definitions)) === JSON.stringify(types(model.type_definitions))
      ? text
      : null;
  }
}

type TransformerError = { msg?: unknown; line?: { start?: unknown }; column?: { start?: unknown } };

/** The transformer's errors, its 0-based positions made 1-based. */
function problemsOf(error: unknown): ModelProblem[] {
  const errors = (error as { errors?: unknown })?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return (errors as TransformerError[]).map((entry) => ({
      line: typeof entry.line?.start === "number" ? entry.line.start + 1 : null,
      column: typeof entry.column?.start === "number" ? entry.column.start + 1 : null,
      message: typeof entry.msg === "string" ? sentence(entry.msg) : "The model cannot be read.",
    }));
  }

  return [{ line: null, column: null, message: "The model cannot be read." }];
}

function sentence(message: string): string {
  const trimmed = message.trim();

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}${/[.!?]$/.test(trimmed) ? "" : "."}`;
}
