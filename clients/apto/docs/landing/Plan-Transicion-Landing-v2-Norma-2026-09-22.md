# Landing APTO v2 (diseño Norma) · Auditoría y plan de transición a producción

**Fecha:** 22-sep-2026 · **Preparó:** Marketon (Chucho Porras) · **Para:** decisión de Chucho, luego alineación con Álvaro y Carlos (APTO)
**Entrada auditada:** `Clientes/Apto/03-Estrategia/Fase-2-Plan-MKT/Landing/Entrega-cliente-v2-Norma-2026-09-22/` (movida desde Descargas; index.html 42 KB · styles.css 27 KB · script.js 4 KB · 40 assets, 1.1 MB · carpeta `revision/`), entregada el 22-sep a las 10:49.
**Producción auditada:** repo `Marketon-Saap/apto-landing` (último push 21-sep 21:49), sitio vivo `landing.apto.mx` (193 KB), Worker `apto-landing-api`, D1 `apto-leads`, GTM-K7J6MQ8 workspace 77.

---

## 0. Respuesta corta

**Sí se puede llevar a producción, pero no como archivo tal cual.** Lo que mandó APTO es una reimplementación visual completa (HTML, CSS y JS nuevos sobre su sistema de diseño Norma) que respeta las 10 secciones, los ids de sección y, lo más importante, **el formulario campo por campo con los mismos ids y names**. Ellos mismos lo declaran: no trae envío real, ni medición, ni SEO. Eso es lo que nosotros aportamos.

El plan es tratar su entrega como **capa visual** y volver a inyectar nuestra **capa de captura y medición** como módulo, con los mismos nombres de evento, ids y contrato de datos que hoy. Con eso **no se toca nada** en Worker, D1, HubSpot ni GTM. La transición pasa por staging en el mismo dominio (`landing.apto.mx/v2/`), compuertas de QA con evidencia, y un cutover que se revierte con un commit.

Antes de arrancar hay **5 decisiones** que el cliente tomó implícitamente al rediseñar y que afectan conversión (sección 3). No son bugs, son producto.

Esfuerzo estimado: 3 días hábiles de trabajo más la validación de Chucho de los registros de prueba en HubSpot.

---

## 1. Qué tenemos hoy en producción (inventario técnico)

| Capa | Qué hay | Dependencia con el HTML |
|---|---|---|
| Hosting | GitHub Pages, repo `Marketon-Saap/apto-landing`, CNAME `landing.apto.mx`, deploy automático en push a `main`, un solo `index.html` con CSS y JS inline (193 KB), `aviso-de-privacidad/`, `robots.txt`, `sitemap.xml` | Ninguna externa; rollback = revert |
| Tag Manager | GTM-K7J6MQ8 en head + noscript. Carga Clarity (tag 63), Meta Pixel (24), GA4 config (50), Ads conversion linker (26) | Snippet en head |
| HubSpot | Script de tracking `2583031.js` (cookie hutk para atribución en el CRM) | Script en head |
| Eventos de clic | 31 atributos `data-track` en CTAs, nav, footer, LinkedIn, expansores | Un listener genérico `[data-track]` empuja `{event: <nombre>, label, anchor}` al dataLayer |
| Eventos programáticos | `form_start`, `form_field_error`, `form_submit_success`, `form_submit_fail`, `form_submit_success_fallback`, `form_modal_open`, `form_modal_close`, `nav_mobile_menu_open`, `section_view`, `video_play` | Selectores: `.hero__title`, `.nav-shell`, `.sticky-cta-mobile`, `#form-modal`, `#form-inline-host`, `section[id]`, `.yt-facade` |
| GTM trigger 68 | `form_submit_success` dispara tag 84 (GA4 `generate_lead`, conversión principal), 85 (Meta Lead con `event_id` para dedup con CAPI), 67 (Google Ads conversión "Hubspot - Form Submission (Lead)"), 57 (datos proporcionados por el usuario) | Lee del push las claves `email, phone, firstname, lastname, company, jobtitle, industry, company_size, country, contact_id, deal_id, lead_id, event_id, em_raw, ph_raw, fn_raw, ln_raw, message, message_length, has_problem_desc` |
| GTM trigger 93 | Regex con 21 nombres de microconversión → tag 94 (GA4) y 95 (Meta ViewContent) | Los nombres de evento deben conservarse tal cual |
| GTM trigger 90 | YouTube del video de Álvaro (id `40gjKGn8qME`): start, 25/50/75 %, complete → tag 91 | El iframe debe llevar `enablejsapi=1` |
| GTM trigger 58 | Clic en `tel:` → GA4 Llamada Web + Ads "Llamada Web" | Enlace `tel:` |
| Formulario | 11 campos (`firstname, lastname, email, company, jobtitle, phone_country_code, phone_number, company_size, industry, message, privacy_consent`), validación por lada (`PHONE_LEN`, México 10 dígitos exactos), aviso de correo gratuito, modal ↔ inline por teletransporte del `#form-card`, `revealSuccess` determinista, bloque `#form-success` | ids `f-*`, `err-*`, `#diagnostico-form`, `#form-card`, `#form-message`, `#form-success`, `#form-submit`, `#submit-label` |
| Envío | Payload plano al Worker + `context {pageUri, pageName, hutk, fbp, fbc, client_id, event_id}`; si el Worker falla, fallback directo a HubSpot Forms API (form `696bbd9e`) | Endpoint y form id constantes en el JS |
| Worker `apto-landing-api` | CORS para `landing.apto.mx` y `mktgrupoplasenciaautomotriz.github.io`; requiere `firstname, email, company`; valida teléfono E.164 por lada; INSERT en D1 antes de HubSpot (nunca se pierde un lead); crea contacto + deal en pipeline Marketon etapa nuevo lead; Forms API; Meta CAPI; correo Resend a 5 destinatarios; backfill de UTM desde `pageUri` | Solo el contrato del payload |
| Hero por intención | 10 variantes de H1 por `utm_content={adgroupid}` (Google Ads manda el id del grupo) | Selectores `.hero__title` y `.hero__title-italic` |
| SEO | title, description, canonical, hreflang, OG y Twitter con `og-image-apto-official.png` 1200×675, JSON-LD `ProfessionalService` + `FAQPage`, robots index, sitemap, preload del hero WebP y de fuentes Google (Barlow, Roboto Slab) | Todo en head |

