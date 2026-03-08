import { describe, it, expect } from "vitest";
import { createTurndownService, createMarkedInstance } from "../components/editor/utils/markdownRoundtrip";

const td = createTurndownService();
const markedInst = createMarkedInstance();

function htmlToMd(html: string): string {
  return td.turndown(html);
}

function mdToHtml(md: string): string {
  return markedInst.parse(md, { async: false }) as string;
}

describe("Markdown round-trip: Turndown custom rules (HTML→MD)", () => {
  it("converts inline math to $...$", () => {
    const html = '<p>The formula <span data-type="math" latex="E=mc^2" display="inline"></span> is famous.</p>';
    const md = htmlToMd(html);
    expect(md).toContain("$E=mc^2$");
  });

  it("converts block math to $$...$$", () => {
    const html = '<div data-type="math-block" latex="\\int_0^1 x^2 dx" display="block"></div>';
    const md = htmlToMd(html);
    expect(md).toContain("$$");
    expect(md).toContain("\\int_0^1 x^2 dx");
  });

  it("converts mermaid block to ```mermaid", () => {
    const html = '<div data-type="mermaid" code="graph TD\n    A-->B"></div>';
    const md = htmlToMd(html);
    expect(md).toContain("```mermaid");
    expect(md).toContain("A-->B");
  });

  it("converts admonition to > [!TYPE]", () => {
    const html = '<div data-type="admonition" data-admonition-type="warning" title="주의"><p>위험합니다</p></div>';
    const md = htmlToMd(html);
    expect(md).toContain("[!WARNING 주의]");
    expect(md).toContain("> 위험합니다");
  });

  it("converts footnote ref to [^id]", () => {
    const html = '<p>텍스트<span data-type="footnote-ref" data-footnote-id="fn-1">[*]</span></p>';
    const md = htmlToMd(html);
    expect(md).toContain("[^fn-1]");
  });

  it("converts footnote item to [^id]: text", () => {
    const html = '<div data-type="footnote-item" data-footnote-id="fn-1">각주 내용입니다</div>';
    const md = htmlToMd(html);
    expect(md).toContain("[^fn-1]: 각주 내용입니다");
  });
});

describe("Markdown round-trip: marked custom extensions (MD→HTML)", () => {
  it("parses inline math $...$ to span[data-type=math]", () => {
    const html = mdToHtml("The formula $E=mc^2$ is famous.");
    expect(html).toContain('data-type="math"');
    expect(html).toContain('latex="E=mc^2"');
  });

  it("parses block math $$...$$ to div[data-type=math-block]", () => {
    const html = mdToHtml("$$\n\\int_0^1 x^2 dx\n$$");
    expect(html).toContain('data-type="math-block"');
    expect(html).toContain("\\int_0^1 x^2 dx");
  });

  it("parses ```mermaid to div[data-type=mermaid]", () => {
    const html = mdToHtml("```mermaid\ngraph TD\n    A-->B\n```");
    expect(html).toContain('data-type="mermaid"');
    expect(html).toContain("A--&gt;B");
  });

  it("parses > [!WARNING title] to admonition div", () => {
    const md = "> [!WARNING 주의]\n> 위험합니다";
    const html = mdToHtml(md);
    expect(html).toContain('data-type="admonition"');
    expect(html).toContain('data-admonition-type="warning"');
    expect(html).toContain("위험합니다");
  });

  it("parses [^id] to footnote ref span", () => {
    const html = mdToHtml("텍스트[^fn-1] 입니다");
    expect(html).toContain('data-type="footnote-ref"');
    expect(html).toContain('data-footnote-id="fn-1"');
  });

  it("parses [^id]: text to footnote item div", () => {
    const html = mdToHtml("[^fn-1]: 각주 내용입니다");
    expect(html).toContain('data-type="footnote-item"');
    expect(html).toContain('data-footnote-id="fn-1"');
    expect(html).toContain("각주 내용입니다");
  });
});

describe("Markdown round-trip: full cycle", () => {
  it("preserves inline math through HTML→MD→HTML", () => {
    const originalHtml = '<p>수식 <span data-type="math" latex="a^2+b^2=c^2" display="inline"></span> 입니다</p>';
    const md = htmlToMd(originalHtml);
    expect(md).toContain("$a^2+b^2=c^2$");
    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-type="math"');
    expect(restoredHtml).toContain('latex="a^2+b^2=c^2"');
  });

  it("preserves block math through HTML→MD→HTML", () => {
    const originalHtml = '<div data-type="math-block" latex="\\sum_{i=1}^n i" display="block"></div>';
    const md = htmlToMd(originalHtml);
    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-type="math-block"');
    expect(restoredHtml).toContain("\\sum_{i=1}^n i");
  });

  it("preserves mermaid through HTML→MD→HTML", () => {
    const originalHtml = '<div data-type="mermaid" code="graph LR\n    A-->B"></div>';
    const md = htmlToMd(originalHtml);
    expect(md).toContain("```mermaid");
    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-type="mermaid"');
  });

  it("preserves admonition through HTML→MD→HTML", () => {
    const originalHtml = '<div data-type="admonition" data-admonition-type="tip" title="팁" data-admonition-color="green" data-admonition-icon="lightbulb"><p>유용한 정보</p></div>';
    const md = htmlToMd(originalHtml);
    expect(md).toContain("[!TIP 팁]");
    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-type="admonition"');
    expect(restoredHtml).toContain('data-admonition-type="tip"');
  });

  it("preserves footnotes through HTML→MD→HTML", () => {
    const originalHtml = '<p>본문<span data-type="footnote-ref" data-footnote-id="fn-42">[*]</span></p><div data-type="footnote-item" data-footnote-id="fn-42">설명 텍스트</div>';
    const md = htmlToMd(originalHtml);
    expect(md).toContain("[^fn-42]");
    expect(md).toContain("[^fn-42]: 설명 텍스트");
    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-footnote-id="fn-42"');
  });

  it("handles complex document with multiple custom elements", () => {
    const html = [
      '<h1>제목</h1>',
      '<p>인라인 수식 <span data-type="math" latex="x^2" display="inline"></span>과 텍스트</p>',
      '<div data-type="math-block" latex="\\frac{a}{b}" display="block"></div>',
      '<div data-type="mermaid" code="pie\n    &quot;A&quot;: 30\n    &quot;B&quot;: 70"></div>',
      '<div data-type="admonition" data-admonition-type="note" title="참고"><p>메모입니다</p></div>',
      '<p>각주<span data-type="footnote-ref" data-footnote-id="fn-1">[*]</span></p>',
      '<div data-type="footnote-item" data-footnote-id="fn-1">각주 내용</div>',
    ].join("");

    const md = htmlToMd(html);
    expect(md).toContain("# 제목");
    expect(md).toContain("$x^2$");
    expect(md).toContain("$$");
    expect(md).toContain("```mermaid");
    expect(md).toContain("[!NOTE 참고]");
    expect(md).toContain("[^fn-1]");

    const restoredHtml = mdToHtml(md);
    expect(restoredHtml).toContain('data-type="math"');
    expect(restoredHtml).toContain('data-type="math-block"');
    expect(restoredHtml).toContain('data-type="mermaid"');
    expect(restoredHtml).toContain('data-type="admonition"');
    expect(restoredHtml).toContain('data-type="footnote-ref"');
    expect(restoredHtml).toContain('data-type="footnote-item"');
  });
});
