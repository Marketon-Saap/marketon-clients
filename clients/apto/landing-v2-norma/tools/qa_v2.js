const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs=require('fs');
const Q = process.argv[2]; const ROOT = process.env.HOME + '/Documents/apto-landing'; const URL='http://127.0.0.1:8765/v2/';
const R = { widths: {}, checks: [] }; const ok=(name,pass,detail)=>{ R.checks.push({name,pass:!!pass,detail}); console.log((pass?'PASS':'FAIL')+' · '+name+(detail?' · '+detail:'')); };
(async () => {
  const srv = spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'}); await new Promise(r=>setTimeout(r,900));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const blocked=[]; const failed=[]; const consoleErr=[];
  await ctx.route(/googletagmanager|hs-scripts|clarity\.ms|facebook\.net|hsforms\.com|youtube\.com|google-analytics|doubleclick/, r => { blocked.push(r.request().url().slice(0,60)); r.abort(); });
  await ctx.route(/apto-landing-api.*\/submit/, r => r.fulfill({ status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify({ ok:true, contactId:'QA-C', dealId:'QA-D', leadId:999 }) }));
  const newPage = async (w,h) => { const p = await ctx.newPage(); await p.setViewportSize({width:w,height:h}); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED|ERR_BLOCKED/.test(m.text())) consoleErr.push(m.text().slice(0,140)); }); p.on('requestfailed',r=>{ if(!/googletagmanager|hs-scripts|clarity|facebook|hsforms|youtube|google-analytics|doubleclick/.test(r.url())) failed.push(r.url()); }); p.on('response',r=>{ if(r.status()>=400) failed.push(r.status()+' '+r.url()); }); return p; };
  // 1. anchuras
  for (const [w,h] of [[360,780],[390,844],[768,1024],[1024,768],[1440,900]]) {
    const p = await newPage(w,h); await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(600);
    const m = await p.evaluate(()=>({ sw:document.documentElement.scrollWidth, iw:innerWidth, h1:document.querySelectorAll('h1').length, sticky:getComputedStyle(document.querySelector('.sticky-cta-mobile')).display, modalHidden:document.getElementById('form-modal').hidden }));
    R.widths[w]=m; ok(`sin desbordamiento horizontal @${w}`, m.sw<=m.iw, `scrollWidth ${m.sw} / ${m.iw}`);
    if (w===390||w===1440) await p.screenshot({ path:`${Q}/v2-${w}-full.png`, fullPage:true });
    await p.close();
  }
  ok('consola sin errores', consoleErr.length===0, consoleErr.join(' | ')); ok('sin 404/fallos de assets', failed.length===0, failed.join(' | '));
  // 2. desktop: openers -> modal
  const p = await newPage(1440,900); await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(500);
  const openers = await p.$$eval('a[href="#cta-form"]', els => els.map(e=>e.dataset.track||'(sin track)'));
  ok('aperturas del formulario (a[href=#cta-form])', openers.length>=7, openers.length+' · '+openers.join(','));
  let opened=0;
  for (let i=0;i<openers.length;i++) {
    const el=(await p.$$('a[href="#cta-form"]'))[i]; const vis=await el.isVisible(); if(!vis) continue;
    await el.evaluate(e=>{ e.scrollIntoView({block:'center'}); e.click(); }); await p.waitForTimeout(350);
    const st = await p.evaluate(()=>({ hidden:document.getElementById('form-modal').hidden, inHost:document.getElementById('form-card').parentElement.id, lock:document.body.classList.contains('form-modal-open') }));
    if(!st.hidden && st.inHost==='form-modal-host' && st.lock) opened++;
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  }
  const back = await p.evaluate(()=>document.getElementById('form-card').parentElement.id);
  ok('cada opener visible abre el modal y Escape lo cierra', opened>0 && back==='form-inline-host', `abiertos ${opened} · form-card de vuelta en ${back}`);
  const dl1 = await p.evaluate(()=>window.dataLayer.map(e=>e.event));
  ok('dataLayer: hero_cta_click + form_modal_open + form_modal_close', dl1.includes('hero_cta_click')&&dl1.includes('form_modal_open')&&dl1.includes('form_modal_close'), [...new Set(dl1)].join(','));
  // modal screenshot
  await p.click('.hero .btn-glass'); await p.waitForTimeout(400); await p.screenshot({ path:`${Q}/v2-1440-modal.png` });
  // 3. validaciones negativas dentro del modal
  await p.fill('#f-firstname','QA'); await p.fill('#f-lastname','Prueba'); await p.fill('#f-email','correo-invalido'); await p.fill('#f-company','Marketon QA'); await p.fill('#f-phone_number','123456789'); await p.fill('#f-message','Prueba local de QA v2, no enviar.');
  await p.click('#form-submit'); await p.waitForTimeout(300);
  const errs = await p.evaluate(()=>({ email:document.getElementById('err-email').textContent, phone:document.getElementById('err-phone_number').textContent, consent:document.getElementById('err-privacy_consent').textContent, hidden:document.getElementById('diagnostico-form').hidden }));
  ok('negativas: correo, telefono de 9 digitos y consentimiento bloquean', errs.email && errs.phone && errs.consent && !errs.hidden, JSON.stringify(errs));
  await p.fill('#f-phone_number','33181455281'); const ph11 = await p.evaluate(()=>document.getElementById('f-phone_number').value);
  ok('telefono: el input recorta a 10 digitos (MX)', ph11.length===10, ph11);
  // 4. envio positivo con Worker simulado
  await p.fill('#f-email','qa@marketon.mx'); await p.fill('#f-phone_number','3318145528'); await p.check('#f-privacy_consent'); await p.click('#form-submit'); await p.waitForTimeout(1200);
  const sub = await p.evaluate(()=>{ const ev=window.dataLayer.filter(e=>e.event==='form_submit_success')[0]; return { ev: ev? Object.keys(ev): null, formHidden:document.getElementById('diagnostico-form').hidden, successVisible:!document.getElementById('form-success').hidden, fail: window.dataLayer.some(e=>e.event==='form_submit_fail'), contact: ev&&ev.contact_id, phone: ev&&ev.ph_raw }; });
  const diag = await p.evaluate(()=>({ events: window.dataLayer.slice(-6).map(e=>e.event), msg: document.getElementById('form-message').textContent, errs: [...document.querySelectorAll('.form-field__error')].map(e=>e.textContent).filter(Boolean) }));
  ok('envio: form_submit_success con contrato completo, exito visible, sin fallback', sub.ev && sub.formHidden && sub.successVisible && !sub.fail && sub.contact==='QA-C' && sub.phone==='+523318145528', JSON.stringify({keys:sub.ev&&sub.ev.length, contact:sub.contact, phone:sub.phone, diag}));
  const need=['event_id','em_raw','ph_raw','fn_raw','ln_raw','company','jobtitle','industry','company_size','country','message_length','has_problem_desc','gclid','fbclid','contact_id','deal_id','lead_id','value','currency'];
  ok('claves que leen las variables DL-* de GTM', sub.ev && need.every(k=>sub.ev.includes(k)), need.filter(k=>!(sub.ev||[]).includes(k)).join(',')||'todas');
  await p.screenshot({ path:`${Q}/v2-1440-exito-modal.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // 5. video facade
  await p.evaluate(()=>document.getElementById('yt-facade-alvaro').scrollIntoView()); await p.click('#yt-facade-alvaro'); await p.waitForTimeout(400);
  const yt = await p.evaluate(()=>{ const f=document.querySelector('#yt-facade-alvaro iframe'); return f? f.src : null; });
  ok('video: iframe con enablejsapi=1 y origin (trigger GTM 90)', yt && /enablejsapi=1/.test(yt) && /origin=/.test(yt), (yt||'sin iframe').slice(0,110));
  ok('dataLayer: video_play', (await p.evaluate(()=>window.dataLayer.some(e=>e.event==='video_play'))));
  // 6. section_view
  for (let y=0;y<9000;y+=600){ await p.evaluate(v=>window.scrollTo(0,v),y); await p.waitForTimeout(120); }
  const sv = await p.evaluate(()=>window.dataLayer.filter(e=>e.event==='section_view').map(e=>e.section_id));
  ok('section_view por seccion', sv.length>=8, sv.join(','));
  // 7. expansores y footer tracks
  await p.evaluate(()=>document.querySelector('summary[data-producto]').scrollIntoView()); await p.click('summary[data-producto]'); await p.evaluate(()=>document.querySelector('.footer a[href^="mailto"]').scrollIntoView());
  const t2 = await p.evaluate(()=>{ document.querySelector('.footer a[href^="tel:"]').addEventListener('click',e=>e.preventDefault(),{once:true}); document.querySelector('.footer a[href^="tel:"]').click(); return window.dataLayer.map(e=>e.event); });
  ok('producto_expand + footer_tel_click', t2.includes('producto_expand') && t2.includes('footer_tel_click'));
  await p.close();
  // 8. movil: sticky + menu + bottom sheet
  const m = await newPage(390,844); await m.goto(URL,{waitUntil:'load'}); await m.waitForTimeout(500);
  const s0 = await m.evaluate(()=>document.querySelector('.sticky-cta-mobile').classList.contains('is-hidden'));
  await m.evaluate(()=>window.scrollTo(0,1800)); await m.waitForTimeout(500);
  const s1 = await m.evaluate(()=>({ hidden:document.querySelector('.sticky-cta-mobile').classList.contains('is-hidden'), disp:getComputedStyle(document.querySelector('.sticky-cta-mobile')).display }));
  ok('barra fija movil: oculta con el CTA del hero a la vista, visible despues', s0===true && s1.hidden===false && s1.disp==='block', JSON.stringify({s0,s1}));
  await m.screenshot({ path:`${Q}/v2-390-sticky.png` });
  await m.click('.sticky-cta-mobile__btn'); await m.waitForTimeout(450);
  const bs = await m.evaluate(()=>({ hidden:document.getElementById('form-modal').hidden, top:document.querySelector('.form-modal__panel').getBoundingClientRect().top, stickyDisp:getComputedStyle(document.querySelector('.sticky-cta-mobile')).display }));
  ok('movil: la barra abre el bottom sheet y la barra se esconde', !bs.hidden && bs.top>0 && bs.stickyDisp==='none', JSON.stringify(bs));
  await m.screenshot({ path:`${Q}/v2-390-bottom-sheet.png` }); await m.keyboard.press('Escape'); await m.waitForTimeout(200);
  await m.evaluate(()=>window.scrollTo(0,0)); await m.click('.menu-toggle'); await m.waitForTimeout(250);
  const mn = await m.evaluate(()=>({ open: document.getElementById('mobile-nav').hidden===false, dl: window.dataLayer.some(e=>e.event==='nav_mobile_menu_open') }));
  ok('menu movil abre y emite nav_mobile_menu_open', mn.open && mn.dl, JSON.stringify(mn));
  await m.click('#mobile-nav a[href="#casos"]'); await m.waitForTimeout(400);
  const mn2 = await m.evaluate(()=>({ closed: document.getElementById('mobile-nav').hidden===true, y: Math.round(scrollY), dl: window.dataLayer.filter(e=>e.event==='nav_mobile_link_click').length }));
  ok('menu movil: link cierra el menu, hace scroll y emite nav_mobile_link_click', mn2.closed && mn2.y>200 && mn2.dl>=1, JSON.stringify(mn2));
  await m.close();
  // 9. hero por intencion
  const hp = await newPage(1440,900); await hp.goto(URL+'?utm_content=199879292282&utm_source=google&utm_medium=cpc',{waitUntil:'load'}); await hp.waitForTimeout(300);
  const hv = await hp.evaluate(()=>({ v:document.documentElement.getAttribute('data-hero-variant'), sub:document.querySelector('.hero-sub').textContent.slice(0,60) }));
  ok('hero por intencion (grupo base 199879292282)', hv.v==='199879292282' && hv.sub.startsWith('Diseñamos y desarrollamos tu producto digital.'), hv.sub);
  await hp.screenshot({ path:`${Q}/v2-1440-hero-variante.png` });
  await hp.goto(URL+'#cta-form',{waitUntil:'load'}); await hp.waitForTimeout(800);
  ok('deep link #cta-form abre el modal', await hp.evaluate(()=>document.getElementById('form-modal').hidden===false));
  await hp.close();
  ok('terceros bloqueados en local (GTM/HubSpot/Pixel no llamados)', blocked.length>0, blocked.length+' peticiones bloqueadas');
  fs.writeFileSync(`${Q}/qa-local-resultados.json`, JSON.stringify(R,null,2));
  await browser.close(); srv.kill();
  console.log('\nRESUMEN', R.checks.filter(c=>c.pass).length,'/',R.checks.length,'pasan');
})().catch(e=>{ console.error('ERROR',e); process.exit(1); });