---

## 2. Qué mandó el cliente (inventario)

**Estructura.** Las mismas 10 secciones, en el mismo orden y **con los mismos ids** (`hero, categoria, problema, productos, casos, proyectos, metodo, conoce-equipo, cta-form, faq`). Las anclas y el evento `section_view` sobreviven sin cambios.

**Formulario.** Mismos 11 campos, mismos ids `f-*`, mismos names, mismos `err-*`, mismo select de lada, mismo `maxlength`, misma tabla de longitudes por país (la copiaron de producción). Diferencias: solo existe la versión inline al final de la página (no hay modal), trae la leyenda "Vista previa local", `data-mode="local-preview"`, `data-hs-do-not-collect`, y el submit solo muestra un mensaje. No existe el bloque `#form-success`.

**Diseño.** Sistema Norma de su nueva web: Satoshi y Clash Grotesk locales (licencia Fontshare incluida), superficies cálidas (`--paper #f4f1ea`), navy `#01122d`, acento azul `#2563ff`, radio 4 px, cabecera fija "de vidrio" que cambia de contraste según la sección (JS propio), ilustraciones 3D como material de marca, casos con sus fotos originales. 8 media queries, `prefers-reduced-motion` respetado, sin `overflow-x` global.

**Copy.** Reescrito en cerca de la mitad de las líneas (138 de 284 idénticas). Tono más sobrio y más cauto con promesas. Cambios que importan:

| Bloque | Producción hoy | Cliente | Lectura |
|---|---|---|---|
| Hero | "Diseñamos el cambio en tu empresa. Y lo dejamos funcionando." + 3 pruebas (10 años · Más de 50 proyectos · un mismo equipo) | "Hagamos realidad el cambio." + "Convertimos retos de negocio en servicios, productos y herramientas que tu organización puede poner en práctica." Sin cifras | H1 de marca, sin promesa ni keyword. Afecta relevancia para Ads (sección 3.3) |
| Cómo pensamos | Prueba 1-2-3 (deseabilidad, factibilidad, viabilidad), que Álvaro pidió el 16-sep | "Integramos tres capacidades" (estrategia, diseño, tecnología) con el ensamble ilustrado | Se perdió lo que Álvaro pidió hace 6 días; confirmar con él |
| Problemas | Prefacio "Así nos lo dijeron ellos" + contextos | Citas literales intactas, contextos reescritos en neutro, sin prefacio | Correcto según su revisión editorial |
| Seis retos | Entregables concretos + "Y esto no lo hacemos" | Entregables suavizados ("cuando el alcance lo requiere"), sin "no hacemos" | Menos filo, menos calificación del lead |
| Casos | Coppel flagship con cita larga, APYMSA, BayWa, Fanosa | Mismos 4, textos más cortos | Bien |
| Proyectos | "10 años, más de 50 proyectos" + 10 tarjetas | "Más de 50 proyectos" + 12 tarjetas (agrega BanCoppel, NMP, APYMSA) | Coherente con lo que Álvaro pidió |
| Método | 5 etapas + DevSecOps | Igual, textos más cortos | Bien |
| FAQ | Respuestas con nombres (Romio, Sunbank, Intermaq) y etapas | Respuestas genéricas | Menos densidad semántica; regenerar JSON-LD |
| Footer | "Ciudad de México", "Aviso de privacidad · Términos" | Guadalajara, dirección Ostia 2750, teléfono, 5 redes, enlaces a apto.mx; **sin enlace al aviso de privacidad** | Agregar aviso |

**Calidad técnica del archivo.** Un solo H1 y jerarquía correcta; 38 imágenes, todas con `alt`, **21 sin `width`/`height`** (riesgo CLS); 35 con `loading="lazy"`; hero con `fetchpriority="high"`; 20 enlaces externos y todos abren en nueva ventana (regla cumplida); 16 `details` para expansores; 2 guiones largos en texto visible.

**Lo que no trae** (y es lo que hay que aportar): GTM, script de HubSpot, `data-track`, eventos programáticos, envío al Worker, fallback, hero por intención, modal, CTA fija móvil, skip link al formulario (el suyo va a `#main`), `#form-success`, canonical, hreflang, OG image y OG url, JSON-LD, sitemap, `apple-touch-icon`, preload de Clash Grotesk, `enablejsapi` en el video, enlace al aviso de privacidad, y **trae `robots: noindex,nofollow`** que no puede llegar a producción.

**Referencia interna.** Su LEEME apunta a rutas del Mac de Carlos (`/Users/carlosbeltran/Code/aptobrain/apps/apto-web`): Norma vive en el repo de su web nueva. Conviene pedir acceso de lectura a `src/styles/global.css` y `docs/DESIGN.md` para que el modal, el bloque de éxito y el aviso de privacidad sigan el sistema y no lo inventemos.

