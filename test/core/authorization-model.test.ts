import { describe, expect, it } from "vitest";

import {
  declaredTypes,
  objectTypes,
  parseObject,
  relationsOf,
  subjectNotation,
  subjectTypes,
} from "@/core/authorization/model";

const MODEL = {
  schema_version: "1.1" as const,
  type_definitions: [
    { type: "user" },
    { type: "role", relations: { member: { this: {} } } },
    { type: "team", relations: { member: { this: {} } } },
    { type: "report", relations: { owner: { this: {} }, editor: { this: {} }, viewer: { this: {} } } },
    { relations: {} },
  ],
};

describe("an authorization model", () => {
  it("names the types it declares, in its order, passing over what is no type", () => {
    expect(declaredTypes(MODEL)).toEqual(["user", "role", "team", "report"]);
  });

  it("keeps the API's own types apart from Clavia's", () => {
    expect(objectTypes(MODEL)).toEqual(["team", "report"]);
  });

  it("asks about the subjects it declares: a person, and an application only once it declares client", () => {
    expect(subjectTypes(MODEL)).toEqual(["user"]);
    expect(subjectTypes({ ...MODEL, type_definitions: [...MODEL.type_definitions, { type: "client" }] })).toEqual([
      "user",
      "client",
    ]);
  });

  it("lists a type's relations in the order the model declares them", () => {
    expect(relationsOf(MODEL, "report")).toEqual(["owner", "editor", "viewer"]);
    expect(relationsOf(MODEL, "user")).toEqual([]);
    expect(relationsOf(MODEL, "invoice")).toEqual([]);
  });
});

describe("OpenFGA's notation", () => {
  it("reads an object as type and id", () => {
    expect(parseObject(" report:q3-revenue ")).toEqual({ type: "report", id: "q3-revenue" });
  });

  it.each(["report", "report:", ":q3", "report:q3#viewer", "re port:q3", "report:q 3", "user@x:1", "a:b:c"])(
    "refuses %j",
    (value) => {
      expect(parseObject(value)).toBeNull();
    },
  );

  it("writes a subject, or a set of them", () => {
    expect(subjectNotation({ type: "user", id: "u-1" })).toBe("user:u-1");
    expect(subjectNotation({ type: "team", id: "finance", relation: "member" })).toBe("team:finance#member");
  });
});
