function J(e){let t=e;return t=t.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi,`:toc:
:toc-title: 목차
`),t=t.replace(/<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,(r,l,a,n)=>{const p=n.replace(/^[^\:]+:\s*/,"");return`${a?`[[${a}]]
`:""}.${p}`}),t=t.replace(/<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,(r,l)=>`\0XREF_START\0${l}\0XREF_END\0`),t=t.replace(/<div[^>]*data-type="mermaid(?:Block)?"[^>]*>[\s\S]*?<\/div>/gi,r=>{const l=r.match(/code="([\s\S]*?)"/);return`[source,mermaid]
----
${l?y(l[1]):""}
----`}),t=t.replace(/<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,(r,l,a)=>{const n=N(l),p=f(a).trim();return`[${n}]
====
${p}
====`}),t=t.replace(/<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,(r,l)=>`[stem]
++++
${y(l)}
++++`),t=t.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(r,l,a)=>`[source,${l}]
----
${y(f(a)).trim()}
----`),t=t.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(r,l)=>`[source]
----
${y(f(l)).trim()}
----`),t=t.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi,(r,l)=>L(l)),t=t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,(r,l)=>`[quote]
____
${f(l).trim()}
____`),t=t.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi,(r,l)=>`== ${w(l)}`),t=t.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi,(r,l)=>`=== ${w(l)}`),t=t.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi,(r,l)=>`==== ${w(l)}`),t=t.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi,(r,l)=>`===== ${w(l)}`),t=t.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi,(r,l)=>`====== ${w(l)}`),t=t.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi,(r,l)=>l.replace(/<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,(a,n,p)=>`* ${n==="true"?"[x]":"[ ]"} ${f(p).trim()}`)),t=t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi,(r,l)=>l.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(a,n)=>`. ${f(n).trim()}`)),t=t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi,(r,l)=>l.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(a,n)=>`* ${f(n).trim()}`)),t=t.replace(/<hr\s*\/?>/gi,"'''"),t=t.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,(r,l,a)=>`image::${l}[${a}]`),t=t.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi,(r,l)=>`image::${l}[]`),t=t.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,(r,l)=>{const a=R(l);return a.trim()?`${a.trim()}
`:""}),t=R(t),t=t.replace(/<\/?[^>]+>/g,""),t=y(t),t=t.replace(/\n{3,}/g,`

`).trim(),t=t.replace(/\x00XREF_START\x00([^\x00]*)\x00XREF_END\x00/g,(r,l)=>`<<${l}>>`),t+`
`}function R(e){return e=e.replace(/<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`stem:[${y(r)}]`),e=e.replace(/<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`footnote:[${y(r)}]`),e=e.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi,(t,r)=>`*${h(r)}*`),e=e.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,(t,r)=>`*${h(r)}*`),e=e.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,(t,r)=>`_${h(r)}_`),e=e.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi,(t,r)=>`_${h(r)}_`),e=e.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi,(t,r)=>`[.underline]#${h(r)}#`),e=e.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi,(t,r)=>`[.line-through]#${h(r)}#`),e=e.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi,(t,r)=>`[.line-through]#${h(r)}#`),e=e.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi,(t,r)=>`\`${h(r)}\``),e=e.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi,(t,r)=>`#${h(r)}#`),e=e.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi,(t,r)=>`^${h(r)}^`),e=e.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi,(t,r)=>`~${h(r)}~`),e=e.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,(t,r,l)=>`${r}[${h(l)}]`),e=e.replace(/<br\s*\/?>/gi,` +
`),e}function L(e){const t=[],r=e.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[];for(const n of r){const p=/<th/i.test(n),o=[],i=n.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi)||[];for(const c of i){const g=f(c.replace(/<\/?(?:td|th)[^>]*>/gi,"")).trim();o.push(g)}t.push({cells:o,isHeader:p})}if(t.length===0)return"";const l=Math.max(...t.map(n=>n.cells.length));let a=`[cols="${Array(l).fill("1").join(",")}", options="header"]
|===
`;for(const n of t)a+=n.cells.map(p=>`| ${p}`).join(" ")+`
`,n.isHeader&&(a+=`
`);return a+="|===",a}function N(e){return{note:"NOTE",tip:"TIP",warning:"WARNING",danger:"CAUTION",info:"NOTE",caution:"CAUTION",important:"IMPORTANT"}[e]||"NOTE"}function f(e){return e.replace(/<[^>]+>/g,"")}function h(e){return e.replace(/<[^>]+>/g,"")}function w(e){let t=R(e);return t=t.replace(/<[^>]+>/g,""),t.trim()}function y(e){return e.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&emsp;/g," ").replace(/&ensp;/g," ").replace(/&thinsp;/g," ").replace(/&#10;/g,`
`)}function Q(e){let t=e;t=t.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi,`.. contents:: 목차
   :depth: 3
`),t=t.replace(/<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,(a,n,p,o)=>{const i=o.replace(/^[^:]+:\s*/,"");return`${p?`

.. _${p}:
`:""}
.. figure:: placeholder
   :align: center

   ${i}`}),t=t.replace(/<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,(a,n)=>`\0RST_REF_START\0${n}\0RST_REF_END\0`),t=t.replace(/<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,(a,n,p)=>{const o=H(n),c=b(p).trim().split(`
`).map(g=>`   ${g}`).join(`
`);return`
.. ${o}::

${c}
`}),t=t.replace(/<div[^>]*data-type="mermaid(?:Block)?"[^>]*>[\s\S]*?<\/div>/gi,a=>{const n=a.match(/code="([\s\S]*?)"/);return`
.. code-block:: mermaid

${(n?k(n[1]):"").split(`
`).map(i=>`   ${i}`).join(`
`)}
`}),t=t.replace(/<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,(a,n)=>`
.. math::

   ${k(n)}
`);let r=0;const l=[];return t=t.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(a,n,p)=>{const i=k(b(p)).trim().split(`
`).map(g=>`   ${g}`).join(`
`),c=`\0CODE_BLOCK_${r}\0`;return l.push(`
.. code-block:: ${n}

${i}
`),r++,c}),t=t.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(a,n)=>{const o=k(b(n)).trim().split(`
`).map(c=>`   ${c}`).join(`
`),i=`\0CODE_BLOCK_${r}\0`;return l.push(`
.. code-block::

${o}
`),r++,i}),t=t.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi,(a,n)=>O(n)),t=t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,(a,n)=>`
..

${b(n).trim().split(`
`).map(i=>`   ${i}`).join(`
`)}
`),t=t.replace(/<div[^>]*data-type="footnote-item"[^>]*>[\s\S]*?<\/div>/gi,""),t=t.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi,(a,n)=>{const p=q(n);return`
${M(p,"=",!0)}
`}),t=t.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi,(a,n)=>{const p=q(n);return`
${M(p,"-")}
`}),t=t.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi,(a,n)=>{const p=q(n);return`
${M(p,"~")}
`}),t=t.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi,(a,n)=>{const p=q(n);return`
${M(p,"^")}
`}),t=t.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi,(a,n)=>{const p=q(n);return`
${M(p,'"')}
`}),t=t.replace(/<hr\s*\/?>/gi,`
----
`),t=t.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,(a,n,p)=>`
.. image:: ${n}
   :alt: ${p}
`),t=t.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi,(a,n)=>`
.. image:: ${n}
`),t=t.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi,(a,n)=>n.replace(/<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,(p,o,i)=>`- ${o==="true"?"[x]":"[ ]"} ${b(i).trim()}`)),t=t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi,(a,n)=>{let p=0;return n.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(o,i)=>(p++,`${p}. ${b(i).trim()}`))}),t=t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi,(a,n)=>n.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(p,o)=>`- ${b(o).trim()}`)),t=t.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,(a,n)=>{const p=A(n);return p.trim()?`
${p.trim()}
`:""}),t=A(t),t=t.replace(/<\/?[^>]+>/g,""),t=k(t),t=t.replace(/\x00RST_REF_START\x00([^\x00]*)\x00RST_REF_END\x00/g,(a,n)=>`:ref:\`${n}\``),t=t.replace(/\x00LT\x00/g,"<"),t=t.replace(/\x00GT\x00/g,">"),t=t.replace(/\x00CODE_BLOCK_(\d+)\x00/g,(a,n)=>l[parseInt(n)]||""),t=t.replace(/\n{3,}/g,`

`).trim(),t+`
`}function M(e,t,r=!1){const l=t.repeat(Math.max(e.length,4));return r?`${l}
${e}
${l}`:`${e}
${l}`}function A(e){return e=e.replace(/<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`:math:\`${k(r)}\``),e=e.replace(/<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`[#]_

.. [#] ${k(r)}`),e=e.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi,(t,r)=>`**${$(r)}**`),e=e.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,(t,r)=>`**${$(r)}**`),e=e.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,(t,r)=>`*${$(r)}*`),e=e.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi,(t,r)=>`*${$(r)}*`),e=e.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi,(t,r)=>`:underline:\`${$(r)}\``),e=e.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi,(t,r)=>`:strike:\`${$(r)}\``),e=e.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi,(t,r)=>`:strike:\`${$(r)}\``),e=e.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi,(t,r)=>`\`\`${$(r)}\`\``),e=e.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi,(t,r)=>`:highlight:\`${$(r)}\``),e=e.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi,(t,r)=>`:sup:\`${$(r)}\``),e=e.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi,(t,r)=>`:sub:\`${$(r)}\``),e=e.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,(t,r,l)=>`\`${$(l)} \0LT\0${r}\0GT\0\`_`),e=e.replace(/<span[^>]*style="[^"]*color:\s*([^;"]*)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,(t,r,l)=>$(l)),e=e.replace(/<br\s*\/?>/gi,`
`),e}function O(e){const t=[],r=e.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[];for(const i of r){const c=/<th/i.test(i),g=[],s=i.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi)||[];for(const u of s){const m=b(u.replace(/<\/?(?:td|th)[^>]*>/gi,"")).trim();g.push(m)}t.push({cells:g,isHeader:c})}if(t.length===0)return"";const l=Math.max(...t.map(i=>i.cells.length)),a=Array(l).fill(3);for(const i of t)for(let c=0;c<i.cells.length;c++)a[c]=Math.max(a[c],i.cells[c].length+2);const n="+"+a.map(i=>"-".repeat(i)).join("+")+"+",p="+"+a.map(i=>"=".repeat(i)).join("+")+"+";let o=`
`+n+`
`;for(let i=0;i<t.length;i++){const c=t[i],g=a.map((s,u)=>" "+(c.cells[u]||"").padEnd(s-1));o+="|"+g.join("|")+`|
`,c.isHeader?o+=p+`
`:o+=n+`
`}return o}function H(e){return{note:"note",tip:"tip",warning:"warning",danger:"danger",info:"note",caution:"caution",important:"important"}[e]||"note"}function b(e){return e.replace(/<[^>]+>/g,"")}function $(e){return e.replace(/<[^>]+>/g,"")}function q(e){let t=A(e);return t=t.replace(/<[^>]+>/g,""),t.trim()}function k(e){return e.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&emsp;/g," ").replace(/&ensp;/g," ").replace(/&thinsp;/g," ").replace(/&#10;/g,`
`)}function Y(e){const t=new Set;let r=D(e,t),l="";return t.has("admonition")&&(l+=`// Admonition helper
#let admonition(title: "", color: blue, body) = block(
  fill: color.lighten(90%),
  stroke: (left: 3pt + color),
  inset: 10pt,
  radius: (right: 4pt),
  width: 100%,
  [*#title* \\ #body]
)

`),r=r.replace(/\n{3,}/g,`

`).trim(),l+r+`
`}function D(e,t){let r=e;return r=r.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi,"#outline()"),r=r.replace(/<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,(l,a,n,p)=>{t.add("caption");const o=p.replace(/^[^\:]+:\s*/,"");return n?`#figure(caption: [${o}]) <${n}>`:`#figure(caption: [${o}])`}),r=r.replace(/<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,(l,a)=>`@${a}`),r=r.replace(/<div[^>]*data-type="mermaid(?:Block)?"[^>]*>[\s\S]*?<\/div>/gi,l=>{const a=l.match(/code="([\s\S]*?)"/);return`// Mermaid diagram (not natively supported in Typst)
// \`\`\`mermaid
${(a?v(a[1]):"").split(`
`).map(p=>`// ${p}`).join(`
`)}
// \`\`\``}),r=r.replace(/<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,(l,a,n)=>{t.add("admonition");const p=a.charAt(0).toUpperCase()+a.slice(1),o=S(n).trim();return`#admonition(title: "${p}", color: ${G(a)})[${o}]`}),r=r.replace(/<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,(l,a)=>`$ ${v(a)} $`),r=r.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(l,a,n)=>(t.add("code"),`\`\`\`${a}
${v(S(n)).trim()}
\`\`\``)),r=r.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,(l,a)=>(t.add("code"),`\`\`\`
${v(S(a)).trim()}
\`\`\``)),r=r.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi,(l,a)=>(t.add("table"),F(a))),r=r.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,(l,a)=>`#quote(block: true)[${S(a).trim()}]`),r=r.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi,(l,a)=>`= ${E(a)}`),r=r.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi,(l,a)=>`== ${E(a)}`),r=r.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi,(l,a)=>`=== ${E(a)}`),r=r.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi,(l,a)=>`==== ${E(a)}`),r=r.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi,(l,a)=>`===== ${E(a)}`),r=r.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi,(l,a)=>a.replace(/<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,(n,p,o)=>`- ${p==="true"?"[x]":"[ ]"} ${S(o).trim()}`)),r=r.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi,(l,a)=>a.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(n,p)=>`+ ${S(p).trim()}`)),r=r.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi,(l,a)=>a.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(n,p)=>`- ${S(p).trim()}`)),r=r.replace(/<hr\s*\/?>/gi,"#line(length: 100%)"),r=r.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,(l,a,n)=>`#image("${a}"${n?`, alt: "${n}"`:""})`),r=r.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi,(l,a)=>`#image("${a}")`),r=r.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,(l,a)=>{const n=j(a);return n.trim()?`${n.trim()}
`:""}),r=j(r),r=r.replace(/<\/?[^>]+>/g,""),r=v(r),r}function j(e){return e=e.replace(/<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`$${v(r)}$`),e=e.replace(/<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,(t,r)=>`#footnote[${v(r)}]`),e=e.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi,(t,r)=>`*${_(r)}*`),e=e.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,(t,r)=>`*${_(r)}*`),e=e.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,(t,r)=>`_${_(r)}_`),e=e.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi,(t,r)=>`_${_(r)}_`),e=e.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi,(t,r)=>`#underline[${_(r)}]`),e=e.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi,(t,r)=>`#strike[${_(r)}]`),e=e.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi,(t,r)=>`#strike[${_(r)}]`),e=e.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi,(t,r)=>`\`${_(r)}\``),e=e.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi,(t,r)=>`#highlight[${_(r)}]`),e=e.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi,(t,r)=>`#super[${_(r)}]`),e=e.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi,(t,r)=>`#sub[${_(r)}]`),e=e.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,(t,r,l)=>`#link("${r}")[${_(l)}]`),e=e.replace(/<span[^>]*style="[^"]*color:\s*([^;"]*)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,(t,r,l)=>`#text(fill: rgb("${r}"))[${_(l)}]`),e=e.replace(/<br\s*\/?>/gi,` \\
`),e}function F(e){const t=[],r=e.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[];for(const o of r){const i=[],c=o.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi)||[];for(const g of c){const s=S(g.replace(/<\/?(?:td|th)[^>]*>/gi,"")).trim();i.push(`[${s}]`)}t.push(i)}if(t.length===0)return"";let a=`#table(
  columns: ${Math.max(...t.map(o=>o.length))},
`;const n=r[0]||"",p=/<th/i.test(n);for(let o=0;o<t.length;o++)o===0&&p?a+=`  table.header(${t[o].join(", ")}),
`:a+=`  ${t[o].join(", ")},
`;return a+=")",a}function G(e){return{note:"blue",tip:"green",warning:"yellow",danger:"red",info:"blue",caution:"orange"}[e]||"blue"}function S(e){return e.replace(/<[^>]+>/g,"")}function _(e){return e.replace(/<[^>]+>/g,"")}function E(e){let t=j(e);return t=t.replace(/<[^>]+>/g,""),t.trim()}function v(e){return e.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&emsp;/g," ").replace(/&ensp;/g," ").replace(/&thinsp;/g," ").replace(/&#10;/g,`
`)}function ee(e){let t=e;t=t.replace(/%[^\n]*/g,"");let r="";const l=t.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]*)\}/);if(l){const i=l[1]||"",c=i.match(/(\d+)pt/);c&&(r+=`#set text(size: ${c[1]}pt)
`);const g=i.match(/(a4paper|letterpaper)/);if(g){const s=g[1]==="a4paper"?"a4":"us-letter";r+=`#set page(paper: "${s}")
`}}const a=t.match(/\\title\{([^}]*)\}/),n=t.match(/\\author\{([^}]*)\}/),p=t.match(/\\date\{([^}]*)\}/);if((a||n)&&(r+=`#set document(${a?`title: "${C(a[1])}"`:""}${a&&n?", ":""}${n?`author: "${C(n[1])}"`:""})
`),t=t.replace(/[\s\S]*?\\begin\{document\}/,""),t=t.replace(/\\end\{document\}[\s\S]*/,""),t.includes("\\maketitle")){let i="";a&&(i+=`#align(center, text(size: 24pt, weight: "bold")[${C(a[1])}])
`),n&&(i+=`#align(center, text(size: 14pt)[${C(n[1])}])
`),p&&(i+=`#align(center, text(size: 12pt)[${C(p[1])}])
`),i&&(i+=`
`),t=t.replace(/\\maketitle/,i)}t=t.replace(/\\tableofcontents/g,"#outline()"),t=t.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g,(i,c)=>`#align(center)[*Abstract*]
#block(inset: (left: 2em, right: 2em))[${d(c.trim())}]
`),t=t.replace(/\\section\*?\{([^}]*)\}/g,(i,c)=>`= ${d(c)}`),t=t.replace(/\\subsection\*?\{([^}]*)\}/g,(i,c)=>`== ${d(c)}`),t=t.replace(/\\subsubsection\*?\{([^}]*)\}/g,(i,c)=>`=== ${d(c)}`),t=t.replace(/\\paragraph\*?\{([^}]*)\}/g,(i,c)=>`==== ${d(c)}`),t=t.replace(/\\begin\{figure\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/g,(i,c)=>{const g=c.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/),s=c.match(/\\caption\{([^}]*)\}/),u=c.match(/\\label\{([^}]*)\}/);let m=`#figure(
`;return m+=`  image("${g?g[1]:"image.png"}"),
`,m+=`  caption: [${s?d(s[1]):""}],
`,m+=")",u&&(m+=` <${u[1]}>`),m}),t=t.replace(/\\begin\{table\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g,(i,c)=>V(c)),t=t.replace(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g,(i,c,g)=>I(c,g)),t=t.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,(i,c)=>{const g=c.match(/\\label\{([^}]*)\}/),s=c.replace(/\\label\{[^}]*\}/g,"").trim();let u=`$ ${T(s)} $`;return g&&(u+=` <${g[1]}>`),u}),t=t.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,(i,c)=>`$ ${c.split("\\\\").map(s=>T(s.replace(/&/g,"").trim())).filter(Boolean).join(` \\
  `)} $`),t=t.replace(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g,(i,c)=>`$ ${c.split("\\\\").map(s=>T(s.trim())).filter(Boolean).join(` \\
  `)} $`),t=t.replace(/\$\$([\s\S]*?)\$\$/g,(i,c)=>`$ ${T(c.trim())} $`),t=t.replace(new RegExp("(?<!\\$)\\$(?!\\$)([^$]+?)\\$(?!\\$)","g"),(i,c)=>`$${T(c)}$`),t=t.replace(/\\\[([\s\S]*?)\\\]/g,(i,c)=>`$ ${T(c.trim())} $`),t=t.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,(i,c)=>B(c,"-")),t=t.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,(i,c)=>B(c,"+")),t=t.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g,(i,c)=>c.replace(/\\item\[([^\]]*)\]\s*([\s\S]*?)(?=\\item|$)/g,(g,s,u)=>`/ ${d(s)}: ${d(u.trim())}
`)),t=t.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g,(i,c)=>"```\n"+c.trim()+"\n```"),t=t.replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g,(i,c)=>"```\n"+c.trim()+"\n```"),t=t.replace(/\\begin\{minted\}\{([^}]*)\}([\s\S]*?)\\end\{minted\}/g,(i,c,g)=>"```"+c+`
`+g.trim()+"\n```"),t=t.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g,(i,c)=>`#quote(block: true)[${d(c.trim())}]`),t=t.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g,(i,c)=>`#quote(block: true)[${d(c.trim())}]`);const o=["theorem","lemma","proposition","corollary","definition","example","remark","proof"];for(const i of o){const c=new RegExp(`\\\\begin\\{${i}\\}(?:\\[([^\\]]*)\\])?([\\s\\S]*?)\\\\end\\{${i}\\}`,"g");t=t.replace(c,(g,s,u)=>{const m=i.charAt(0).toUpperCase()+i.slice(1),x=s?` (${d(s)})`:"";return`*${m}${x}.* ${d(u.trim())}`})}return t=t.replace(/\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,(i,c)=>{let g=`= 참고문헌

`;return(c.match(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}[\s\S]*?(?=\\bibitem|$)/g)||[]).forEach((u,m)=>{u.match(/\\bibitem(?:\[[^\]]*\])?\{([^}]*)\}/);const x=u.replace(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}/,"").trim();g+=`+ ${d(x)}
`}),g}),t=d(t),t=t.replace(/\\ref\{([^}]*)\}/g,(i,c)=>`@${c}`),t=t.replace(/\\eqref\{([^}]*)\}/g,(i,c)=>`@${c}`),t=t.replace(/\\cite\{([^}]*)\}/g,(i,c)=>c.split(",").map(g=>`@${g.trim()}`).join(" ")),t=t.replace(/\\autoref\{([^}]*)\}/g,(i,c)=>`@${c}`),t=t.replace(/\\label\{([^}]*)\}/g,(i,c)=>`<${c}>`),t=t.replace(/\\footnote\{([^}]*)\}/g,(i,c)=>`#footnote[${d(c)}]`),t=t.replace(/\\url\{([^}]*)\}/g,(i,c)=>`#link("${c}")`),t=t.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g,(i,c,g)=>`#link("${c}")[${d(g)}]`),t=t.replace(/\\(?:usepackage|bibliographystyle|newcommand|renewcommand|setlength|pagestyle|thispagestyle|clearpage|newpage|vspace|hspace|vfill|hfill|noindent|bigskip|medskip|smallskip|par)\b(?:\[[^\]]*\])?\{[^}]*\}/g,""),t=t.replace(/\\(?:clearpage|newpage|vfill|hfill|noindent|bigskip|medskip|smallskip|par)\b/g,""),t=t.replace(/\n{3,}/g,`

`).trim(),r+(r?`
`:"")+t+`
`}function P(e,t){if(e[t]!=="{")return null;let r=0,l=t+1;for(let a=t;a<e.length;a+=1){const n=e[a];if(n==="\\"){a+=1;continue}if(n==="{"){r+=1,r===1&&(l=a+1);continue}if(n==="}"&&(r-=1,r===0))return{endIndex:a+1,value:e.slice(l,a)}}return null}function U(e,t,r,l){const a=`\\${t}`;let n=!1,p="",o=0;for(;o<e.length;){const i=e.indexOf(a,o);if(i===-1){p+=e.slice(o);break}p+=e.slice(o,i);const c=e[i+a.length];if(c&&c!=="{"&&!/\s/.test(c)){p+=a,o=i+a.length;continue}let g=i+a.length;for(;g<e.length&&/\s/.test(e[g]);)g+=1;const s=[];let u=!1;for(let m=0;m<r;m+=1){const x=P(e,g);if(!x){u=!0;break}for(s.push(x.value),g=x.endIndex;g<e.length&&/\s/.test(e[g]);)g+=1}if(u){p+=a,o=i+a.length;continue}p+=l(s),o=g,n=!0}return{changed:n,output:p}}function z(e,t,r,l){let a=e;for(let n=0;n<50;n+=1){const{changed:p,output:o}=U(a,t,r,l);if(a=o,!p)break}return a}function X(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function K(e){const r=e.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)px$/);return r?`${Number((Number(r[1])*.75).toFixed(2)).toString()}pt`:e.trim()}function d(e){return e=z(e,"docsyfontfamily",2,([t,r])=>`#text(font: "${X(t.trim())}")[${r}]`),e=z(e,"docsyfontsize",3,([t,r,l])=>`#text(size: ${K(t)})[${l}]`),e=e.replace(/\\textbf\{([^}]*)\}/g,(t,r)=>`*${r}*`),e=e.replace(/\{\\bf\s+([^}]*)\}/g,(t,r)=>`*${r}*`),e=e.replace(/\{\\bfseries\s+([^}]*)\}/g,(t,r)=>`*${r}*`),e=e.replace(/\\textit\{([^}]*)\}/g,(t,r)=>`_${r}_`),e=e.replace(/\\emph\{([^}]*)\}/g,(t,r)=>`_${r}_`),e=e.replace(/\{\\it\s+([^}]*)\}/g,(t,r)=>`_${r}_`),e=e.replace(/\{\\itshape\s+([^}]*)\}/g,(t,r)=>`_${r}_`),e=e.replace(/\\underline\{([^}]*)\}/g,(t,r)=>`#underline[${r}]`),e=e.replace(/\\st\{([^}]*)\}/g,(t,r)=>`#strike[${r}]`),e=e.replace(/\\sout\{([^}]*)\}/g,(t,r)=>`#strike[${r}]`),e=e.replace(/\\texttt\{([^}]*)\}/g,(t,r)=>`\`${r}\``),e=e.replace(/\\verb\|([^|]*)\|/g,(t,r)=>`\`${r}\``),e=e.replace(/\\verb\+([^+]*)\+/g,(t,r)=>`\`${r}\``),e=e.replace(/\\textsc\{([^}]*)\}/g,(t,r)=>`#smallcaps[${r}]`),e=e.replace(/\\textcolor\{([^}]*)\}\{([^}]*)\}/g,(t,r,l)=>`#text(fill: ${W(r)})[${l}]`),e=e.replace(/\\color\{([^}]*)\}/g,""),e=e.replace(/\{\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\s+([^}]*)\}/g,(t,r,l)=>`#text(size: ${Z(r)})[${l}]`),e=e.replace(/\\textsuperscript\{([^}]*)\}/g,(t,r)=>`#super[${r}]`),e=e.replace(/\\textsubscript\{([^}]*)\}/g,(t,r)=>`#sub[${r}]`),e=e.replace(/\\&/g,"&"),e=e.replace(/\\%/g,"%"),e=e.replace(/\\\$/g,"\\$"),e=e.replace(/\\#/g,"#"),e=e.replace(/\\_/g,"_"),e=e.replace(/\\{/g,"{"),e=e.replace(/\\}/g,"}"),e=e.replace(/~/g,"~"),e=e.replace(/``/g,'"'),e=e.replace(/''/g,'"'),e=e.replace(/---/g,"—"),e=e.replace(/--/g,"–"),e=e.replace(/\\ldots/g,"…"),e=e.replace(/\\dots/g,"…"),e=e.replace(/\\textendash/g,"–"),e=e.replace(/\\textemdash/g,"—"),e=e.replace(/\\\\/g,` \\
`),e}function T(e){return e=e.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g,(t,r,l)=>`(${r}) / (${l})`),e=e.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g,(t,r,l)=>`root(${r}, ${l})`),e=e.replace(/\\sqrt\{([^}]*)\}/g,(t,r)=>`sqrt(${r})`),e=e.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g,(t,r,l)=>`sum_(${r})^(${l})`),e=e.replace(/\\prod_\{([^}]*)\}\^\{([^}]*)\}/g,(t,r,l)=>`product_(${r})^(${l})`),e=e.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g,(t,r,l)=>`integral_(${r})^(${l})`),e=e.replace(/\\lim_\{([^}]*)\}/g,(t,r)=>`lim_(${r})`),e=e.replace(/\\(sin|cos|tan|log|ln|exp|min|max|inf|sup|det|dim|ker|deg|gcd)\b/g,"$1"),e=e.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\b/g,"$1"),e=e.replace(/\\(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)\b/g,"$1"),e=e.replace(/\\infty/g,"infinity"),e=e.replace(/\\partial/g,"diff"),e=e.replace(/\\nabla/g,"nabla"),e=e.replace(/\\cdot/g,"dot"),e=e.replace(/\\times/g,"times"),e=e.replace(/\\pm/g,"plus.minus"),e=e.replace(/\\mp/g,"minus.plus"),e=e.replace(/\\leq/g,"<="),e=e.replace(/\\geq/g,">="),e=e.replace(/\\neq/g,"!="),e=e.replace(/\\approx/g,"approx"),e=e.replace(/\\equiv/g,"equiv"),e=e.replace(/\\forall/g,"forall"),e=e.replace(/\\exists/g,"exists"),e=e.replace(/\\in/g,"in"),e=e.replace(/\\notin/g,"in.not"),e=e.replace(/\\subset/g,"subset"),e=e.replace(/\\supset/g,"supset"),e=e.replace(/\\cup/g,"union"),e=e.replace(/\\cap/g,"sect"),e=e.replace(/\\emptyset/g,"emptyset"),e=e.replace(/\\rightarrow/g,"arrow.r"),e=e.replace(/\\leftarrow/g,"arrow.l"),e=e.replace(/\\Rightarrow/g,"arrow.r.double"),e=e.replace(/\\Leftarrow/g,"arrow.l.double"),e=e.replace(/\\leftrightarrow/g,"arrow.l.r"),e=e.replace(/\\to/g,"arrow.r"),e=e.replace(/\\mapsto/g,"arrow.r.bar"),e=e.replace(/\\left\(/g,"("),e=e.replace(/\\right\)/g,")"),e=e.replace(/\\left\[/g,"["),e=e.replace(/\\right\]/g,"]"),e=e.replace(/\\left\\\{/g,"{"),e=e.replace(/\\right\\\}/g,"}"),e=e.replace(/\\left\|/g,"|"),e=e.replace(/\\right\|/g,"|"),e=e.replace(/\\left\./g,""),e=e.replace(/\\right\./g,""),e=e.replace(/\\begin\{(?:p|b|B|v|V)?matrix\}([\s\S]*?)\\end\{(?:p|b|v|V)?matrix\}/g,(t,r)=>`mat(${r.split("\\\\").map(a=>a.split("&").map(n=>n.trim()).join(", ")).filter(Boolean).join("; ")})`),e=e.replace(/\\overline\{([^}]*)\}/g,(t,r)=>`overline(${r})`),e=e.replace(/\\hat\{([^}]*)\}/g,(t,r)=>`hat(${r})`),e=e.replace(/\\tilde\{([^}]*)\}/g,(t,r)=>`tilde(${r})`),e=e.replace(/\\bar\{([^}]*)\}/g,(t,r)=>`macron(${r})`),e=e.replace(/\\vec\{([^}]*)\}/g,(t,r)=>`arrow(${r})`),e=e.replace(/\\dot\{([^}]*)\}/g,(t,r)=>`dot(${r})`),e=e.replace(/\\ddot\{([^}]*)\}/g,(t,r)=>`dot.double(${r})`),e=e.replace(/\\text\{([^}]*)\}/g,(t,r)=>`"${r}"`),e=e.replace(/\\mathrm\{([^}]*)\}/g,(t,r)=>`upright(${r})`),e=e.replace(/\\mathbf\{([^}]*)\}/g,(t,r)=>`bold(${r})`),e=e.replace(/\\mathbb\{([^}]*)\}/g,(t,r)=>`bb(${r})`),e=e.replace(/\\mathcal\{([^}]*)\}/g,(t,r)=>`cal(${r})`),e=e.replace(/_\{([^}]*)\}/g,(t,r)=>`_(${r})`),e=e.replace(/\^\{([^}]*)\}/g,(t,r)=>`^(${r})`),e}function B(e,t){return(e.match(/\\item\s*([\s\S]*?)(?=\\item|$)/g)||[]).map(l=>{const a=l.replace(/\\item\s*/,"").trim();return`${t} ${d(a)}`}).join(`
`)+`
`}function V(e){const t=e.match(/\\caption\{([^}]*)\}/),r=e.match(/\\label\{([^}]*)\}/),l=e.match(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/);if(!l)return d(e);const a=I(l[1],l[2]);if(t){let n=`#figure(
  ${a},
  caption: [${d(t[1])}],
)`;return r&&(n+=` <${r[1]}>`),n}return a}function I(e,t){const r=e.replace(/[|@{[^}]*}]/g,"").split("").filter(o=>/[lcr]/.test(o)),l=r.map(o=>o==="l"?"left":o==="r"?"right":"center"),n=t.replace(/\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})/g,"").split("\\\\").map(o=>o.trim()).filter(Boolean);let p=`table(
  columns: ${r.length},
  align: (${l.join(", ")}),
`;for(const o of n){const i=o.split("&").map(c=>`[${d(c.trim())}]`);p+=`  ${i.join(", ")},
`}return p+=")",p}function W(e){return{red:"red",blue:"blue",green:"green",black:"black",white:"white",yellow:"yellow",cyan:"aqua",magenta:"fuchsia",gray:"gray",orange:"orange",purple:"purple"}[e.toLowerCase()]||`rgb("${e}")`}function Z(e){return{tiny:"6pt",scriptsize:"7pt",footnotesize:"8pt",small:"9pt",normalsize:"10pt",large:"12pt",Large:"14pt",LARGE:"17pt",huge:"20pt",Huge:"25pt"}[e]||"10pt"}function C(e){return e.replace(/\\\\/g," ").replace(/[{}]/g,"").replace(/\s+/g," ").trim()}export{J as a,Q as b,Y as h,ee as l};