---

## 3. Diferencias que son decisiones, no bugs

| # | Tema | Hoy | Cliente | Recomendación |
|---|---|---|---|---|
| 3.1 | **Modal del formulario** | 15 elementos abren el modal en desktop y móvil; el formulario también vive inline al final | Todos los CTA hacen scroll al formulario del final. En móvil queda a unas 8 pantallas del hero | **Conservar el modal** reutilizando su `#form-card` con un overlay en tokens Norma. Un día de trabajo. Si Chucho prefiere probar inline puro, se mide 14 días contra baseline |
| 3.2 | **CTA fija en móvil** | Barra `sticky-cta-mobile` medida como `sticky_cta_click` | No existe | Reintroducir en versión mínima (una barra de 56 px con "Hablemos de tu reto"). Sin ella, en móvil el único CTA visible tras el hero es el del menú |
| 3.3 | **Hero por intención** | 10 variantes de H1 según grupo de anuncio | H1 estático de marca | Conservar el mecanismo con la voz nueva: H1 de marca fijo y **subtítulo variable por intención** (o variar el H1 si Chucho prefiere relevancia máxima). Es la palanca directa del nivel de calidad que apenas empezamos a trabajar |
| 3.4 | **Copy de Álvaro del 16-sep** | Prueba 1-2-3, "más de 50 proyectos", sexto reto omnicanal, MTP desarrollado, badge "agentes de cambio" | Conserva 50 proyectos, sexto reto y MTP; quita "agentes de cambio" y las tres pruebas | Confirmar con Álvaro que la sección "Cómo pensamos" nueva sustituye a propósito lo que pidió |
| 3.5 | **FAQ genérica** | 8 respuestas con nombres y cifras | 8 respuestas genéricas | Aceptar; es su voz. Regenerar el JSON-LD FAQPage con las nuevas preguntas |

Regla que se cumple: todo el copy nuevo viene del cliente, no inventamos nada. Lo único que Marketon escribe son metadatos (title, description, alt, JSON-LD) y se someten a su revisión.

---

## 4. Plan de transición

**Principio:** el archivo del cliente es la capa visual. Nuestra capa de captura y medición se porta como un módulo con los mismos nombres de evento, ids y payload. Cero cambios en Worker, D1, HubSpot y GTM (solo modo Preview para verificar). Las URLs finales de Google Ads no cambian.

### Fase 0 · Congelar y preparar (medio día)
1. Tag `v1-2026-09-22` en git y respaldo del `index.html` actual.
2. Baseline de 7 días: eventos GA4 por nombre, `generate_lead`, `form_start`, clics de Ads, Lighthouse móvil, capturas 390 y 1440 guardadas a disco.
3. Rama `v2-norma` y carpeta `/v2/` en el mismo repo: staging **en el mismo dominio**. Así el CORS del Worker, los filtros de GTM por `landing.apto.mx` y el script de HubSpot funcionan sin tocar nada. `/v2/` lleva `noindex` y `Disallow` en robots mientras dura el staging.

### Fase 1 · Integrar la capa de captura y medición (un día)
1. **Head:** snippet GTM (head y noscript), script de HubSpot, preconnects (GTM, HubSpot), metadatos de la sección 5.
2. **Formulario:** quitar leyenda de vista previa, `data-mode` y `data-hs-do-not-collect`. Portar el módulo de producción completo: validación por lada, aviso de correo gratuito, payload plano + `context`, `fetch` al Worker, fallback a Forms API, `revealSuccess`, eventos `form_start`, `form_field_error`, `form_submit_success`, `form_submit_fail`, `form_submit_success_fallback`. Agregar el bloque `#form-success` con estilo Norma. Solo se adaptan los selectores de layout (`.hero__title` → `.hero h1`, `.nav-shell` → `.site-head`, `.sticky-cta-mobile`).
3. **Eventos de clic:** reponer `data-track` en cada CTA con **los mismos 31 nombres**. Mapa: `hero_cta_click` → `.hero .btn-glass`; `hero_secondary_click` → `.hero-case-link`; `nav_cta_click` → `.btn-head`; `nav_link_click` → `.menu-bar a`; `nav_mobile_link_click` y `nav_mobile_menu_cta_click` → `#mobile-nav a`; `nav_logo_click` → `.logo-mod`; `producto_expand` → `summary` de `.reto__more`; `taller_expand` → `details` del método; `problema_cta_click`, `casos_cta_click`, `ver_mas_casos`, `proyectos_ver_mas_click`, `proyectos_cta_click`, `metodo_cta_click`, `conoce_cta_click`, `faq_cta_click`, `devsecops_link_click`, `partner_linkedin_alvaro_click`, `partner_linkedin_carlos_click`, `footer_cta_click`, `footer_email_click`, `footer_tel_click`, `footer_maps_click`, `footer_social_click`, `footer_external_click`, `footer_section_click`, `skip_link_form_click` (agregar skip link al formulario), `sticky_cta_click` y `form_modal_open/close` según 3.1 y 3.2. `categoria_cta_click` desaparece porque el cliente quitó ese CTA; se documenta. El trigger 93 no necesita cambios si los nombres se respetan.
4. **Video:** facade con `enablejsapi=1&origin=https://landing.apto.mx`, id `yt-facade-alvaro`, `video_play` en el clic. Sin esto el trigger 90 no ve nada.
5. **Hero por intención:** reimplementar sobre el H1 o subtítulo nuevo según 3.3, con las 10 variantes actuales traducidas a la voz nueva (Álvaro revisa las 10 frases).
6. **Cabecera de vidrio:** su JS calcula el contraste leyendo `#hero, #categoria, #productos, #cta-form`. Si se reintroduce el modal o la barra móvil, no interfiere; se prueba.
7. **Enlaces:** aviso de privacidad relativo (`/aviso-de-privacidad/`) en el checkbox y en el footer, junto con Términos. Externos con `rel="noopener noreferrer"` y nueva ventana (ya cumplen).
8. **Aviso de privacidad:** misma página y contenido, re-estilizada con Norma, `noindex` se queda.
9. **Archivos:** conservar `styles.css` y `script.js` separados pero con versión en la URL (`?v=2026-09-22`) para romper la caché de Pages; nuestro módulo va en un tercer archivo `capture.js` para que APTO pueda iterar diseño sin tocar medición.

