export const technicalDocumentExportFixture = `
<h1>System Overview</h1>
<p>
  See <span data-type="cross-ref" data-target="fig:system">Figure 1</span>
  and inline math <span data-type="mathInline" data-latex="E=mc^2">E=mc^2</span>.
</p>
<div
  data-type="admonition"
  data-admonition-type="warning"
  data-admonition-color="yellow"
  data-admonition-icon="alert-triangle"
  title="Warning"
>
  <p>Use patch review before applying changes.</p>
</div>
<pre><code class="language-ts">const phase = "ast";</code></pre>
<div data-type="mermaid" code="graph TD&#10;A--&gt;B"></div>
<div data-type="mathBlock" data-latex="\\int_0^1 x^2 dx">$$\\int_0^1 x^2 dx$$</div>
<img src="diagram.png" alt="system diagram" />
<div data-type="figure-caption" data-caption-type="figure" data-label="fig:system">Figure 1: System architecture</div>
<p>
  Detailed note
  <span data-type="footnote-ref" data-footnote-id="fn-1" data-note="Footnote text">1</span>
</p>
<div data-type="footnote-item" data-footnote-id="fn-1">Footnote text</div>
`.trim();
