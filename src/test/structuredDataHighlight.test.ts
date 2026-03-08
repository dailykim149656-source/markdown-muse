import { describe, expect, it } from "vitest";
import {
  getPlainTextMatches,
  tokenizeJson,
  tokenizeYaml,
} from "@/components/editor/utils/structuredDataHighlight";

const textsByKind = (tokens: ReturnType<typeof tokenizeJson>, kind: (typeof tokens)[number]["kind"]) => {
  return tokens.filter((token) => token.kind === kind).map((token) => token.text);
};

describe("structuredDataHighlight", () => {
  it("tokenizes JSON keys and values separately", () => {
    const tokens = tokenizeJson('{"name":"Alice","count":3,"ok":true,"none":null}');

    expect(textsByKind(tokens, "key")).toEqual(['"name"', '"count"', '"ok"', '"none"']);
    expect(textsByKind(tokens, "string")).toEqual(['"Alice"']);
    expect(textsByKind(tokens, "number")).toEqual(["3"]);
    expect(textsByKind(tokens, "boolean")).toEqual(["true"]);
    expect(textsByKind(tokens, "null")).toEqual(["null"]);
  });

  it("keeps escaped quotes inside JSON strings", () => {
    const tokens = tokenizeJson('{"text":"say \\"hi\\""}');

    expect(textsByKind(tokens, "string")).toContain('"say \\"hi\\""');
  });

  it("tokenizes YAML quoted keys without breaking URLs or hyphenated scalars", () => {
    const tokens = tokenizeYaml('"content-type": application/json\nurl: https://example.com/foo-bar\nname: foo-bar');

    expect(textsByKind(tokens, "key")).toEqual(['"content-type"', "url", "name"]);
    expect(tokens.some((token) => token.kind === "plain" && token.text.includes("https://example.com/foo-bar"))).toBe(true);
    expect(tokens.some((token) => token.kind === "plain" && token.text.includes("foo-bar"))).toBe(true);
  });

  it("tokenizes YAML list indicators, quoted hashes, and inline comments correctly", () => {
    const tokens = tokenizeYaml('- name: "doc #1" # inline comment');

    expect(textsByKind(tokens, "punctuation")).toContain("-");
    expect(textsByKind(tokens, "key")).toContain("name");
    expect(textsByKind(tokens, "string")).toContain('"doc #1"');
    expect(textsByKind(tokens, "comment")).toContain("# inline comment");
  });

  it("tokenizes YAML references and flow collections", () => {
    const tokens = tokenizeYaml("defaults: &defaults { enabled: true }\nitem: *defaults\nref: !Ref value");

    expect(textsByKind(tokens, "reference")).toEqual(["&defaults", "*defaults", "!Ref"]);
    expect(textsByKind(tokens, "boolean")).toContain("true");
    expect(textsByKind(tokens, "punctuation")).toEqual(expect.arrayContaining(["{", "}", ":", ":"]));
  });

  it("finds non-overlapping plain-text matches", () => {
    expect(getPlainTextMatches("banana", "ana")).toEqual([{ from: 1, to: 4 }]);
    expect(getPlainTextMatches("alpha beta alpha", "alpha")).toEqual([
      { from: 0, to: 5 },
      { from: 11, to: 16 },
    ]);
  });
});
