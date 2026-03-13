import{Y as S,P as F,aG as K,E as Y,o as Z,p as q,s as H,g as J,c as Q,b as X,_ as g,l as z,v as tt,d as et,F as at,K as rt,a6 as it,k as nt}from"./mermaid.core-CIwLXt8O.js";import{p as ot}from"./chunk-4BX2VUAB-DYD3qwwU.js";import{p as st}from"./treemap-GDKQZRPO-Bv-fS7_x.js";import{d as I}from"./arc-Cp-cSCXu.js";import{o as lt}from"./ordinal-Cboi1Yqb.js";import"./ai-assistant-D9eERrSE.js";import"./react-vendor-JH5LYz-w.js";import"./ai-agent-BUOtYKqA.js";import"./ai-shared-IQO4N0bJ.js";import"./knowledge-lcfMvOOI.js";import"./editor-aux-zeYUvi2o.js";import"./ui-vendor-B1d79Chu.js";import"./history-ByKlrGCO.js";import"./structured-io-DXJJtybr.js";import"./Index-C0OFba63.js";import"./docsly-logo-small-CrHJEW1E.js";import"./index-BF6ssUL2.js";import"./tiptap-vendor-DuYcXPts.js";import"./syntax-vendor-Dp6PY6Kf.js";import"./useDocumentManager-B5FuZjEu.js";import"./_baseUniq-sYGyIrO2.js";import"./_basePickBy-D01FKjhM.js";import"./clone-BHF10WEm.js";import"./init-Gi6I4Gst.js";function ct(t,a){return a<t?-1:a>t?1:a>=t?0:NaN}function pt(t){return t}function ut(){var t=pt,a=ct,f=null,x=S(0),o=S(F),l=S(0);function s(e){var i,c=(e=K(e)).length,p,y,h=0,u=new Array(c),n=new Array(c),v=+x.apply(this,arguments),w=Math.min(F,Math.max(-F,o.apply(this,arguments)-v)),m,C=Math.min(Math.abs(w)/c,l.apply(this,arguments)),$=C*(w<0?-1:1),d;for(i=0;i<c;++i)(d=n[u[i]=i]=+t(e[i],i,e))>0&&(h+=d);for(a!=null?u.sort(function(A,D){return a(n[A],n[D])}):f!=null&&u.sort(function(A,D){return f(e[A],e[D])}),i=0,y=h?(w-c*$)/h:0;i<c;++i,v=m)p=u[i],d=n[p],m=v+(d>0?d*y:0)+$,n[p]={data:e[p],index:i,value:d,startAngle:v,endAngle:m,padAngle:C};return n}return s.value=function(e){return arguments.length?(t=typeof e=="function"?e:S(+e),s):t},s.sortValues=function(e){return arguments.length?(a=e,f=null,s):a},s.sort=function(e){return arguments.length?(f=e,a=null,s):f},s.startAngle=function(e){return arguments.length?(x=typeof e=="function"?e:S(+e),s):x},s.endAngle=function(e){return arguments.length?(o=typeof e=="function"?e:S(+e),s):o},s.padAngle=function(e){return arguments.length?(l=typeof e=="function"?e:S(+e),s):l},s}var L=Y.pie,G={sections:new Map,showData:!1,config:L},T=G.sections,N=G.showData,gt=structuredClone(L),dt=g(()=>structuredClone(gt),"getConfig"),ft=g(()=>{T=new Map,N=G.showData,tt()},"clear"),mt=g(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(t)||(T.set(t,a),z.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),ht=g(()=>T,"getSections"),vt=g(t=>{N=t},"setShowData"),St=g(()=>N,"getShowData"),_={getConfig:dt,clear:ft,setDiagramTitle:Z,getDiagramTitle:q,setAccTitle:H,getAccTitle:J,setAccDescription:Q,getAccDescription:X,addSection:mt,getSections:ht,setShowData:vt,getShowData:St},xt=g((t,a)=>{ot(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),yt={parse:g(async t=>{const a=await st("pie",t);z.debug(a),xt(a,_)},"parse")},wt=g(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),At=wt,Dt=g(t=>{const a=[...t.values()].reduce((o,l)=>o+l,0),f=[...t.entries()].map(([o,l])=>({label:o,value:l})).filter(o=>o.value/a*100>=1).sort((o,l)=>l.value-o.value);return ut().value(o=>o.value)(f)},"createPieArcs"),Ct=g((t,a,f,x)=>{z.debug(`rendering pie chart
`+t);const o=x.db,l=et(),s=at(o.getConfig(),l.pie),e=40,i=18,c=4,p=450,y=p,h=rt(a),u=h.append("g");u.attr("transform","translate("+y/2+","+p/2+")");const{themeVariables:n}=l;let[v]=it(n.pieOuterStrokeWidth);v??(v=2);const w=s.textPosition,m=Math.min(y,p)/2-e,C=I().innerRadius(0).outerRadius(m),$=I().innerRadius(m*w).outerRadius(m*w);u.append("circle").attr("cx",0).attr("cy",0).attr("r",m+v/2).attr("class","pieOuterCircle");const d=o.getSections(),A=Dt(d),D=[n.pie1,n.pie2,n.pie3,n.pie4,n.pie5,n.pie6,n.pie7,n.pie8,n.pie9,n.pie10,n.pie11,n.pie12];let E=0;d.forEach(r=>{E+=r});const P=A.filter(r=>(r.data.value/E*100).toFixed(0)!=="0"),b=lt(D);u.selectAll("mySlices").data(P).enter().append("path").attr("d",C).attr("fill",r=>b(r.data.label)).attr("class","pieCircle"),u.selectAll("mySlices").data(P).enter().append("text").text(r=>(r.data.value/E*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),u.append("text").text(o.getDiagramTitle()).attr("x",0).attr("y",-(p-50)/2).attr("class","pieTitleText");const W=[...d.entries()].map(([r,M])=>({label:r,value:M})),k=u.selectAll(".legend").data(W).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const R=i+c,V=R*W.length/2,U=12*i,j=M*R-V;return"translate("+U+","+j+")"});k.append("rect").attr("width",i).attr("height",i).style("fill",r=>b(r.label)).style("stroke",r=>b(r.label)),k.append("text").attr("x",i+c).attr("y",i-c).text(r=>o.getShowData()?`${r.label} [${r.value}]`:r.label);const B=Math.max(...k.selectAll("text").nodes().map(r=>(r==null?void 0:r.getBoundingClientRect().width)??0)),O=y+e+i+c+B;h.attr("viewBox",`0 0 ${O} ${p}`),nt(h,p,O,s.useMaxWidth)},"draw"),$t={draw:Ct},Ht={parser:yt,db:_,renderer:$t,styles:At};export{Ht as diagram};
