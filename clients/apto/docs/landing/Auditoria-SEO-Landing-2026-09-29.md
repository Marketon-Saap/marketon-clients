# Landing APTO · Auditoría SEO on-page y técnica, con las correcciones aplicadas

**Fecha:** 29-sep-2026 · **Preparó:** Marketon (Chucho Porras) · **Sitio:** `landing.apto.mx` (GitHub Pages, repo `Marketon-Saap/apto-landing`) · **Herramientas:** Lighthouse 12 (móvil, simulado), Search Console (propiedad `sc-domain:apto.mx`), revisión manual del HTML, cabeceras HTTP, robots y sitemap. PageSpeed Insights sin cuota hoy; los números de rendimiento son de Lighthouse local, comparables entre sí pero no con PSI.

---

## 0. Respuesta corta

La landing estaba técnicamente sana: indexada, canonical correcto, robots y sitemap bien, datos estructurados válidos, un solo H1, todas las imágenes con dimensiones, Lighthouse SEO en 100. Lo que había que corregir era fino y se corrigió hoy: título de 67 caracteres que Google recortaba, sin descripción para Twitter, logo de 25 KB servido a 81 píxeles y sin texto alternativo, hero sin variante para móvil, salto de jerarquía en los encabezados del pie y sitemap con fecha vieja.

Lo que no cambia con SEO: la landing recibe 11 impresiones orgánicas en 90 días, con cero clics. Su tráfico es de Google Ads. El valor de esta auditoría está en la experiencia de página para el nivel de calidad de Ads y en dejar la base limpia; no va a traer tráfico orgánico por sí sola, porque la página compite con `apto.mx` por las mismas búsquedas de marca y no tiene contenido de búsqueda informacional.

## 1. Estado antes de las correcciones

| Revisión | Resultado | Veredicto |
|---|---|---|
| Indexación (Search Console, 28-sep) | Enviada e indexada, rastreo móvil, canonical de Google = canonical declarado | Bien |
| robots.txt | Permite todo, apunta al sitemap | Bien |
| Sitemap | Una URL, hreflang es-MX y x-default, lastmod 22-sep | Fecha vieja |
| HTTPS y redirecciones | http → https 301; `www` no existe (sin duplicado); `/index.html` responde 200 con canonical a la raíz | Bien |
| `<title>` | 67 caracteres, la keyword al final: "Hagamos realidad el cambio · Estrategia, diseño y tecnología · APTO" | Recortado en resultados |
| Meta description | 153 caracteres, con keyword | Bien |
| Canonical, hreflang, lang | `https://landing.apto.mx/`, es-MX + x-default, `lang="es-MX"` | Bien |
| Robots meta | index, follow, max-image-preview:large | Bien |
| Open Graph | Completo con imagen 1200×675 | Bien |
| Twitter | card, title e image; sin description | Falta description |
| Datos estructurados | ProfessionalService (dirección, teléfono, sameAs) y FAQPage con las 8 preguntas visibles; JSON válido | Bien |
| Encabezados | 1 H1; H2 por sección; el pie salta de H2 a H4 | Salto de jerarquía |
| Imágenes | 38, todas con width y height, lazy fuera del fold, hero con preload y fetchpriority; logo PNG de 1186×528 (25 KB) para 81×36 y sin alt | Logo pesado y sin alt |
| Hero (LCP) | 1024w a 143 KB también en móvil (no había variante intermedia) | Peso en móvil |
| Scripts | HubSpot async defer; GTM en head; script.js y capture.js al final del body | Bien |
| Fuentes | Satoshi y Clash Grotesk variables, preload, font-display swap | Bien |
| Anclas y enlaces | Sin anclas rotas, sin ids duplicados; externos con noopener | Bien |
| Cabeceras HTTP | GitHub Pages: sin HSTS ni X-Content-Type-Options; cache-control 600 s | Límite de la plataforma |
| Página de aviso de privacidad | noindex, sin canonical | Correcto para una página legal |

