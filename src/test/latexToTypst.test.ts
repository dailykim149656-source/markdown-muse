import { describe, it, expect } from "vitest";
import { latexToTypst } from "@/components/editor/utils/latexToTypst";

const wrap = (body: string) =>
  `\\documentclass{article}\n\\begin{document}\n${body}\n\\end{document}`;

describe("latexToTypst math conversion", () => {
  it("converts fractions", () => {
    const result = latexToTypst(wrap("$\\frac{a}{b}$"));
    expect(result).toContain("$(a) / (b)$");
  });

  it("converts square roots", () => {
    const result = latexToTypst(wrap("$\\sqrt{x}$"));
    expect(result).toContain("$sqrt(x)$");
  });

  it("converts nth roots", () => {
    const result = latexToTypst(wrap("$\\sqrt[3]{x}$"));
    expect(result).toContain("$root(3, x)$");
  });

  it("converts summation", () => {
    const result = latexToTypst(wrap("$\\sum_{i=1}^{n} x_i$"));
    expect(result).toContain("sum_(i=1)^(n)");
  });

  it("converts integral", () => {
    const result = latexToTypst(wrap("$\\int_{0}^{\\infty} e^{-x} dx$"));
    expect(result).toContain("integral_(0)^(infinity)");
  });

  it("converts product", () => {
    const result = latexToTypst(wrap("$\\prod_{i=1}^{n} x_i$"));
    expect(result).toContain("product_(i=1)^(n)");
  });

  it("converts matrix (pmatrix)", () => {
    const result = latexToTypst(wrap("$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$"));
    expect(result).toContain("mat(");
  });

  it("converts display equation environment", () => {
    const result = latexToTypst(wrap("\\begin{equation}\nE = mc^2\n\\end{equation}"));
    expect(result).toContain("$ E = mc^2 $");
  });

  it("converts align environment", () => {
    const result = latexToTypst(wrap("\\begin{align*}\na &= b \\\\\nc &= d\n\\end{align*}"));
    expect(result).toContain("$");
    expect(result).toContain("a = b");
    expect(result).toContain("c = d");
  });

  it("converts Greek letters", () => {
    const result = latexToTypst(wrap("$\\alpha + \\beta = \\gamma$"));
    expect(result).toContain("alpha");
    expect(result).toContain("beta");
    expect(result).toContain("gamma");
  });

  it("converts limit", () => {
    const result = latexToTypst(wrap("$\\lim_{x \\to 0} \\frac{\\sin x}{x}$"));
    expect(result).toContain("lim_(x arrow.r 0)");
  });

  it("converts text in math", () => {
    const result = latexToTypst(wrap("$\\text{where } x > 0$"));
    expect(result).toContain('"where "');
  });

  it("converts mathbb (blackboard bold)", () => {
    const result = latexToTypst(wrap("$\\mathbb{R}$"));
    expect(result).toContain("bb(R)");
  });

  it("converts overline and hat", () => {
    const result = latexToTypst(wrap("$\\overline{x} + \\hat{y}$"));
    expect(result).toContain("overline(x)");
    expect(result).toContain("hat(y)");
  });

  it("converts inequality symbols", () => {
    const result = latexToTypst(wrap("$a \\leq b \\geq c \\neq d$"));
    expect(result).toContain("<=");
    expect(result).toContain(">=");
    expect(result).toContain("!=");
  });

  it("converts set operations", () => {
    const result = latexToTypst(wrap("$A \\cup B \\cap C \\subset D$"));
    expect(result).toContain("union");
    expect(result).toContain("sect");
    expect(result).toContain("subset");
  });

  it("converts arrows", () => {
    const result = latexToTypst(wrap("$x \\rightarrow y \\Rightarrow z$"));
    expect(result).toContain("arrow.r");
    expect(result).toContain("arrow.r.double");
  });

  it("converts docsy font macros", () => {
    const result = latexToTypst(wrap("\\docsyfontfamily{Fira Code}{\\docsyfontsize{18px}{13.5pt}{Styled}}"));
    expect(result).toContain('#text(font: "Fira Code")');
    expect(result).toContain("#text(size: 13.5pt)[Styled]");
  });
});
