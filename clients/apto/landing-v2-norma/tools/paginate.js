const { chromium } = require('playwright'); const fs=require('fs');
const [,, blocksPath, outHtml, outPdf] = process.argv;
const B = JSON.parse(fs.readFileSync(blocksPath,'utf8'));
const header = `<header class="doc-header">
    <div class="brand-mark">
      <img class="brand-logo-img" src="${B.logo}" alt="Marketon">
      <div class="brand-txt"><div class="n">Plan de transición</div><div class="tag">landing.apto.mx · uso interno</div></div>
    </div>
    <div class="doc-meta">
      <div class="pill">22 al 24 de septiembre de 2026</div>
      <div>Para <strong>Chucho Porras</strong> · plan, ejecución y bitácora</div>
      <div>Fuentes: repo apto-landing · Worker · D1 · GTM-K7J6MQ8 · Google Ads 702-132-4934 · GA4</div>
    </div>
  </header>`;
const footer = n => `<footer class="doc-footer"><div>Plan de transición · Landing APTO v2 (Norma) · 22 al 24-sep-2026</div><div>Marketon · uso interno · ${n}</div></footer>`;
const titleBlock = `<div class="title-block"><div class="eyebrow">Marketon · APTO · Landing</div><h1 class="doc-title">${B.title}</h1></div>`;
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  const tmp = outHtml.replace(/\.html$/,'.tmp.html');
  fs.writeFileSync(tmp, `<!DOCTYPE html><html lang="es-MX"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${B.style}</head><body></body></html>`);
  await p.goto('file://'+tmp, { waitUntil:'networkidle' });
  await p.evaluate(async()=>{ const f=['400 12px Inter','500 12px Inter','600 12px Inter','700 12px Inter','800 12px Inter','500 12px "Space Grotesk"','700 12px "Space Grotesk"','800 12px "Space Grotesk"','900 12px "Space Grotesk"','400 12px "JetBrains Mono"','500 12px "JetBrains Mono"']; await Promise.all(f.map(x=>document.fonts.load(x))); await document.fonts.ready; });
  const html = await p.evaluate(({B,header,titleBlock})=>{
    const body=document.body; const sheets=[];
    function newSheet(first){ const a=document.createElement('article'); a.className='sheet';
      a.innerHTML = header + `<div class="content">${first?titleBlock:''}</div><footer class="doc-footer"><div>x</div><div>x</div></footer>`;
      body.appendChild(a); sheets.push(a); return a.querySelector('.content'); }
    function fits(c){ const s=c.closest('.sheet'); const f=s.querySelector('.doc-footer'); const cs=getComputedStyle(s);
      const limit = s.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom);
      return f.getBoundingClientRect().bottom <= limit - 8; }
    let c=newSheet(true);
    const add=(htmlStr)=>{ const t=document.createElement('template'); t.innerHTML=htmlStr.trim(); const el=t.content.firstChild; c.appendChild(el); return el; };
    for (let k=0;k<B.blocks.length;k++){
      const bl=B.blocks[k];
      if (bl.table){
        let rows=bl.rows.slice();
        while(rows.length){
          const tb=add(`<table class="t">${bl.head}<tbody></tbody></table>`); const tbody=tb.querySelector('tbody'); let n=0;
          while(rows.length){ const t=document.createElement('template'); t.innerHTML=rows[0]; tbody.appendChild(t.content.firstChild);
            if(!fits(c)){ tbody.lastChild.remove(); break; } rows.shift(); n++; }
          if(n===0){ tb.remove(); c=newSheet(false); continue; }
          if(rows.length){ c=newSheet(false); }
        }
        continue;
      }
      if (bl.list){
        let items=bl.items.slice();
        while(items.length){
          const ul=add(`<${bl.list} class="${bl.list}"></${bl.list}>`); let n=0;
          while(items.length){ const t=document.createElement('template'); t.innerHTML=items[0]; ul.appendChild(t.content.firstChild);
            if(!fits(c)){ ul.lastChild.remove(); break; } items.shift(); n++; }
          if(n===0){ ul.remove(); c=newSheet(false); continue; }
          if(items.length) c=newSheet(false);
        }
        continue;
      }
      let el=add(bl.h);
      if(!fits(c)){ el.remove(); c=newSheet(false); el=add(bl.h); }
      if(bl.keep){ // el título no se queda solo al pie de la hoja
        const nx=B.blocks[k+1]; if(nx){ const probe=add(nx.h||(nx.table?`<table class="t">${nx.head}<tbody>${nx.rows[0]}</tbody></table>`:`<${nx.list} class="${nx.list}">${nx.items[0]}</${nx.list}>`));
          const ok=fits(c); probe.remove(); if(!ok){ el.remove(); c=newSheet(false); add(bl.h); } }
      }
    }
    const N=sheets.length; sheets.forEach((s,i)=>{ s.dataset.page=i+1; s.querySelector('.doc-footer').outerHTML; });
    return { N, html: body.innerHTML };
  },{B,header,titleBlock});
  let out = html.html; let i=0; out = out.replace(/<footer class="doc-footer"><div>x<\/div><div>x<\/div><\/footer>/g, ()=>footer(`${++i}/${html.N}`));
  const doc = `<!DOCTYPE html>\n<html lang="es-MX">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Plan de transición · Landing APTO v2 (Norma) · 22 al 24-sep-2026</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\n${B.style}\n</head>\n<body>${out}</body>\n</html>\n`;
  fs.writeFileSync(outHtml, doc);
  const q = await b.newPage(); await q.goto('file://'+outHtml, { waitUntil:'networkidle' }); await q.evaluate(async()=>{ await document.fonts.ready; });
  const qa = await q.evaluate(()=>[...document.querySelectorAll('.sheet')].map((s,i)=>{ const f=s.querySelector('.doc-footer').getBoundingClientRect().bottom; const lim=s.getBoundingClientRect().bottom-parseFloat(getComputedStyle(s).paddingBottom); const over=[...s.querySelectorAll('.content *')].some(e=>e.scrollWidth>e.clientWidth+1 && getComputedStyle(e).overflowX!=='visible'); return {p:i+1, over: Math.round(f-lim), ok: f<=lim+0.5, wide: s.querySelector('.content').scrollWidth>s.querySelector('.content').clientWidth+1}; }));
  console.log('hojas', html.N, '| desbordes vertical', qa.filter(x=>!x.ok).map(x=>x.p+':'+x.over+'px'), '| horizontal', qa.filter(x=>x.wide).map(x=>x.p));
  await q.pdf({ path: outPdf, format:'A4', printBackground:true, preferCSSPageSize:true });
  await b.close();
})();
