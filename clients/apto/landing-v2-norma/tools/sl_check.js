const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{w:1440,h:900,n:'desktop'},{w:390,h:844,n:'movil'}]) {
    const p = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
    for (const id of ['casos','servicios','proyectos','faq','metodo']) {
      await p.goto(`https://landing.apto.mx/?sl=${id}&utm_source=smoke#${id}`, { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      const r = await p.evaluate(i => ({ y: Math.round(scrollY), top: Math.round(document.getElementById(i).getBoundingClientRect().top) }), id);
      console.log(vp.n, id, JSON.stringify(r), (r.top >= -10 && r.top <= 200) ? 'OK' : 'FALLA');
    }
    await p.close();
  }
  await b.close();
})();
