import re,os,shutil,json,html
C="/Users/JPEREZ/Documents/Marketon/SaaP/Claude Code/Clientes/Apto/03-Estrategia/Fase-2-Plan-MKT/Landing/Entrega-cliente-v2-Norma-2026-09-22"
R=os.path.expanduser('~/Documents/apto-landing'); V=f'{R}/v2'; S=os.getcwd()
VER='20260922a'
if os.path.exists(V): shutil.rmtree(V)
os.makedirs(V); shutil.copytree(f'{C}/assets',f'{V}/assets',ignore=shutil.ignore_patterns('.DS_Store'))
shutil.copy(f'{R}/assets/og-image-apto-official.png',f'{V}/assets/og-image-apto-official.png')
s=open(f'{C}/index.html',encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, f'NO ENCONTRADO: {old[:80]}'
    s=s.replace(old,new,count)
# --- head ---
rep('<meta content="width=device-width,initial-scale=1" name="viewport"/>','<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
rep('<title>APTO — Hagamos realidad el cambio</title>','<title>APTO · Hagamos realidad el cambio</title>')
rep('<meta content="APTO — Hagamos realidad el cambio" property="og:title"/>','<meta content="APTO · Hagamos realidad el cambio" property="og:title"/>')
rep('<meta content="noindex,nofollow" name="robots"/>','<meta name="robots" content="noindex, nofollow" data-staging="v2"><!-- CUTOVER: content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" -->')
head_extra='''
<meta name="author" content="APTO Innovación S.A.P.I. de C.V.">
<link rel="canonical" href="https://landing.apto.mx/">
<link rel="alternate" hreflang="es-MX" href="https://landing.apto.mx/">
<link rel="alternate" hreflang="x-default" href="https://landing.apto.mx/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://landing.apto.mx/">
<meta property="og:locale" content="es_MX">
<meta property="og:site_name" content="APTO">
<meta property="og:image" content="https://landing.apto.mx/assets/og-image-apto-official.png"><!-- FASE 2: og image nueva 1200x630 con la ilustracion Norma -->
<meta property="og:image:secure_url" content="https://landing.apto.mx/assets/og-image-apto-official.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="APTO · Estrategia, diseño y tecnología">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="APTO · Hagamos realidad el cambio">
<meta name="twitter:image" content="https://landing.apto.mx/assets/og-image-apto-official.png">
<link rel="apple-touch-icon" href="assets/favicon-official.png">
<link rel="preconnect" href="https://www.googletagmanager.com">
<link rel="preconnect" href="https://js.hs-scripts.com">
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/ClashGrotesk-Variable.woff2" crossorigin>
<link rel="preload" as="image" type="image/webp" imagesrcset="assets/hero-elegido-640.webp 640w, assets/hero-elegido-1024.webp 1024w" imagesizes="(max-width: 780px) 100vw, 70vw" fetchpriority="high">
<!-- Google Tag Manager · GTM-K7J6MQ8 · la capa de medicion vive en GTM, no tocar -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K7J6MQ8');</script>
<!-- End Google Tag Manager -->
<!-- HubSpot tracking · cookie hutk para atribucion en el CRM -->
<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/2583031.js"></script>
'''
rep('<meta content="#01122d" name="theme-color"/>','<meta content="#01122d" name="theme-color"/>'+head_extra)
rep('<link href="styles.css" rel="stylesheet"/>',f'<link href="styles.css?v={VER}" rel="stylesheet"/>')
# hero por intencion (inline, temprano) · variantes de produccion, primera frase, como prefijo del subtitulo
variants={"202648873834":"Transformación digital en tu empresa.","202648873354":"Diseñamos y construimos el software de tu operación.","202648873394":"Digitalizamos la operación de tu empresa.","202648873434":"Diseñamos la experiencia de tus clientes.","202648873114":"Estrategia de negocio que parte de tu cliente.","202648873634":"Innovación que sale del papel en tu empresa.","202648873154":"Diseñamos tu experiencia de servicio omnicanal.","202648873874":"Armamos el equipo de innovación de tu empresa.","202648873594":"Diseñamos y desarrollamos tu producto digital.","202648873914":"Validamos y construimos tu producto digital."}
# los ids del experimento (2026488738xx) se mapean tambien a los grupos de la campana base (mismo orden semantico)
base_map={"203507053092":"202648873834","198954015072":"202648873354","198954016072":"202648873394","199042708752":"202648873434","197062139406":"202648873114","199885822522":"202648873634","197070239423":"202648873154","203507055532":"202648873874","199879292282":"202648873594","204037436091":"202648873914"}
vm={k:v for k,v in variants.items()}
for b,e in base_map.items(): vm[b]=variants[e]
intent='<script>/* Hero por intencion · subtitulo variable por grupo de anuncio (utm_content={adgroupid}) · frases revisadas por Alvaro */(function(){try{var m='+json.dumps(vm,ensure_ascii=False)+';var id=new URLSearchParams(location.search).get("utm_content");var v=id&&m[id];if(!v)return;document.documentElement.setAttribute("data-hero-variant",id);document.addEventListener("DOMContentLoaded",function(){var p=document.querySelector(".hero-sub");if(!p)return;p.textContent=v+" "+p.textContent;});}catch(e){}})();</script>'
# JSON-LD
faq_block=s[s.find('id="faq"'):s.find('<footer')]
qa=re.findall(r'<summary[^>]*>(.*?)</summary>\s*<div[^>]*>(.*?)</div>',faq_block,flags=re.S)
def clean(t): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',t))).strip()
faq_ld={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":clean(q),"acceptedAnswer":{"@type":"Answer","text":clean(a)}} for q,a in qa]}
org_ld={"@context":"https://schema.org","@type":"ProfessionalService","@id":"https://apto.mx/#organization","name":"APTO","legalName":"APTO Innovación S.A.P.I. de C.V.","url":"https://apto.mx","logo":"https://landing.apto.mx/assets/apto-logo.png","image":"https://landing.apto.mx/assets/og-image-apto-official.png","description":"Estrategia, diseño y tecnología. Convertimos retos de negocio en servicios, productos y herramientas que tu organización puede poner en práctica.","slogan":"Hagamos realidad el cambio.","email":"info@apto.mx","telephone":"+52-33-1814-5528","priceRange":"$$$","areaServed":{"@type":"Country","name":"México"},"address":{"@type":"PostalAddress","addressLocality":"Guadalajara","addressRegion":"JAL","addressCountry":"MX","streetAddress":"Ostia 2750 Int. 3, Providencia","postalCode":"44630"},"contactPoint":[{"@type":"ContactPoint","telephone":"+52-33-1814-5528","contactType":"sales","email":"info@apto.mx","areaServed":"MX","availableLanguage":["Spanish","English"]}],"sameAs":["https://www.linkedin.com/company/apto-innovacion/","https://www.instagram.com/apto.innovation/","https://www.facebook.com/apto.innovation/","https://medium.com/apto-magazine","https://www.tiktok.com/@apto.innovation"]}
ld='\n<script type="application/ld+json">'+json.dumps(org_ld,ensure_ascii=False)+'</script>\n<script type="application/ld+json">'+json.dumps(faq_ld,ensure_ascii=False)+'</script>\n'
rep('</head>',intent+ld+'</head>')
# --- body ---
rep('<body>','<body>\n<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K7J6MQ8" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager -->')
rep('<a class="skip-link" href="#main">Saltar al contenido</a>','<a class="skip-link" href="#main">Saltar al contenido</a><a class="skip-link" href="#cta-form" data-track="skip_link_form_click">Saltar al formulario de contacto</a>')
rep('<a aria-label="APTO — Inicio" class="logo-mod" href="#hero">','<a aria-label="APTO, inicio" class="logo-mod" href="#hero" data-track="nav_logo_click">')
# nav desktop
i=s.find('<nav aria-label="Navegación principal" class="menu-bar">'); j=s.find('</nav>',i)
nav=s[i:j]; nav=re.sub(r'<a href="#([a-z-]+)">',lambda m:f'<a href="#{m.group(1)}" data-track="nav_link_click" data-nav-link="{m.group(1)}">',nav); s=s[:i]+nav+s[j:]
rep('<a class="btn-head" href="#cta-form">','<a class="btn-head" href="#cta-form" data-track="nav_cta_click">')
i=s.find('<nav aria-label="Navegación móvil"'); j=s.find('</nav>',i); nav=s[i:j]
nav=nav.replace('<a href="#cta-form">','<a href="#cta-form" data-track="nav_mobile_menu_cta_click" data-mobile-menu-close>')
nav=re.sub(r'<a href="#([a-z]+)">',lambda m:f'<a href="#{m.group(1)}" data-track="nav_mobile_link_click" data-nav-link="{m.group(1)}" data-mobile-menu-close>',nav); s=s[:i]+nav+s[j:]
rep('<a class="btn btn-glass" href="#cta-form">','<a class="btn btn-glass" href="#cta-form" data-track="hero_cta_click">')
rep('<a class="hero-case-link" href="#casos">','<a class="hero-case-link" href="#casos" data-track="hero_secondary_click">')
# CTAs por seccion
def section(idv):
    a=s.find(f'id="{idv}"'); return a
order=['hero','categoria','problema','productos','casos','proyectos','metodo','conoce-equipo','cta-form','faq']
cta_names={'problema':'problema_cta_click','productos':'categoria_cta_click','casos':'casos_cta_click','proyectos':'proyectos_cta_click','metodo':'metodo_cta_click','conoce-equipo':'conoce_cta_click','faq':'faq_cta_click'}
for n,idv in enumerate(order):
    a=section(idv); b=section(order[n+1]) if n+1<len(order) else s.find('<footer')
    seg=s[a:b]
    if idv in cta_names:
        seg2=re.sub(r'<a class="(section-cta__link|caso__link|conoce__cta-link)" href="#cta-form">',lambda m:f'<a class="{m.group(1)}" href="#cta-form" data-track="{cta_names[idv]}">',seg)
        assert seg2!=seg, idv; seg=seg2
    if idv=='proyectos': seg=seg.replace('href="https://apto.mx/proyectos/"','href="https://apto.mx/proyectos/" data-track="proyectos_ver_mas_click"',1)
    if idv=='productos': seg=seg.replace('<summary data-producto=','<summary data-track="producto_expand" data-producto=')
    if idv=='metodo': seg=seg.replace('<summary data-taller=','<summary data-track="taller_expand" data-taller=')
    if idv=='conoce-equipo':
        seg=seg.replace('href="https://www.linkedin.com/in/alvaroplasencia/"','href="https://www.linkedin.com/in/alvaroplasencia/" data-track="partner_linkedin_alvaro_click"')
        seg=seg.replace('href="https://www.linkedin.com/in/cbeltran1212/"','href="https://www.linkedin.com/in/cbeltran1212/" data-track="partner_linkedin_carlos_click"')
        seg=seg.replace('aria-label="Reproducir: APTO — Innovación especializada en product y business design"','aria-label="Reproducir: APTO, innovación especializada en product y business design"')
    s=s[:a]+seg+s[b:]
# footer
i=s.find('<footer'); f=s[i:]
def ftrack(m):
    attrs=m.group(1); href=re.search(r'href="([^"]*)"',attrs).group(1)
    if href.startswith('mailto:'): t='footer_email_click'
    elif href.startswith('tel:'): t='footer_tel_click'
    elif 'maps.app' in href: t='footer_maps_click'
    elif href=='#cta-form': t='footer_cta_click'
    elif href.startswith('#'): t='footer_section_click'
    elif any(x in href for x in ['linkedin.com','instagram.com','medium.com','tiktok.com','facebook.com']): t='footer_social_click'
    else: t='footer_external_click'
    return f'<a {attrs} data-track="{t}">'
f=re.sub(r'<a ([^>]*href="[^"]*"[^>]*)>',ftrack,f)
f=f.replace('<div>© 2026 APTO Innovación Digital · Todos los derechos reservados</div>','<div>© 2026 APTO Innovación Digital · Todos los derechos reservados · <a href="/aviso-de-privacidad/" target="_blank" rel="noopener" data-track="footer_section_click">Aviso de privacidad</a></div>')
s=s[:i]+f
# form
rep('<p class="preview-note">Vista previa local: puedes probar el formulario; los datos no se envían.</p>','')
rep('<form data-hs-do-not-collect="true" data-mode="local-preview" id="diagnostico-form" novalidate="">','<form id="diagnostico-form" novalidate="" autocomplete="on">')
rep('<a href="https://landing.apto.mx/aviso-de-privacidad/" rel="noopener" target="_blank">aviso de privacidad</a>','<a href="/aviso-de-privacidad/" rel="noopener" target="_blank">aviso de privacidad</a>')
rep('<span id="submit-label">Enviar mi reto</span>','<span id="submit-label" data-label="Enviar mi reto">Enviar mi reto</span>')
success='''
<div id="form-success" class="form-success" hidden tabindex="-1" role="status" aria-live="polite">
<div class="form-success__icon" aria-hidden="true">✓</div>
<h3 class="form-success__title">Listo, ya lo tenemos.</h3>
<p class="form-success__body">Carlos te escribe al correo que nos dejaste. Si prefieres que te llame, dínoslo ahí mismo.</p>
<button type="button" class="form-success__back" data-close-form-modal>Seguir viendo la página</button>
</div>'''
rep('<p class="form-trust-micro">Primera conversación sin costo y sin compromiso.</p>\n</form>','<p class="form-trust-micro">Primera conversación sin costo y sin compromiso.</p>\n</form>'+success)
modal='''
<!-- Form modal · bottom sheet en movil, dialogo centrado en desktop · mismo #form-card que la version inline (teletransporte) -->
<div class="form-modal" id="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-modal-title" hidden>
<div class="form-modal__backdrop" data-close-form-modal></div>
<div class="form-modal__panel">
<button type="button" class="form-modal__close" aria-label="Cerrar" data-close-form-modal><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg></button>
<div class="form-modal__handle" aria-hidden="true"></div>
<div class="form-modal__scroll">
<div class="form-modal__header">
<p class="eyebrow">El siguiente paso</p>
<h3 id="form-modal-title" class="form-modal__title">Cuéntanos qué quieres transformar.</h3>
<p class="form-modal__sub">Comparte tu reto con <strong>Carlos Beltrán</strong>, socio de APTO. La primera conversación nos ayuda a entender tu contexto y definir un posible siguiente paso.</p>
</div>
<div id="form-modal-host"></div>
</div>
</div>
</div>
'''
rep('<section class="section" id="faq">',modal+'<section class="section" id="faq">')
sticky='<div class="sticky-cta-mobile" aria-hidden="false"><a href="#cta-form" class="btn sticky-cta-mobile__btn" data-track="sticky_cta_click">Hablemos de tu reto <span aria-hidden="true">↗</span></a></div>\n'
rep('<script src="script.js"></script>',sticky+f'<script src="script.js?v={VER}"></script><script src="capture.js?v={VER}"></script>')

# ===== PROPUESTA 22-sep · relevancia para Ads · pendiente de aprobacion APTO (PROPUESTA=True para incluirla) =====
PROPUESTA = __import__('os').environ.get('PROPUESTA','1')=='1'
if PROPUESTA:
    rep('<title>APTO · Hagamos realidad el cambio</title>','<title>Hagamos realidad el cambio · Estrategia, diseño y tecnología · APTO</title><!-- PROPUESTA title opcion A -->')
    rep('<meta content="Estrategia, diseño y tecnología para transformar retos de negocio en servicios, productos y herramientas que tu organización puede poner en práctica." name="description"/>','<meta name="description" content="Estrategia, diseño y tecnología en un mismo equipo. Convertimos retos de negocio en servicios, productos y herramientas que tu organización puede operar."><!-- PROPUESTA description -->')
    servicios = [("Transformación digital","productos"),("Diseño de servicios y experiencias omnicanales","productos"),("Experiencia del cliente","productos"),("Diseño, validación y desarrollo de productos digitales","productos"),("Desarrollo de software","productos"),("Arquitectura de software empresarial","productos"),("Estrategia de negocio","categoria"),("Equipos de innovación y diseño","productos"),("Capacitación en diseño e innovación","metodo")]
    chips=''.join(f'<li><a href="#{a}" data-track="servicio_chip_click" data-item="{t}">{t}</a></li>' for t,a in servicios)
    bloque=f"""
<!-- PROPUESTA 22-sep · bloque "Qué hacemos" con servicios publicados en apto.mx · pendiente de aprobación APTO -->
<section class="servicios" id="servicios" aria-labelledby="servicios-title">
<div class="container">
<p class="eyebrow">Qué hacemos</p>
<h2 id="servicios-title" class="servicios__title">Estrategia de negocio, diseño de servicios, productos digitales y desarrollo de software para tu organización.</h2>
<ul class="servicios__list">{chips}</ul>
</div>
</section>
<!-- /PROPUESTA -->
"""
    rep('<section class="categoria categoria--capacidades" id="categoria"',bloque+'<section class="categoria categoria--capacidades" id="categoria"')
    temas={"servicio":"Diseño de servicios y experiencia del cliente","digital":"Diseño, validación y desarrollo de productos digitales","operacion":"Desarrollo de software y arquitectura de software empresarial","usuario":"Enfoque centrado en el usuario y estrategia de negocio","innovacion":"Equipos de innovación y validación de productos","omnicanal":"Transformación digital y ecosistemas de servicio omnicanales"}
    def add_tema(m):
        art=m.group(0); k=re.search(r'data-producto="([a-z]+)"',art)
        if not k or k.group(1) not in temas: return art
        return art.replace('</h3>\n</div>',f'</h3>\n<p class="reto__tema">{temas[k.group(1)]}</p><!-- PROPUESTA subtítulo temático -->\n</div>',1)
    s2=re.sub(r'<article class="reto">.*?</article>',add_tema,s,flags=re.S); assert s2.count('reto__tema')==6, s2.count('reto__tema'); s=s2
_t=re.sub(r'<[^>]+>','',s); print('em dash en copy del cliente (se respeta):',[_t[max(0,m.start()-40):m.start()+30].replace('\n',' ') for m in re.finditer('—',_t)])
open(f'{V}/index.html','w',encoding='utf-8').write(s)
# --- styles.css ---
css=open(f'{C}/styles.css',encoding='utf-8').read()
css+='''
/* ===== PROPUESTA 22-sep · bloque Qué hacemos + subtítulo temático de retos ===== */
.servicios{background:var(--paper-2);padding-block:clamp(48px,6vw,80px)!important}
.servicios__title{font-size:clamp(1.5rem,2.6vw,2.25rem);line-height:1.15;letter-spacing:-.02em;max-width:24ch;margin-bottom:28px}
.servicios__list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.servicios__list a{display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;border:1px solid var(--line);border-radius:var(--radius);background:#fff;color:var(--ink);font-size:.9375rem;font-weight:500;transition:border-color .2s,background .2s}
.servicios__list a:hover{border-color:var(--ink);background:var(--paper)}
.reto__tema{font:500 .8125rem/1.4 var(--sans);letter-spacing:.06em;text-transform:uppercase;color:#bcb6ac;margin:6px 0 0}
/* ===== Marketon · capa de captura (modal, barra fija, exito) · tokens Norma ===== */
.form-modal{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center}
.form-modal[hidden]{display:none}
.form-modal__backdrop{position:absolute;inset:0;background:rgba(1,18,45,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.form-modal__panel{position:relative;width:100%;max-width:600px;max-height:92dvh;background:var(--paper-2);color:var(--ink);border-radius:var(--radius) var(--radius) 0 0;display:flex;flex-direction:column;box-shadow:0 -12px 48px -8px rgba(0,0,0,.4);animation:fm-in .32s var(--ease) both}
@keyframes fm-in{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.form-modal__handle{width:44px;height:4px;background:rgba(27,23,18,.18);border-radius:2px;margin:12px auto 0;flex:none}
.form-modal__close{position:absolute;top:12px;right:12px;width:44px;height:44px;background:rgba(27,23,18,.06);border:0;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--ink);z-index:2}
.form-modal__close:hover{background:rgba(27,23,18,.12)}
.form-modal__scroll{overflow-y:auto;padding:20px 24px calc(24px + env(safe-area-inset-bottom));flex:1 1 auto;-webkit-overflow-scrolling:touch}
.form-modal__header{margin-bottom:18px;padding-right:44px}
.form-modal__header .eyebrow{margin-bottom:12px}
.form-modal__title{font-size:clamp(1.5rem,3vw,2rem);line-height:1.1;letter-spacing:-.02em;margin:0 0 10px}
.form-modal__sub{color:var(--ink-70);font-size:.95rem;line-height:1.5;margin:0;max-width:44ch}
.form-modal__sub strong{color:var(--ink);font-weight:600}
@media(min-width:781px){.form-modal{align-items:center}.form-modal__panel{border-radius:var(--radius);max-height:88dvh}.form-modal__handle{display:none}.form-modal__scroll{padding:28px 32px 32px}}
body.form-modal-open{overflow:hidden}
.form-message--warn{background:#fff4e0;color:#6b4a06;border-left-color:#d08a00}
.form-message--error{background:#fbe9e7;color:#7a1d14;border-left-color:#a62418}
.form-success{text-align:center;padding:36px 16px}
.form-success__icon{width:64px;height:64px;margin:0 auto 20px;background:rgba(37,99,255,.12);color:var(--accent);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:30px}
.form-success__title{font-size:1.5rem;margin:0 0 12px;letter-spacing:-.02em}
.form-success__body{color:var(--ink-70);margin:0 0 22px;max-width:40ch;margin-inline:auto}
.form-success__back{display:inline-flex;align-items:center;min-height:44px;padding:11px 20px;background:transparent;border:1px solid var(--ink);border-radius:var(--radius);color:var(--ink);font:500 .9375rem var(--sans);cursor:pointer}
.form-success__back:hover{background:var(--ink);color:#fff}
.spinner{display:inline-block;width:14px;height:14px;margin-left:8px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.sticky-cta-mobile{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:30;display:none;transition:opacity .22s var(--ease),transform .22s var(--ease)}
.sticky-cta-mobile__btn{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:52px;padding:14px 20px;background:var(--accent);color:#fff;border-radius:var(--radius);box-shadow:0 12px 32px -8px rgba(1,18,45,.55);font-weight:500}
.sticky-cta-mobile__btn:hover{background:var(--accent-2);color:#fff}
.sticky-cta-mobile.is-hidden{opacity:0;transform:translateY(12px);pointer-events:none}
@media(max-width:780px){.sticky-cta-mobile{display:block}body.form-modal-open .sticky-cta-mobile{display:none}.footer{padding-bottom:calc(84px + env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:reduce){.form-modal__panel{animation:none}.sticky-cta-mobile{transition:none}}
'''
open(f'{V}/styles.css','w',encoding='utf-8').write(css)
# --- script.js del cliente: quitar facade y formulario (los toma capture.js) ---
js=open(f'{C}/script.js',encoding='utf-8').read()
a=js.find("for(const btn of document.querySelectorAll('.yt-facade'))"); b=js.find("const form = document.getElementById('diagnostico-form');")
assert a>0 and b>a
js=js[:a]+"/* facade de YouTube y formulario: viven en capture.js (Marketon) */\n"
open(f'{V}/script.js','w',encoding='utf-8').write(js)
# --- capture.js: modulo de produccion adaptado ---
cap=open(f'{S}/prod_script_3.js',encoding='utf-8').read().replace('/* ===== SCRIPT ===== */','')
def crep(o,n):
    global cap; assert o in cap, o[:60]; cap=cap.replace(o,n)
crep("var heroCta = document.querySelector('.hero__cta-group');","var heroCta = document.querySelector('.hero-actions');")
crep("var NAV_OFFSET = 72; // altura aproximada del nav sticky (px)","var NAV_OFFSET = 96; // cabecera fija de Norma + aire")
crep("      // Anchor scroll fix · IG WebView","      var INITIAL_HASH = window.location.hash; // se lee antes de que el fix de anclas lo borre\n      // Anchor scroll fix · IG WebView")
crep("if (window.location.hash === '#cta-form') {","if (INITIAL_HASH === '#cta-form') {")
crep("""        window.addEventListener('load', function(){
          window.scrollTo(0, 0);""","""        // Sitelinks de Ads llegan con ?sl=<seccion>#<seccion>: aterrizar en esa seccion, no en el hero
        var SL_TARGET = (INITIAL_HASH && INITIAL_HASH !== '#cta-form' && document.getElementById(INITIAL_HASH.slice(1))) ? INITIAL_HASH.slice(1) : '';
        window.addEventListener('load', function(){
          if (SL_TARGET) { setTimeout(function(){ scrollToId(SL_TARGET); }, 150); return; }
          window.scrollTo(0, 0);""")
crep("submitLabel.textContent = 'Agenda tu sesión de descubrimiento';","submitLabel.textContent = submitLabel.dataset.label || 'Enviar mi reto';")
crep("      // Nav pill opacity ramp on scroll","      // Menu movil de Norma: el toggle lo maneja script.js; aqui solo medimos la apertura\n      (function(){ var t=document.querySelector('.menu-toggle'), m=document.getElementById('mobile-nav'); if(!t||!m) return; t.addEventListener('click', function(){ if(m.hidden===false) track('nav_mobile_menu_open', {}); }); })();\n      // Nav pill opacity ramp on scroll (v1 · no aplica en Norma, sale sin hacer nada)")
cap="/* APTO landing · capa de captura y medicion (Marketon) · portada de v1 sin cambiar nombres de evento, ids ni payload.\n   Eventos: data-track por clic · form_start · form_field_error · form_submit_success · form_submit_fail · form_submit_success_fallback\n   · form_modal_open/close · nav_mobile_menu_open · section_view · video_play. Contrato con el Worker apto-landing-api sin cambios. */\n"+cap
open(f'{V}/capture.js','w',encoding='utf-8').write(cap)
# robots: bloquear /v2/ mientras es staging
rb=open(f'{R}/robots.txt').read()
if 'Disallow: /v2/' not in rb: open(f'{R}/robots.txt','w').write(rb.replace('Allow: /','Allow: /\nDisallow: /v2/'))
print('v2 generado:',{f:os.path.getsize(f'{V}/{f}') for f in ['index.html','styles.css','script.js','capture.js']})
print('data-track:',sorted(set(re.findall(r'data-track="([^"]+)"',s))))
print('faq ld:',len(faq_ld['mainEntity']))
