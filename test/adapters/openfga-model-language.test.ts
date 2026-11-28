import { describe, expect, it } from "vitest";

import { OpenFgaModelLanguage } from "@/adapters/openfga/openfga-model-language";

const language = new OpenFgaModelLanguage();

const MODEL = `model
  schema 1.1

type user

type team
  relations
    define member: [user]

type document
  relations
    define owner: [user]
    define viewer: [user, team#member, user with same_department] or owner

condition same_department(clavia: map<any>, department: string) {
  has(clavia.subject) && clavia.subject.app_metadata.department == department
}
`;

describe("OpenFgaModelLanguage", () => {
  it("reads a model into the JSON form OpenFGA and Clavia take", () => {
    const reading = language.read(MODEL);

    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.model.schema_version).toBe("1.1");
    expect(reading.model.type_definitions.map((definition) => definition.type)).toEqual(["user", "team", "document"]);
  });

  it("reads a map<any> parameter, which OpenFGA's grammar refuses, as the engine's any", () => {
    const reading = language.read(MODEL);

    expect(reading.ok && reading.model.conditions).toMatchObject({
      same_department: {
        parameters: {
          clavia: { type_name: "TYPE_NAME_MAP", generic_types: [{ type_name: "TYPE_NAME_ANY" }] },
          department: { type_name: "TYPE_NAME_STRING" },
        },
      },
    });
  });

  it("leaves a map<string> parameter as it is", () => {
    const reading = language.read(MODEL.replace("map<any>", "map<string>"));

    expect(reading.ok && reading.model.conditions).toMatchObject({
      same_department: { parameters: { clavia: { generic_types: [{ type_name: "TYPE_NAME_STRING" }] } } },
    });
  });

  it("writes a model back as it was typed, map<any> included", () => {
    const reading = language.read(MODEL);
    if (!reading.ok) throw new Error("unreadable");

    const written = language.write(reading.model);

    expect(written).toContain("condition same_department(clavia: map<any>, department: string)");
    expect(written).toContain("define viewer: [user, team#member, user with same_department] or owner");
    expect(language.read(written!)).toEqual(reading);
  });

  it("says where the syntax is wrong, counting lines and columns from 1", () => {
    const reading = language.read(
      "model\n  schema 1.1\ntype user\ntype document\n  relations\n    define viewer: [usr",
    );

    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.problems[0]).toMatchObject({ line: 6 });
    expect(reading.problems[0]?.message).toMatch(/^[A-Z].*\.$/);
  });

  it("refuses a schema Clavia does not take", () => {
    const reading = language.read("model\n  schema 1.0\ntype user\n");

    expect(reading.ok).toBe(false);
  });

  it("says nothing can be written from what is no model", () => {
    expect(language.write({ schema_version: "1.1", type_definitions: [{ relations: 3 }] })).toBeNull();
  });
});
