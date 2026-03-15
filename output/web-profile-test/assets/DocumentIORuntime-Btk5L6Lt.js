const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/fileFormat-Byc3j5xh.js","assets/structured-io-DXJJtybr.js","assets/useDocumentManager-B5FuZjEu.js","assets/react-vendor-JH5LYz-w.js","assets/Index-C0OFba63.js","assets/ai-assistant-D9eERrSE.js","assets/ai-agent-BUOtYKqA.js","assets/ai-shared-IQO4N0bJ.js","assets/knowledge-lcfMvOOI.js","assets/editor-aux-zeYUvi2o.js","assets/ui-vendor-B1d79Chu.js","assets/history-ByKlrGCO.js","assets/docsly-logo-small-CrHJEW1E.js","assets/index-BF6ssUL2.js","assets/index-fNzWUFFk.css","assets/tiptap-vendor-DuYcXPts.js","assets/syntax-vendor-Dp6PY6Kf.js","assets/docShare-BGdspwXe.js","assets/applyStructuredPatchSet-BJxm4D6a.js"])))=>i.map(i=>d[i]);
import{r as d}from"./react-vendor-JH5LYz-w.js";import{_ as z}from"./ai-assistant-D9eERrSE.js";import{u as he,a as i}from"./ai-agent-BUOtYKqA.js";import{d as ge,r as be}from"./knowledge-lcfMvOOI.js";import{l as ke,h as ye,a as xe,b as we}from"./latexToTypst-Bbnzv1UI.js";import{G as Ce,P as ve}from"./fonts-7h_dr-F4.js";import{e as Fe,M as q,k as G,i as Te}from"./Index-C0OFba63.js";import"./ai-shared-IQO4N0bJ.js";import"./editor-aux-zeYUvi2o.js";import"./ui-vendor-B1d79Chu.js";import"./history-ByKlrGCO.js";import"./structured-io-DXJJtybr.js";import"./docsly-logo-small-CrHJEW1E.js";import"./index-BF6ssUL2.js";import"./tiptap-vendor-DuYcXPts.js";import"./syntax-vendor-Dp6PY6Kf.js";import"./useDocumentManager-B5FuZjEu.js";const H=()=>z(()=>import("./fileFormat-Byc3j5xh.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])),Le=()=>z(()=>import("./docShare-BGdspwXe.js"),__vite__mapDeps([17,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])),_e=()=>z(()=>import("./isDocumentPatchSet-BJRORKVV.js"),[]),X=()=>z(()=>import("./applyStructuredPatchSet-BJxm4D6a.js"),__vite__mapDeps([18,1])),Pe=[".docsy",".md",".markdown",".txt",".tex",".html",".htm",".json",".yaml",".yml",".adoc",".asciidoc",".rst"],M=()=>({error:null,fileName:null,progress:null,status:"idle"}),Ie=t=>Pe.some(l=>t.toLowerCase().endsWith(l)),Re=t=>Ie(t.name)?t.size>q?{code:"file_too_large",ok:!1}:{ok:!0}:{code:"unsupported_extension",ok:!1},K=()=>`
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${Ce}" rel="stylesheet">
  <link rel="stylesheet" href="${ve}">
`,Me=(t,l,n="ko")=>`<!DOCTYPE html>
<html lang="${n}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Docsy Editor">
  <title>${t}</title>
${K()}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px; line-height: 1.8; color: #1a1a2e; background: #fafafa;
      max-width: 800px; margin: 0 auto; padding: 3rem 2rem;
    }
    h1 { font-size: 2.25em; font-weight: 700; margin: 2rem 0 1rem; color: #0a0a0a; letter-spacing: -0.02em; }
    h2 { font-size: 1.625em; font-weight: 600; margin: 1.75rem 0 0.75rem; color: #1a1a1a; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #2a2a2a; }
    p { margin: 0.75em 0; }
    a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    a:hover { color: #1d4ed8; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    ul, ol { padding-left: 1.75em; margin: 0.75em 0; }
    li { margin: 0.25em 0; }
    blockquote {
      border-left: 4px solid #e5e7eb; padding: 0.5em 1em; margin: 1.25em 0;
      color: #6b7280; background: #f9fafb; border-radius: 0 8px 8px 0;
    }
    code {
      background: #f1f5f9; padding: 0.2em 0.45em; border-radius: 4px;
      font-size: 0.875em; font-family: 'Fira Code', 'JetBrains Mono', 'D2Coding', monospace;
      color: #e11d48;
    }
    pre {
      background: #1e293b; color: #e2e8f0; padding: 1.25rem; border-radius: 8px;
      overflow-x: auto; margin: 1.25em 0; font-size: 0.875em; line-height: 1.6;
      font-family: 'Fira Code', 'JetBrains Mono', 'D2Coding', monospace;
    }
    pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background: #fafafa; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.25em 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    mark { background: #fef3c7; padding: 0.1em 0.25em; border-radius: 3px; }
    sub { font-size: 0.75em; }
    sup { font-size: 0.75em; }
    div[data-type="admonition"] {
      border-left: 4px solid #3b82f6; background: rgba(59,130,246,0.06);
      border-radius: 0 8px 8px 0; padding: 0.75em 1em; margin: 1.25em 0;
    }
    div[data-admonition-color="blue"] { border-left-color: #3b82f6; background: rgba(59,130,246,0.06); }
    div[data-admonition-color="green"] { border-left-color: #22c55e; background: rgba(34,197,94,0.06); }
    div[data-admonition-color="yellow"] { border-left-color: #eab308; background: rgba(234,179,8,0.06); }
    div[data-admonition-color="red"] { border-left-color: #ef4444; background: rgba(239,68,68,0.06); }
    div[data-admonition-color="purple"] { border-left-color: #a855f7; background: rgba(168,85,247,0.06); }
    div[data-admonition-color="orange"] { border-left-color: #f97316; background: rgba(249,115,22,0.06); }
    div[data-admonition-color="teal"] { border-left-color: #14b8a6; background: rgba(20,184,166,0.06); }
    div[data-admonition-color="gray"] { border-left-color: #6b7280; background: rgba(107,114,128,0.06); }
    span[data-type="footnote-ref"] { vertical-align: super; font-size: 0.75em; font-weight: 600; color: #2563eb; cursor: pointer; }
    div[data-type="footnote-item"] { border-top: 1px solid #e5e7eb; padding: 0.5em 0; font-size: 0.9em; color: #6b7280; }
    div[data-type="footnote-item"]:first-of-type { margin-top: 2em; }
    @media (max-width: 640px) {
      body { padding: 1.5rem 1rem; font-size: 15px; }
      h1 { font-size: 1.75em; }
    }
    @media print {
      body { background: white; padding: 0; }
      pre { background: #f5f5f5; color: #1a1a1a; }
    }
  </style>
</head>
<body>
${l}
</body>
</html>`,ze=(t,l,n="ko")=>`<!DOCTYPE html><html lang="${n}"><head><meta charset="utf-8"><title>${t}</title>
${K()}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>@media print{body{margin:0;padding:40px;background:white!important;color:black!important}*{color-adjust:exact;-webkit-print-color-adjust:exact}}body{max-width:800px;margin:0 auto;padding:40px;font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic','Inter',sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;background:white}h1{font-size:2em;font-weight:700;margin:1.5em 0 .5em}h2{font-size:1.5em;font-weight:600;margin:1.2em 0 .4em}h3{font-size:1.25em;font-weight:600;margin:1em 0 .3em}p{margin:.5em 0}ul,ol{padding-left:1.5em;margin:.5em 0}blockquote{border-left:3px solid #ddd;padding-left:1em;color:#666;margin:1em 0}code{background:#f5f5f5;padding:.15em .4em;border-radius:3px;font-size:.9em;font-family:'Fira Code','JetBrains Mono','D2Coding',monospace}pre{background:#f5f5f5;padding:1em;border-radius:6px;overflow-x:auto;font-family:'Fira Code','JetBrains Mono','D2Coding',monospace}pre code{background:none;padding:0;font-family:inherit}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f9f9f9;font-weight:600}img{max-width:100%;height:auto;margin:1em 0}hr{border:none;border-top:1px solid #ddd;margin:1.5em 0}mark{background:#fff3bf;padding:.1em .2em;border-radius:2px}a{color:#1971c2}</style></head><body>${l}</body></html>`,Ee=async t=>{t.document.readyState!=="complete"&&await new Promise(n=>{t.addEventListener("load",()=>n(),{once:!0})});const l=t.document.fonts;if(l)try{await Promise.race([l.ready,new Promise(n=>window.setTimeout(n,2e3))])}catch{}await new Promise(n=>window.setTimeout(n,150))},Oe=async({activeDoc:t,format:l,renderableEditorHtml:n,renderableMarkdown:h})=>{if(l==="markdown")return t.mode==="markdown"?t.content:h;if(l==="html")return n;if(l==="json"){if(t.mode==="json")return t.content;const{parseStructuredPatchDocument:c,serializeStructuredContent:I}=await X(),T=c(t.content,"yaml");return I(T,"json")}if(t.mode==="yaml")return t.content;const{parseStructuredPatchDocument:g,serializeStructuredContent:C}=await X(),a=g(t.content,"json");return C(a,"yaml")},Ae=async(t,l)=>{const{buildDocShareLink:n}=await Le(),h=n(t,l);return{available:!!h,link:h}},Se=({activeDoc:t,createDocument:l,documents:n,getRenderableLatexDocument:h,getRenderableMarkdown:g,onPatchSetLoad:C,onVersionSnapshot:a,renderableEditorHtml:c,renderableLatexDocument:I,renderableMarkdown:T})=>{const{locale:L,t:e}=he(),N=d.useRef(null),[E,b]=d.useState(M),[Z,$]=d.useState({available:!1,link:null}),J=d.useCallback((o,r,m)=>({fileName:o,importedAt:m,sourceFormat:r,sourceId:`${o}:${m}`}),[]);d.useEffect(()=>{$({available:!1,link:null})},[t.content,t.id,t.mode,t.updatedAt]);const s=d.useCallback((o,r,m)=>{const y=new Blob([o],{type:m}),_=URL.createObjectURL(y),u=document.createElement("a");u.href=_,u.download=`${t.name||"Untitled"}${r}`,u.click(),URL.revokeObjectURL(_)},[t.name]),Y=d.useCallback(async(o,r)=>{try{await navigator.clipboard.writeText(o),i.success(e("hooks.io.copiedToClipboard",{format:r}))}catch{i.error(e("hooks.io.copyFailed",{format:r}))}},[e]),k=d.useCallback(async(o,r)=>{try{const m=o==="markdown"?await g():T,y=await Oe({activeDoc:t,format:o,renderableEditorHtml:c,renderableMarkdown:m});await Y(y,r),a==null||a({exportFormat:r})}catch{i.error(e("hooks.io.copyFailed",{format:r}))}},[t,Y,g,a,c,T,e]),O=d.useCallback(async()=>{const o=typeof window<"u"?window.location.href:"http://localhost/editor",r=await Ae(t,o);return $(r),r},[t]),Q=d.useCallback(async()=>{const{link:o}=await O();if(!o){i.error(e("hooks.io.shareTooLarge",{size:Fe}));return}try{await navigator.clipboard.writeText(o),a==null||a({exportFormat:"Share link"}),i.success(e("hooks.io.shareCopied"))}catch{i.error(e("hooks.io.shareCopyFailed"))}},[a,O,e]),V=d.useCallback(async()=>{const o=t.mode==="markdown"?t.content:await g();s(o,".md","text/markdown"),a==null||a({exportFormat:"Markdown"})},[t.content,t.mode,s,g,a]),ee=d.useCallback(()=>{k("markdown","Markdown")},[k]),te=d.useCallback(async()=>{const{buildDocsyFileFromDocumentData:o,serializeDocsyFile:r}=await H();s(r(o(t)),".docsy","application/json"),a==null||a({exportFormat:"Docsy"}),i.success(e("toasts.savedDocsy"))},[t,s,a,e]),ae=d.useCallback(async()=>{const o=await h();s(o,".tex","application/x-tex"),a==null||a({exportFormat:"LaTeX"}),i.success(e("hooks.io.latexSaved"))},[s,h,a,e]),oe=d.useCallback(()=>{s(t.content,".json","application/json"),a==null||a({exportFormat:"JSON"})},[t.content,s,a]),re=d.useCallback(()=>{s(t.content,".yaml","text/yaml"),a==null||a({exportFormat:"YAML"})},[t.content,s,a]),de=d.useCallback(()=>{const o=t.mode==="latex"?ke(t.content):ye(c);s(o,".typ","text/plain"),a==null||a({exportFormat:"Typst"}),i.success(e("hooks.io.typstSaved"))},[t.content,t.mode,s,a,c,e]),le=d.useCallback(()=>{s(xe(c),".adoc","text/plain"),a==null||a({exportFormat:"AsciiDoc"}),i.success(e("hooks.io.adocSaved"))},[s,a,c,e]),ne=d.useCallback(()=>{s(we(c),".rst","text/x-rst"),a==null||a({exportFormat:"RST"}),i.success(e("hooks.io.rstSaved"))},[s,a,c,e]),ie=d.useCallback(()=>{s(Me(t.name||"Untitled",c,L),".html","text/html"),a==null||a({exportFormat:"HTML"}),i.success(e("hooks.io.htmlSaved"))},[t.name,s,L,a,c,e]),se=d.useCallback(()=>{k("html","HTML")},[k]),me=d.useCallback(()=>{k("json","JSON")},[k]),ce=d.useCallback(()=>{k("yaml","YAML")},[k]),D=d.useCallback(()=>t.mode==="json"||t.mode==="yaml"?"":c,[t.mode,c]),W=d.useCallback(()=>{(async()=>{const r=D();if(!r)return;const m=window.open("","_blank");m&&(m.document.write(ze(t.name||"Untitled",r,L)),m.document.close(),await Ee(m),a==null||a({exportFormat:"PDF"}),m.focus(),m.print())})()},[t.name,D,L,a]),ue=d.useCallback(()=>{var o;E.status!=="reading"&&((o=N.current)==null||o.click())},[E.status]),fe=d.useCallback(o=>{var _;const r=(_=o.target.files)==null?void 0:_[0];if(!r)return;const m=Re(r);if(!m.ok){const v=("code"in m?m.code:"file_too_large")==="unsupported_extension"?e("hooks.io.importUnsupportedType"):e("hooks.io.importFileTooLarge",{size:`${Math.round(q/(1024*1024))}MB`});b({error:v,fileName:r.name,progress:null,status:"error"}),i.error(v),o.target.value="";return}const y=new FileReader;b({error:null,fileName:r.name,progress:0,status:"reading"}),y.onprogress=u=>{u.lengthComputable&&b(v=>v.status!=="reading"?v:{...v,progress:Math.max(1,Math.min(99,Math.round(u.loaded/u.total*100)))})},y.onerror=()=>{const u=e("hooks.io.importReadFailed",{name:r.name});b({error:u,fileName:r.name,progress:null,status:"error"}),i.error(u),o.target.value=""},y.onload=u=>{(async()=>{var U;try{const p=(U=u.target)==null?void 0:U.result,f=r.name.toLowerCase(),A=r.name.replace(/\.(docsy|md|markdown|txt|tex|html|htm|json|yaml|yml|adoc|asciidoc|rst)$/i,""),pe=Date.now();let F="markdown",P=p,x="markdown",R,S=null;if(f.endsWith(".docsy")){const{buildDocumentDataFromDocsyFile:w,parseDocsyFile:j}=await H(),B=j(p);l(G({activeDocId:t.id,documents:n,importedDocument:w(B)})),b(M()),i.success(e("hooks.io.loadedDocument",{name:B.document.name})),o.target.value="";return}if(f.endsWith(".tex")){F="latex",x="latex";const w=Te(p);S=w,R={html:w.html,latex:p}}else if(f.endsWith(".html")||f.endsWith(".htm"))F="html",x="html";else if(f.endsWith(".json")){try{const w=JSON.parse(p),{isDocumentPatchSet:j}=await _e();if(C&&j(w)){C(w),b(M()),o.target.value="";return}}catch{}F="json",x="json"}else f.endsWith(".yaml")||f.endsWith(".yml")?(F="yaml",x="yaml"):f.endsWith(".adoc")||f.endsWith(".asciidoc")?(F="html",P=ge(p),x="asciidoc",R={asciidoc:p,html:P},i.info(e("hooks.io.adocConverted"))):f.endsWith(".rst")?(F="html",P=be(p),x="rst",R={html:P,rst:p},i.info(e("hooks.io.rstConverted"))):x="markdown";l(G({activeDocId:t.id,documents:n,importedDocument:{content:P,metadata:{...S?{latexRoundtrip:S.metadata}:{},sourceFiles:[J(r.name,x,pe)],title:A},mode:F,name:A,sourceSnapshots:R}})),b(M()),i.success(e("hooks.io.loadedDocument",{name:A}))}catch(p){const f=p instanceof Error?p.message:e("hooks.io.importParseFailed",{name:r.name});b({error:f,fileName:r.name,progress:null,status:"error"}),i.error(f)}finally{o.target.value=""}})()},y.readAsText(r)},[t.id,J,l,n,C,e]);return{fileInputRef:N,importState:E,prepareShareLink:O,shareLinkInfo:Z,handleCopyHtml:se,handleCopyJson:me,handleCopyMd:ee,handleCopyShareLink:Q,handleCopyYaml:ce,handleFileChange:fe,handleLoad:ue,handlePrint:W,handleSaveAdoc:le,handleSaveDocsy:te,handleSaveHtml:ie,handleSaveJson:oe,handleSaveMd:V,handleSavePdf:W,handleSaveRst:ne,handleSaveTex:ae,handleSaveTypst:de,handleSaveYaml:re}},et=({activeDoc:t,createDocument:l,documents:n,getRenderableLatexDocument:h,getRenderableMarkdown:g,onPatchSetLoad:C,onStateChange:a,onVersionSnapshot:c,renderableEditorHtml:I,renderableLatexDocument:T,renderableMarkdown:L})=>{const e=Se({activeDoc:t,createDocument:l,documents:n,getRenderableLatexDocument:h,getRenderableMarkdown:g,onPatchSetLoad:C,onVersionSnapshot:c,renderableEditorHtml:I,renderableLatexDocument:T,renderableMarkdown:L});return d.useEffect(()=>{a({fileInputRef:e.fileInputRef,handleCopyHtml:e.handleCopyHtml,handleCopyJson:e.handleCopyJson,handleCopyMd:e.handleCopyMd,handleCopyShareLink:e.handleCopyShareLink,handleCopyYaml:e.handleCopyYaml,handleFileChange:e.handleFileChange,handleLoad:e.handleLoad,handlePrint:e.handlePrint,handleSaveAdoc:e.handleSaveAdoc,handleSaveDocsy:e.handleSaveDocsy,handleSaveHtml:e.handleSaveHtml,handleSaveJson:e.handleSaveJson,handleSaveMd:e.handleSaveMd,handleSavePdf:e.handleSavePdf,handleSaveRst:e.handleSaveRst,handleSaveTex:e.handleSaveTex,handleSaveTypst:e.handleSaveTypst,handleSaveYaml:e.handleSaveYaml,importState:e.importState,prepareShareLink:e.prepareShareLink,shareLinkInfo:e.shareLinkInfo})},[e.fileInputRef,e.handleCopyHtml,e.handleCopyJson,e.handleCopyMd,e.handleCopyShareLink,e.handleCopyYaml,e.handleFileChange,e.handleLoad,e.handlePrint,e.handleSaveAdoc,e.handleSaveDocsy,e.handleSaveHtml,e.handleSaveJson,e.handleSaveMd,e.handleSavePdf,e.handleSaveRst,e.handleSaveTex,e.handleSaveTypst,e.handleSaveYaml,e.importState,e.prepareShareLink,e.shareLinkInfo,a]),d.useEffect(()=>()=>a(null),[a]),null};export{et as default};
