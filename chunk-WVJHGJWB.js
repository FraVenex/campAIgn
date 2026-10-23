import{s as h}from"./chunk-BRQW3WML.js";var v=(()=>{class i{buildHtml(e){let t=e.sections.map(o=>`<section>${o.heading?`<h2>${u(o.heading)}</h2>`:""}${o.markdown?y(o.markdown):""}${o.html||""}</section>`).join(""),n=new Date().toLocaleString("it-IT",{dateStyle:"long",timeStyle:"short"});return`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${u(e.title)}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;color:#3F4238;background:#FDFCF7;max-width:860px;margin:0 auto;padding:40px 24px;line-height:1.55}
header{border-bottom:2px solid #E8E4D9;padding-bottom:16px;margin-bottom:24px}
h1{font-family:"Playfair Display",Georgia,serif;font-size:30px;margin:0}
h2{font-family:"Playfair Display",Georgia,serif;font-size:20px;margin:28px 0 10px;color:#6B705C}
h3{font-size:15px;margin:18px 0 6px}
.sub{color:#A5A58D;font-size:13px;margin-top:6px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px}
th,td{border:1px solid #E8E4D9;padding:7px 10px;text-align:left}
th{background:#F3F0E6}
ul{padding-left:20px}
.kpis{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}
.kpi{flex:1 1 150px;border:1px solid #E8E4D9;border-radius:12px;padding:12px;background:#fff}
.kpi b{display:block;font-size:20px;font-family:"Playfair Display",Georgia,serif}
.kpi span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#A5A58D}
footer{margin-top:40px;font-size:11px;color:#A5A58D;border-top:1px solid #E8E4D9;padding-top:12px}
@media print{body{background:#fff;padding:0}}
</style></head><body>
<header><h1>${u(e.title)}</h1>${e.subtitle?`<div class="sub">${u(e.subtitle)}</div>`:""}</header>
${t}
<footer>Generato da campAIgn \xB7 ${n}</footer>
</body></html>`}download(e,t){g(new Blob([this.buildHtml(e)],{type:"text/html;charset=utf-8"}),`${t||b(e.title)}.html`)}downloadCsv(e,t,n){let o=[e,...t].map(d=>d.map($).join(";")).join(`\r
`);g(new Blob(["\uFEFF"+o],{type:"text/csv;charset=utf-8"}),n.endsWith(".csv")?n:`${n}.csv`)}print(e){let t=window.open("","_blank");if(!t){this.download(e);return}t.document.write(this.buildHtml(e)),t.document.close(),t.focus(),setTimeout(()=>t.print(),400)}barChartSvg(e,t="",n=640,o=220){let d=Math.max(1,...e.map(a=>a.value)),r=32,s=(n-r*2)/Math.max(1,e.length),p=e.map((a,m)=>{let x=(o-r*2)*a.value/d,c=r+m*s+s*.2,f=o-r-x;return`<rect x="${c}" y="${f}" width="${s*.6}" height="${x}" rx="6" fill="${a.highlight?"#6B705C":"#C9C3B0"}"/>
<text x="${c+s*.3}" y="${f-6}" font-size="11" text-anchor="middle" fill="#3F4238">${a.value.toLocaleString("it-IT")}${t}</text>
<text x="${c+s*.3}" y="${o-10}" font-size="11" text-anchor="middle" fill="#A5A58D">${u(a.label)}</text>`}).join("");return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${o}" width="100%" style="max-width:${n}px"><line x1="${r}" y1="${o-r}" x2="${n-r}" y2="${o-r}" stroke="#E8E4D9"/>${p}</svg>`}static{this.\u0275fac=function(t){return new(t||i)}}static{this.\u0275prov=h({token:i,factory:i.\u0275fac,providedIn:"root"})}}return i})();function $(i){let l=String(i??"");return/[";\r\n]/.test(l)?`"${l.replace(/"/g,'""')}"`:l}function g(i,l){let e=URL.createObjectURL(i),t=document.createElement("a");t.href=e,t.download=l,document.body.appendChild(t),t.click(),t.remove(),setTimeout(()=>URL.revokeObjectURL(e),1e3)}function u(i){return String(i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function b(i){return i.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}function y(i){let l=s=>u(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`(.+?)`/g,"<code>$1</code>"),e=i.split(/\r?\n/),t=[],n=null,o=null,d=()=>{n&&t.push(`</${n}>`),n=null},r=()=>{if(o&&o.length){let[s,...p]=o;t.push(`<table><thead><tr>${s.map(a=>`<th>${l(a)}</th>`).join("")}</tr></thead><tbody>${p.map(a=>`<tr>${a.map(m=>`<td>${l(m)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)}o=null};for(let s of e){let p=s.trim();if(p.startsWith("|")){d();let c=p.replace(/^\||\|$/g,"").split("|").map(f=>f.trim());if(c.every(f=>/^:?-{2,}:?$/.test(f)))continue;o=o||[],o.push(c);continue}r();let a=p.match(/^[-*•]\s+(.*)/),m=p.match(/^\d+[.)]\s+(.*)/);if(a||m){let c=a?"ul":"ol";n!==c&&(d(),t.push(`<${c}>`),n=c),t.push(`<li>${l((a||m)[1])}</li>`);continue}d();let x=p.match(/^(#{1,4})\s+(.*)/);x?t.push(`<h3>${l(x[2])}</h3>`):p&&t.push(`<p>${l(p)}</p>`)}return d(),r(),t.join("")}export{v as a,u as b,y as c};