### Fase 2 · SEO y rendimiento (medio día)
Sección 5 completa.

### Fase 3 · QA en dos pasos (un día) · compuertas obligatorias, con evidencia guardada a disco
**Paso 1, local:** se sirve la rama `v2-norma` en un servidor local y se revisa en mi navegador: render en 360/390/768/1024/1440, consola limpia, assets, cabecera de vidrio, expansores, video, validación del formulario (sin enviar). Ahí se corrigen diseño y comportamiento sin tocar el dominio.
**Paso 2, staging `/v2/` en `landing.apto.mx`:** solo aquí se pueden verificar GTM, HubSpot, el CORS del Worker y las conversiones reales. Nada pasa a producción sin las dos rondas.
| Compuerta | Criterio de paso |
|---|---|
| Build | HTML válido, 0 errores de consola, 0 assets 404, 0 desbordamiento horizontal en 360/390/768/1024/1440, contraste de cabecera correcto en cada sección |
| Medición | GTM Preview (Tag Assistant) en `/v2/`: los 21 nombres del trigger 93 disparan tags 94 y 95; `form_submit_success` dispara 84, 85, 67 y 57 con las variables `DL-*` pobladas; `video_play` y progreso YouTube (trigger 90); `section_view` en GA4 DebugView; Clarity graba la sesión |
| Formulario E2E | Desde UI real en Google Chrome, móvil y desktop, sin inyección (regla). Negativas: teléfono de 9 y 11 dígitos, correo inválido, sin consentimiento. Positivas: envío → fila en D1, contacto + deal en HubSpot pipeline Marketon etapa nuevo lead, correo Resend a los 5 destinatarios, `generate_lead` en GA4 Realtime, conversión Ads en Tag Assistant. Mínimo 2 pruebas (4 si se conserva el modal). Los registros se borran cuando Chucho los valide |
| Fallback | Bloquear el endpoint del Worker en DevTools y enviar: HubSpot Forms API recibe y se emite `form_submit_success_fallback` |
| Rendimiento | Lighthouse móvil ≥ 90 en performance y 100 en accesibilidad, SEO y buenas prácticas; LCP ≤ 2.5 s con 4G simulado; axe 0 violaciones |
| Visual | Capturas por sección desktop y móvil comparadas con la entrega del cliente; nada se mueve más de lo que pide la integración |
| Ads | Previsualizar las 10 `utm_content` y ver la variante correcta; comprobar que las URLs finales de los anuncios resuelven igual |

### Fase 4 · Cutover (una hora)
Las campañas corren 24/7, así que se elige la hora de menor tráfico: **entre 6 y 7 am hora de México, martes a jueves**. Merge a `main`: `index.html` raíz = v2, assets nuevos, assets viejos se conservan 30 días (la OG image actual está referenciada por Meta y compartidos), `/v2/` se elimina, robots y sitemap con `lastmod`. Verificación en producción real, no en staging: carga, GTM, **un envío de prueba end-to-end** (un registro, se borra), GA4 Realtime, Search Console (inspección de URL y solicitud de indexación), depurador de compartir de Meta para la OG image, PageSpeed.
**Rollback:** `git revert` del merge; Pages redepliega en un minuto. Criterio: cualquier compuerta de medición falla en producción, o `form_start` o `generate_lead` caen más de 50 % en 48 horas contra baseline.

### Fase 5 · Post-lanzamiento (7 días)
Días 1, 3 y 7: eventos por nombre contra baseline; tasa clic→lead; nivel de calidad de las keywords principales (componente "experiencia en la página de destino"); Clarity: rage clicks y dead clicks en la cabecera nueva y en los expansores. Cuando haya datos, alinear el copy de los anuncios a la voz nueva.

---

## 5. SEO, metadatos y rendimiento · lista de cambios sobre el archivo del cliente

