import { describe, expect, it } from "vitest";
import { tokenizeHtml } from "@/components/editor/utils/htmlHighlight";

const textsByKind = (
  tokens: ReturnType<typeof tokenizeHtml>,
  kind: ReturnType<typeof tokenizeHtml>[number]["kind"],
) => tokens.filter((token) => token.kind === kind).map((token) => token.text);

describe("htmlHighlight", () => {
  it("tokenizes doctype, tags, attributes, comments, and entities", () => {
    const tokens = tokenizeHtml('<!DOCTYPE html>\n<div class="hero" data-id=main>&amp;<span hidden>Body</span><!-- note --></div>');

    expect(textsByKind(tokens, "doctype")).toEqual(["DOCTYPE html"]);
    expect(textsByKind(tokens, "tagName")).toEqual(["div", "span", "span", "div"]);
    expect(textsByKind(tokens, "attrName")).toEqual(["class", "data-id", "hidden"]);
    expect(textsByKind(tokens, "attrValue")).toEqual(expect.arrayContaining(['"', "hero", '"', "main"]));
    expect(textsByKind(tokens, "comment")).toEqual(["<!-- note -->"]);
    expect(textsByKind(tokens, "entity")).toEqual(["&amp;"]);
  });

  it("tokenizes entities inside attribute values without losing surrounding text", () => {
    const tokens = tokenizeHtml('<div title="Fish &amp; Chips">AT&amp;T</div>');

    expect(textsByKind(tokens, "entity")).toEqual(["&amp;", "&amp;"]);
    expect(textsByKind(tokens, "attrValue")).toEqual(expect.arrayContaining(['"', "Fish ", " Chips", '"']));
    expect(textsByKind(tokens, "plain")).toContain("AT");
    expect(textsByKind(tokens, "plain")).toContain("T");
  });

  it("tokenizes self-closing and incomplete tags without throwing", () => {
    const tokens = tokenizeHtml('<img src="hero.png"/>\n<section class="open"');

    expect(textsByKind(tokens, "tagName")).toEqual(["img", "section"]);
    expect(textsByKind(tokens, "attrName")).toEqual(["src", "class"]);
    expect(textsByKind(tokens, "attrValue")).toEqual(expect.arrayContaining(['"', "hero.png", "open"]));
    expect(textsByKind(tokens, "tagBracket")).toEqual(expect.arrayContaining(["<", "/>"]));
  });
});
