const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport:{width:1440,height:900} });
  const hits = [];
  // Worker simulado: no crea contacto, trato ni registro en D1
  await ctx.route(/apto-landing-api.*\/submit/, r => r.fulfill({ status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify({ ok:true, contactId:'QA-C', dealId:'QA-D', leadId:999 }) }));
  // Envíos a Ads, Meta y GA4: se capturan y se bloquean para no registrar conversiones falsas
  await ctx.route(/googleadservices\.com|google\.com\/pagead|doubleclick\.net\/pagead|facebook\.com\/tr|google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|google\.com\/ccm|hsforms|hubspot\.com\/.*collect/, r => { hits.push(r.request().url()+' '+(r.request().postData()||'')); r.abort(); });
  const p = await ctx.newPage();
  await p.goto('https://landing.apto.mx/?utm_source=smoke&utm_medium=qa&utm_campaign=ec_v75', { waitUntil:'load' });
  await p.waitForTimeout(2500);
  await p.evaluate(()=>document.getElementById('cta-form').scrollIntoView());
  await p.fill('#f-firstname','QA'); await p.fill('#f-lastname','PRUEBA'); await p.fill('#f-jobtitle','DIRECTOR');
  await p.fill('#f-company','MARKETON QA'); await p.fill('#f-email','qa-ec@marketon.mx'); await p.fill('#f-phone_number','3318145528');
  await p.fill('#f-message','Prueba de conversiones mejoradas, Worker simulado, no es un lead.');
  await p.check('#f-privacy_consent'); await p.click('#form-submit'); await p.waitForTimeout(5000);
  const dl = await p.evaluate(()=> (window.dataLayer||[]).filter(e=>e&&e.event==='form_submit_success').map(e=>({em:!!e.em_raw, ph:e.ph_raw})));
  console.log('form_submit_success en dataLayer:', JSON.stringify(dl));
  const conv = hits.filter(u=>/7FaBCKDy7s8cEN7v0sYD/.test(u));
  console.log('pings de la conversión principal:', conv.length);
  for (const u of conv) { const q=new URL(u).searchParams; console.log(' ', new URL(u).host, '| em:', q.has('em') ? 'sí' : 'no', '| ec_mode:', q.get('ec_mode'), '| label:', q.get('label')); }
  console.log('Meta Lead:', hits.filter(u=>/facebook\.com\/tr/.test(u) && /ev=Lead|"Lead"|ev%3DLead/.test(u)).length, '| GA4 generate_lead:', hits.filter(u=>/collect/.test(u)&&/en=generate_lead/.test(u)).length);
  await b.close();
})();