| Elemento | Cliente hoy | Qué haremos |
|---|---|---|
| `robots` | `noindex,nofollow` | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` |
| `<title>` | "APTO [guion largo] Hagamos realidad el cambio" (guion largo, sin keyword, 34 caracteres) | Opción A: "Hagamos realidad el cambio · Estrategia, diseño y tecnología · APTO" (66). Opción B: "Consultoría de diseño estratégico y tecnología · APTO" (53). Álvaro elige |
| `meta description` | Genérica, sin ubicación ni keyword | "Estrategia, diseño y tecnología en un mismo equipo. Convertimos retos de negocio en servicios, productos y herramientas que tu organización puede operar. Guadalajara y todo México." (≤ 155) |
| Canonical y hreflang | No hay | `https://landing.apto.mx/` + `es-MX` + `x-default` |
| Open Graph y Twitter | Solo `og:title` y `og:description` | `og:type, og:url, og:locale, og:image` nueva **1200×630** con la ilustración del hero nuevo y el wordmark, JPG < 300 KB, `og:image:width/height/alt`, `twitter:card summary_large_image`, `twitter:image`. Se produce con visual-composer y se valida en el depurador de Meta |
| JSON-LD | No hay | `ProfessionalService` actualizado (descripción y lema en la voz nueva, dirección Ostia 2750, teléfono +52 33 1814 5528, `sameAs` con las 5 redes, `logo` propio) + `FAQPage` regenerado con las 8 preguntas nuevas + `VideoObject` del video institucional |
| Encabezados | H1 único correcto | Revisar que los H2 lleven términos de búsqueda naturales (servicio, producto digital, operación, clientes, iniciativas, canales) sin forzar |
| Imágenes | 21 sin `width`/`height` | Añadir dimensiones a todas (CLS); `alt` del hero con "APTO" y el servicio; `alt` descriptivos en logos de clientes (ya están) |
| Fuentes | Preload solo de Satoshi | Preload también de Clash Grotesk; `font-display: swap` ya está; evaluar subconjunto latino para bajar 30 a 40 % de peso |
| Hero | `fetchpriority="high"` | Añadir `<link rel="preload" as="image" imagesrcset imagesizes>` como en producción |
| Favicons | Solo PNG genérico | `apple-touch-icon` 180, `icon` 32 y SVG, `theme-color #01122d` (ya está) |
| Enlaces | Sin aviso de privacidad ni términos en footer | Añadir ambos; `tel:` y `mailto:` ya existen (el `tel:` dispara el trigger 58 y suma "Llamada Web" como conversión secundaria, es una ganancia) |
| Sitemap y robots | No trae | `lastmod` nuevo, enviar sitemap en Search Console tras el cutover |
| Accesibilidad | Skip link a `#main` | Skip link adicional al formulario; verificar contraste de `--ink-70` sobre `--paper-2` ≥ 4.5:1; foco visible en la nav de vidrio; touch targets ≥ 44 px en `.hero-case-link`, `.caso__link` y `.section-cta__link` (hoy padding 12 px) |
| Estilo de texto | 2 guiones largos visibles | Sustituir por coma o punto |
| Scripts de terceros | Ninguno | GTM + HubSpot + Clarity + Pixel suman ~250 KB; inevitable. HubSpot `async defer` como hoy; GTM en head para no perder atribución |
| Página de aviso | No trae | Re-estilizar con Norma, `noindex` |

---

## 6. Lo que no se toca

Worker `apto-landing-api` y su contrato, esquema D1, formulario y pipeline de HubSpot, contenedor GTM (no se publica ninguna versión; solo Preview), campañas de Google Ads y sus URLs finales, DNS y dominio, contenido del aviso de privacidad.

---

## 7. Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El copy nuevo baja la tasa de conversión o el nivel de calidad | Media | No hay volumen para A/B (40 clics por semana). Baseline de 7 días, ventana de 14 días, rollback en un commit |
| Eventos con nombres distintos rompen la continuidad en GA4 y los triggers 93 y 68 | Alta si no se cuida | Mapa 1:1 de los 31 nombres; verificación en Tag Assistant antes del cutover |
| Se pierden aperturas del formulario (de 15 a 7 puntos de entrada) | Alta si no se decide 3.1 y 3.2 | Modal y barra móvil |
| Modal y cabecera de vidrio se estorban (z-index, scroll lock) | Media | Prueba en las 5 anchuras; el modal ya maneja `body.form-modal-open` |
| Caché de GitHub Pages sirve CSS viejo | Media | Versionar `styles.css` y `script.js` en la URL |
| Assets viejos referenciados fuera (OG image, capturas en Ads) | Baja | Conservar 30 días |
| Fuentes locales: licencia y peso | Baja | Fontshare Free Font License incluida, permite self-hosting comercial; subconjunto latino |
| Google Ads muestra la landing vieja en caché de previsualización | Baja | Sin efecto real; las URLs no cambian |

---

## 8. Esfuerzo y secuencia

| Fase | Tiempo | Depende de |
|---|---|---|
| 0 · Congelar y preparar | 0.5 día | Nada |
| 1 · Integrar captura y medición | 1 día | Decisiones 3.1 a 3.3 |
| 2 · SEO y rendimiento | 0.5 día | Title y description elegidos por Álvaro; OG image producida |
| 3 · QA en staging | 1 día | Chucho valida los registros de prueba en HubSpot |
| 4 · Cutover | 1 hora | Fecha y hora acordadas |
| 5 · Post-lanzamiento | 7 días de seguimiento | Baseline de la fase 0 |

Total: 3 días hábiles de trabajo, más un día natural de validación de Chucho y 7 de seguimiento.

---

## 9. Decisiones que necesito antes de empezar

1. **Modal y barra móvil:** conservar (recomendado) o aceptar inline puro y medir.
2. **Hero por intención:** conservar en el subtítulo (recomendado) o en el H1.
3. **Copy:** confirmar con Álvaro los puntos 3.4 y 3.5, y que elija title y description.
4. **Acceso a Norma:** pedir a Carlos lectura de `global.css` y `DESIGN.md` para modal, éxito y aviso.
5. **Fecha y hora del cutover.**

---

## Anexo A · Mapa de eventos (producción → v2)