**Lighthouse móvil antes (local, simulado):** rendimiento 94, SEO 100, accesibilidad 98, buenas prácticas 79. FCP 1.1 s, LCP 2.5 s, TBT 150 ms, CLS 0, Speed Index 3.6 s. Buenas prácticas baja por las cookies de terceros de GTM, HubSpot y Meta, que son parte de la medición y no se tocan.

**Search Console, 90 días, `landing.apto.mx`:** 11 impresiones, 0 clics, 6 consultas, todas de marca ("apto", "empresa apto", "apto plataforma") en posición 6 a 22 detrás de `apto.mx`.

## 2. Correcciones aplicadas hoy (commit `d0989a9`)

| Cambio | Antes | Después |
|---|---|---|
| Título | 67 caracteres, keyword al final | "Estrategia, diseño y tecnología para tu empresa · APTO", 55 caracteres, keyword al frente. OG y Twitter conservan "APTO · Hagamos realidad el cambio" |
| Twitter description | No existía | Igual a la meta description |
| Logo de cabecera y pie | PNG 1186×528, 25 KB, alt vacío | PNG 243×108, 7 KB, alt "APTO". El PNG grande sigue para JSON-LD y OG |
| Hero | 640w y 1024w (143 KB) | 640w, 800w nuevo (33 KB, el que toma un teléfono a 2x) y 1024w recodificado a 130 KB; preload con las tres |
| Pie | H2 seguido de H4 | H3, con el mismo estilo (regla CSS movida de h4 a h3) |
| Sitemap | lastmod 22-sep | lastmod 29-sep, reenviado a Search Console |
| Versión de CSS | `?v=20260922a` | `?v=20260929a` para que el cambio del pie no quede en caché |

Todo replicado en el generador `build_v2.py` para que ninguna versión futura lo pierda. QA local 33 de 33.

## 3. Lo que no se hizo y por qué

- **Minificar `capture.js` y `script.js`** (4 KB estimados): se dejan legibles en producción para poder depurar la medición; el ahorro no cambia ninguna métrica.
- **Caché de 10 minutos y cabeceras de seguridad**: GitHub Pages no permite configurarlas. Si algún día importa, se pone Cloudflare delante; hoy el `?v=` en CSS y JS cubre la invalidación.
- **JavaScript de terceros** (GTM, gtag, Pixel, HubSpot: 318 KB sin usar según Lighthouse): es la capa de medición y no se toca.
- **Cookies de terceros**: mismas herramientas.
- **Contenido nuevo para búsqueda informacional**: la regla es publicar solo lo que APTO ya publica; el contenido de búsqueda vive en `apto.mx`.

## 4. Después de las correcciones

Verificado en producción el 29-sep desde la UI y con Lighthouse móvil (local, simulado, misma configuración que el "antes").

| Métrica | Antes | Después |
|---|---|---|
| Rendimiento | 94 | 96 |
| SEO | 100 | 100 |
| Accesibilidad | 98 | 100 |
| Buenas prácticas | 79 | 79 (cookies de terceros de la medición) |
| LCP | 2.5 s | 1.8 s |
| FCP | 1.1 s | 1.1 s |
| TBT | 150 ms | 140 ms |
| CLS | 0 | 0 |
| Jerarquía de encabezados | Falla | Pasa |
| Hero cargado en móvil | 1024w, 143 KB | 800w, 33 KB |
| Logo | 25 KB | 7 KB |

En la página viva: `<title>` de 54 caracteres, `twitter:description` presente, logo de cabecera y pie con alt "APTO", pie con H3 al mismo tamaño de antes (15 px), hoja de estilos `?v=20260929a`. Sitemap reenviado a Search Console con lastmod 29-sep.

## 5. Qué sigue

1. **PageSpeed Insights** cuando vuelva la cuota, para tener el número oficial y los datos de campo (CrUX) si los hay.
2. **Search Console en 2 a 4 semanas**: comprobar que el título nuevo aparece en resultados y si las 6 consultas de marca mejoran de posición. La expectativa es baja: `apto.mx` seguirá ganando la marca.
3. **Cabeceras de seguridad y caché** solo si la landing sale de GitHub Pages.
4. **Imágenes**: Lighthouse todavía estima 28 KB de ahorro en imágenes secundarias (capacidades y ciudad); no toca el LCP y se deja para después.