| Evento | Elemento en producción | Elemento en v2 | Estado |
|---|---|---|---|
| hero_cta_click | `.hero__cta-group .btn` | `.hero .btn-glass` | Reponer |
| hero_secondary_click | enlace "Ver cómo lo hicimos" | `.hero-case-link` | Reponer |
| nav_cta_click | `.nav-pill .btn` | `.btn-head` | Reponer |
| nav_link_click | `.nav-pill a` | `.menu-bar a` | Reponer |
| nav_logo_click | logo | `.logo-mod` | Reponer |
| nav_mobile_menu_open | toggle | `.menu-toggle` | Reponer (programático) |
| nav_mobile_link_click / nav_mobile_menu_cta_click | `#mobile-menu a` | `#mobile-nav a` | Reponer |
| skip_link_form_click | skip link al form | agregar segundo skip link | Reponer |
| sticky_cta_click | `.sticky-cta-mobile` | no existe | Decisión 3.2 |
| form_modal_open / form_modal_close | `#form-modal` | no existe | Decisión 3.1 |
| categoria_cta_click | CTA de "Cómo pensamos" | no existe | Se pierde, documentado |
| problema_cta_click | CTA de problemas | `#problema .section-cta a` | Reponer |
| producto_expand | `summary` de retos | `summary[data-producto]` | Reponer |
| casos_cta_click, ver_mas_casos | casos | `#casos` enlaces | Reponer |
| proyectos_ver_mas_click, proyectos_cta_click | proyectos | `#proyectos` enlaces | Reponer |
| metodo_cta_click, taller_expand, devsecops_link_click | método | `#metodo` | Reponer |
| conoce_cta_click, partner_linkedin_alvaro_click, partner_linkedin_carlos_click, video_play | equipo | `#conoce-equipo` | Reponer (video con enablejsapi) |
| faq_cta_click | FAQ | `#faq .section-cta a` | Reponer |
| footer_* (7) | footer | `.footer` enlaces | Reponer |
| form_start, form_field_error, form_submit_success, form_submit_fail, form_submit_success_fallback | módulo del formulario | mismo módulo portado | Reponer |
| section_view | `section[id]` | igual | Sobrevive |

---

## Estado de ejecución · 22-sep-2026, tarde

**Decisiones de Chucho:** modal, barra fija móvil y hero por intención se conservan. Arrancaron Fase 0 y Fase 1.

### Fase 0 · hecha
- Tag `v1-2026-09-22` en `Marketon-Saap/apto-landing`; respaldo de `index.html`, `robots.txt` y `sitemap.xml` en `Landing/Baseline-v1-2026-09-22/`.
- Baseline 15 a 21-sep: GA4 en `landing.apto.mx` 69 usuarios, 196 páginas vistas, 21 `form_start` de 7 usuarios, 8 `generate_lead` de 4 usuarios (incluye las 4 pruebas del 21-sep), 6 `hero_cta_click`, 5 y 5 clics a LinkedIn de los socios, 2 `video_play`. Google Ads: 51 clics, 0 conversiones. Capturas completas 1440 y 390 guardadas. PageSpeed no se pudo tomar hoy (cuota diaria de la API agotada); se toma mañana y se registra aquí.
- Rama `v2-norma` creada; `/v2/` publicado en el mismo dominio como staging con `meta robots noindex` y `Disallow: /v2/` en robots.txt. La raíz no cambió.

### Fase 1 · hecha, pendiente de QA en staging
- `v2/index.html` = archivo del cliente + cabecera de medición (GTM, HubSpot), SEO base (canonical, hreflang, OG con la imagen actual, JSON-LD `ProfessionalService` con la voz nueva y `FAQPage` regenerado con las 8 preguntas), `viewport-fit=cover`, preload de Clash Grotesk y del hero.
- 28 nombres de `data-track` idénticos a v1 más los programáticos. Ajustes de mapa: `categoria_cta_click` ahora es el CTA al final de "Seis retos" (el cliente quitó el CTA de "Cómo pensamos"); `ver_mas_casos`, `devsecops_link_click`, `no_somos_expand` y `no_somos_cta_click` desaparecen porque esos elementos ya no existen.
- Modal (mismo `#form-card` teletransportado, bottom sheet en móvil), barra fija móvil que se esconde mientras el CTA del hero está a la vista, bloque `#form-success`, segundo skip link al formulario, enlace al aviso de privacidad en el checkbox y en el footer.
- Hero por intención: el subtítulo recibe como prefijo la primera frase de la variante de v1 (las 10 frases, revisadas por Álvaro el 16-sep), mapeadas tanto a los ids de grupo del experimento como a los de la campaña base que quedó activa.
- `capture.js`: módulo de v1 portado; se corrigió un bug heredado: el deep link `#cta-form` nunca abría el modal porque el fix de anclas borraba el hash antes de leerlo.
- `script.js` del cliente conserva cabecera y menú; el facade de YouTube y el formulario pasan a `capture.js`. `styles.css` del cliente intacto más un bloque Marketon con tokens Norma.
- Se respetó todo el copy del cliente, incluido un guion largo en la atribución de la cita de Coppel; solo se quitaron los del `<title>` y de dos `aria-label`.

### QA local (paso 1) · 25 de 25
Servidor local, terceros bloqueados (GTM, HubSpot, Pixel, YouTube) y Worker simulado. Verificado: sin desbordamiento en 360/390/768/1024/1440; consola limpia; sin 404; 14 aperturas al formulario, 12 visibles en desktop abren el modal y Escape lo cierra devolviendo el form a la versión inline; negativas de correo, teléfono de 9 dígitos y consentimiento; recorte a 10 dígitos; envío con `form_submit_success` y las 19 claves que leen las variables de GTM; éxito visible; video con `enablejsapi=1` y `video_play`; `section_view` en las 10 secciones; `producto_expand` y `footer_tel_click`; barra fija móvil y bottom sheet; menú móvil con `nav_mobile_menu_open` y `nav_mobile_link_click`; hero por intención con id de grupo base; deep link. Evidencia en `Landing/QA-v2-local-2026-09-22/` (capturas y `qa-local-resultados.json`).

**Observación para el cliente (no bloquea):** en móvil, al recorrer "Cómo pensamos", el logo de la cabecera aparece sobre un recuadro claro con difuminado; es su regla de contraste, conviene que la revisen.

### Siguiente
Fase 2 (title y description elegidos por Álvaro, OG image nueva, dimensiones en 21 imágenes, PageSpeed) y Fase 3 paso 2: QA en `landing.apto.mx/v2/` con GTM Preview y envíos reales desde Chrome en móvil y desktop, con validación de Chucho en HubSpot.

---

## Nivel de calidad de Google Ads · diagnóstico y acciones (22-sep, tarde)

**Diagnóstico (últimos 30 días, campaña 24032573932, 22 keywords no marca con nivel visible):** experiencia en la página de destino inferior al promedio en 17, CTR esperado inferior en 14, relevancia del anuncio mixta (9 arriba, 8 abajo). Marca en 6 y 10. Competidores en 1. La landing es el freno principal; v2 corrige velocidad, transparencia y navegación, pero no la relevancia estática porque el copy del cliente es de marca (transformación digital aparece una vez, desarrollo de software solo en la FAQ, experiencia de cliente, MVP, arquitectura de software y equipo de innovación no aparecen).

**Ejecutado hoy con go de Chucho:**
- **Sitelinks.** Los 6 anteriores (Proyectos, Contacto, Insights, Servicios, Equipo Apto, Apto Education) mandaban a apto.mx, que convirtió cero en el experimento. Desvinculados. Cinco nuevos a la landing: Casos: Coppel y APYMSA (`?sl=casos#casos`), Los seis retos (`#productos`), Nuestra metodología (`#metodo`), Cuéntanos tu reto (`#cta-form`), Conoce al equipo (`#conoce-equipo`). Descripciones tomadas del copy del cliente. En v1 el JS fuerza el hero al cargar, así que hasta el cutover aterrizan arriba; en v2 `capture.js` lee el hash antes de borrarlo y hace scroll a la sección (verificado en QA local, 26 de 26).
- **Competidores.** Pausadas accenture, kpmg, bcg, boston consulting group, globant y globant mexico: nivel 1 y cero conversiones históricas. Wizeline se queda (convirtió en la legacy) igual que las 8 marcas chicas agregadas el 22-sep.
- **Concordancia.** Amplias con nivel 1 o 2 y cero conversiones pasadas a frase: ux ui (la frase ya existía), soluciones digitales guadalajara y customer experience (frase nueva, amplia pausada).

**Pendiente para el día del cutover (no antes, para no resetear los anuncios dos veces):** alinear los 35 anuncios a la voz nueva (93 titulares y descripciones con "10 años" o "Del papel a la realidad", 21 con "Agenda tu sesión"; el cliente ya no dice eso) y fijar el titular del tema en posición 1 en cada grupo; 6 anuncios están en "Deficiente" (3 de competidores, 1 de digitalización, 1 de estrategia).

**Propuestas de landing para Álvaro:** bloque "Qué hacemos" con los servicios publicados en apto.mx (los mismos del fragmento estructurado que ya corre: servicios omnicanales, productos digitales, estrategia de negocio, arquitectura de software, equipos de innovación, capacitación en diseño) más transformación digital y experiencia de cliente, con anclas a los seis retos; subtítulo temático en cada reto; title y description con keyword. Lectura del nivel de calidad: una a dos semanas después del cutover.

### Respuesta de APTO · 22-sep, tarde
Álvaro (vía Chucho): "muy bien, solo el update del logo porque hay dos". La propuesta de relevancia (bloque "Qué hacemos", subtítulos temáticos, title y description) queda **aprobada**. El logo: la cabecera usaba el wordmark nuevo (`assets/apto-logo.png`, PNG blanco que Norma invierte con filtro) y el footer el SVG delgado de v1 (`apto-logo-white.svg`). Unificado al nuevo en el footer; JSON-LD y OG ya apuntaban a él. Publicado en las dos URLs de revisión y en la rama `v2-norma`. Pendiente de Chucho: merge de la rama a `main` para que `landing.apto.mx/v2/` incorpore la propuesta aprobada antes del QA en staging (Fase 3, paso 2). La página del aviso de privacidad sigue con el diseño v1 y su logo anterior; se re-estiliza en Fase 2.

### Ajuste de proceso · 22-sep, tarde
Por indicación de Chucho, se eliminaron la rama `v2-norma` y la carpeta `/v2/` del repo de producción: **no hay staging en `landing.apto.mx` ni ramas paralelas**. Toda revisión y prueba vive en `Marketon-Saap/previews` (GitHub Pages) y en Cloudflare Pages `marketon-previews` (cuenta Marketon-SaaP). Consecuencia para la Fase 3: el paso 2 (GTM Preview, HubSpot, CORS del Worker) se hace en el cutover mismo con un envío real que Chucho valida; el resto se cubre en previews con el Worker simulado. El generador `build_v2.py` produce la versión de producción con `PROPUESTA=1 REVIEW=0` cuando llegue el día.

---

## Cutover · 22-sep-2026, 13:30 hora de México · HECHO

Con el visto bueno de Álvaro, la v2 se publicó en `landing.apto.mx` (commit `0fc1409` en `main`; rollback con `git revert` o el tag `v1-2026-09-22`). Build de producción con `PROD=1 PROPUESTA=1 REVIEW=0` desde el generador: robots `index, follow`, GTM y HubSpot activos, propuesta de relevancia aprobada, logo unificado, dimensiones en todas las imágenes, sitemap con `lastmod` nuevo. Antes de publicar se agregaron las reglas de campos que pidió Chucho (nombre, apellido y cargo solo letras en mayúsculas; empresa letras y números; teléfono 10 dígitos MX; correo con arroba) y el QA local subió a 29 de 29.

**Smoke test E2E en producción: 4 de 4** (desktop modal e inline en Chrome; móvil bottom sheet e inline en el navegador integrado). Detalle, ids de los registros de prueba y hallazgos en `Smoke-Test-v2-Produccion-2026-09-22.md`. Search Console: indexada, canonical correcto, sitemap reenviado.

**Pendientes inmediatos:** borrar los 4 registros de prueba cuando Chucho valide; reescribir los 35 anuncios a la voz nueva y fijar titulares (punto 2 y 3 del nivel de calidad), con su go; PageSpeed mañana; configurar `RESEND_API_KEY` si APTO quiere el correo de aviso; re-estilizar el aviso de privacidad con Norma.

---

## Medición de clics · GTM v73 · 23-sep-2026 · HECHO y verificado en producción

Petición de Chucho: saber qué botón pulsa cada usuario (a GA4) y que hacia el Pixel de Meta todos los clics que abren el formulario cuenten como un solo evento.

**Cambios en GTM (contenedor 68635063, versión 73 publicada):**
- Variables de capa de datos nuevas: `label`, `nav_link`, `producto`, `taller`, `item`, `section_id`, `source`, `field`.
- Trigger 113 "Landing · Todos los clics y eventos (GA4)": todos los nombres `data-track` de la landing y los eventos programáticos, excepto `form_start` y `form_submit_success`, que conservan sus etiquetas propias.
- Trigger 114 "Landing · Formulario abierto (Meta, un solo evento)": solo `form_modal_open`.
- Tag 94 (GA4) ahora dispara con el trigger 113 y manda los ocho parámetros; en GA4 se registraron las ocho dimensiones personalizadas de evento con esos nombres.
- Tag 95 (Meta) dispara con el trigger 114 y envía un solo `ViewContent` con `content_name = formulario_abierto` y `content_type` = el CTA que abrió el formulario. Se eliminó el trigger 93 (regex antiguo que mandaba cada microconversión al Pixel).
- La conversión principal (`generate_lead`, Lead de Meta, conversión de Ads, mejoradas) no se tocó.

**Verificación en producción, navegando como usuario en Chrome (23-sep):** el CDN ya sirve la v73. Clic en "Casos" del menú, en la etiqueta "Transformación digital" de Qué hacemos y en el CTA del hero (abre el modal), luego Escape. GA4 en tiempo real recibió `nav_link_click`, `servicio_chip_click`, `hero_cta_click`, `form_modal_open` y `form_modal_close`. Meta recibió exactamente un `ViewContent` (`formulario_abierto`, `content_type = hero_cta_click`) y nada por el menú ni la etiqueta.

**Hallazgo y corrección:** el manejador de scroll suave de `capture.js` volvía a empujar el `data-track` sin etiqueta, así que GA4 contaba dos eventos por clic en enlaces ancla (uno sin `label`). Venía así desde v1. Se quitó el segundo push (commit `106e625` en `main`); queda solo el listener por elemento, que sí manda `label`, `nav_link` e `item`. Nota de método: la herramienta de red de Chrome muestra `/g/collect` con estado 503 aunque GA4 sí recibe el evento; la prueba válida es el informe en tiempo real.

---

## Conversiones de Google Ads · limpieza de principales · 24-sep-2026

Pregunta de Chucho: qué conversiones de GA4 importar a Ads y si como principales. Diagnóstico (90 días): la misma solicitud contaba dos o tres veces como principal (etiqueta GTM "Hubspot - Form Submission (Lead)" + "Formulario de contacto" + importación GA4 generate_lead), y la etiqueta 59 "Llamada Web" apuntaba a una acción de conversión eliminada, así que los clics al teléfono no contaban en Ads.

**Hecho con go de Chucho (cuenta 702-132-4934):**
- "Hubspot - Form Submission (Lead)" (7683684640) es la única principal para lead de formulario; conteo cambiado a una por clic.
- "Formulario de contacto" (6540084871) y "APTO - GA4 (web) generate_lead" (7720148566) pasan a secundarias.
- Acción nueva "Llamada Web (clic al teléfono, landing y sitio)" (7793108334), sitio web, categoría contacto, una por clic, secundaria. Label `_9p_CO7KhYQdEN7v0sYD`.
- No se importa nada más de GA4; las secundarias GA4 existentes (formulario_general, mailto, tel) se quedan. Las offline de HubSpot (Oportunidad $30,000, Cliente $456,000) siguen principales con 0 en 90 días: confirmar con APTO que la sincronización HubSpot → Ads está viva.

**Pendiente (bloqueado por permisos de la sesión):** en GTM, tag 59 "Llamada Web" cambiar `conversionLabel` de `voSSCPvo0eobEN7v0sYD` a `_9p_CO7KhYQdEN7v0sYD`, crear versión 74 y publicar. Hasta entonces los clics al teléfono siguen sin contar en Ads.

**Efecto esperado:** la columna "Conversiones" baja y el CPA reportado sube al valor real; Maximizar conversiones con tCPA $1,200 tarda una o dos semanas en reajustar. Revisar el tCPA contra el CPA real después de ese periodo.
