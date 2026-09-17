# Plan de optimización · landing.apto.mx

**Fecha:** 16 de septiembre de 2026 · **Base:** `Auditoria-CRO-Landing-2026-09-16.md` · **Estado:** desplegado en producción el 16-sep (landing `7461d73` + `1308e84`) y verificado con Playwright sobre landing.apto.mx; negativas y GA4 ya en producción

---

## 1. Cómo se arregla la nota de Google ("experiencia de la página de destino")

Google califica la landing por debajo del promedio en cinco palabras clave y con nivel 1/10 en dos. Esa nota pesa en el ranking del anuncio, y por eso el brazo landing paga el clic a $91 contra $49 del sitio. Google publica cuatro factores; cada uno tiene una acción concreta y ya está en marcha:

| Factor de Google | Qué evalúa | Qué hacemos | Estado |
|---|---|---|---|
| **Relevancia y originalidad del contenido** | Que la página hable de lo que la persona buscó | Hero por intención: el H1 cambia según el grupo de anuncios (`utm_content`). Diez variantes, solo texto, todas con vocabulario publicado en apto.mx. Ejemplo: quien busca "empresa de desarrollo de software" ve *"Diseñamos y construimos el software de tu operación. Y lo dejamos funcionando."* | Desplegado |
| **Transparencia y confianza** | Aviso de privacidad, datos de contacto, quién está detrás | Aviso de privacidad hospedado en `/aviso-de-privacidad/` (el de apto.mx da 404). Contacto y equipo ya estaban | Desplegado · Carlos publica el canónico en apto.mx |
| **Facilidad de navegación** | Encontrar rápido lo que se busca | Retos en 2×3, casos y método accesibles desde la navegación flotante; píldoras sin afordancia de botón | Hecho |
| **Velocidad, sobre todo móvil** | LCP, CLS | Hero en WebP con `srcset` (31/51/83 KB en vez de 178 KB) + preload | Desplegado · LCP móvil en laboratorio 4.3 s → 0.2 s |

Además, en Google Ads:
- **Negativas** en las dos campañas (29 cada una): web/SEO/redes, agencias de marketing, proveedor de TI y soporte, hardware y licencias, "cerca de mí", cómputo, investigación de mercados. Menos clics irrelevantes = mejor CTR esperado = mejor nivel de calidad. **Hecho.**
- **"empresa de desarrollo de software"** (nivel 1, CPC $259, 2 de sus 3 leads fuera de encaje): no se pausa todavía; la variante de hero le da un mensaje propio. Se revisa en dos semanas con la nota de calidad y el encaje de sus leads.
- **Aplicar el experimento** para que el 100% del presupuesto vaya a la landing. Es un clic en Google Ads → Experimentos → "Aplicar" (queda pendiente de Chucho: es irreversible y conviene que lo haga el dueño de la cuenta).

**Cómo se mide:** nivel de calidad por palabra clave (`quality_info` en la API), CPC promedio del brazo landing y clic→lead. Corte semanal. Meta a 30 días: CPC ≤ $65, nivel de calidad ≥ 5 en las cinco keywords principales.

---

## 2. Peticiones de Álvaro: qué entra, qué no, y por qué

Cada una pasó por los cinco criterios de la auditoría (¿ataca fricción con datos? ¿solo contenido de apto.mx? ¿toca lo que funciona? ¿se puede medir? ¿mejora el encaje del lead?). Todo lo verificable se verificó contra el sitio (88 URLs descargadas).

| # | Petición | Verificación | Decisión | Cómo quedó |
|---|---|---|---|---|
| 1 | Badge del hero: "Game Changers" | Ninguna de las dos frases está en apto.mx; el badge es una etiqueta de audiencia, no una afirmación | **Entra, en español**, como decisión de marca | "Para agentes de cambio en las organizaciones" |
| 2 | Títulos sin mayúsculas | Era `text-transform: uppercase` global en `h1` y `h2` | **Entra** para todos los títulos (h1 y h2); los eyebrows y la navegación siguen en versalitas como etiquetas | Caja normal: mayúscula inicial y minúsculas (commit `1308e84`) |
| 3 | "Prueba 1/2/3" → explicar deseabilidad, factibilidad, viabilidad y que se unen | Las tres palabras son vocabulario publicado de APTO (12, 17 y 15 apariciones) | **Entra** (claridad, LIFT) | Etiquetas Deseabilidad / Factibilidad / Viabilidad; el lead dice que se unen las tres capas para diseñar la estrategia de solución |
| 4 | Sexto reto: experiencia omnicanal | Es línea de servicio publicada en la home ("Diseño de servicios y experiencias omnicanales") y el caso Grupo San Carlos lo dice textual | **Entra** con caso San Carlos | Reto 06 con "qué te llega" tomado casi literal del sitio; retos en 2 columnas × 3 en desktop |
| 5 | Logos de Kiosko y BanCoppel en la rejilla | Kiosko ya estaba (hero y banda). BanCoppel **no tiene logotipo publicado** en apto.mx (su caso usa el logo de APTO) | Kiosko: ya estaba. BanCoppel: **no entra** hasta que Carlos entregue el vectorial | Sigue en la lista de proyectos como texto |
| 6 | MTP → México Telecom Partners | apto.mx escribe "MTP (Mexico Telecom Partners)" | **Entra** con la grafía del sitio | Lista de proyectos, cita y `alt` de logo |
| 7 | Texto de "autopartes" de APYMSA | El sitio la describe como "experiencia digital B2B en el sector de autopartes" | **Entra** parcial: se mantiene autopartes porque es lo publicado, se antepone lo que APTO hizo | "Plataforma B2B · autopartes" |
| 8 | "Más de 50 proyectos" | apto.mx publica **36** (36 tarjetas, 36 URLs en el sitemap). "Más de 50" no aparece | **Entra como dicho del cliente**, sin la palabra "publicados". Las frases que hablan de lo publicado dejan de dar número | Píldora y H2 de proyectos: "Más de 50 proyectos" · Método y FAQ: "en todos los proyectos" / "en los proyectos publicados" |
| 9 | Orden del método: primero entender, diseñar y decidir; después solo construir | apto.mx lo publica como **Taller de estrategia → Taller de producto → Desarrollo**; las cinco etapas se mantienen | **Entra** (corregido en segunda pasada: Definición es decidir y va en la primera banda) | "Entender, diseñar y definir" (Inmersión, Exploración, Ideación, Definición · Taller de estrategia + Taller de producto) · "Construir" (Construcción · Desarrollo) |
| 10 | "Cómo trabajamos" → "Nuestra metodología" + explicar que parte del pensamiento de diseño | "Design thinking" y "pensamiento de diseño": **0 apariciones** en apto.mx. La lógica sí está publicada con sus palabras | **Entra el nombre; no entra la etiqueta** | Eyebrow "Nuestra metodología"; el lead explica que es la misma lógica de las tres capas aplicada etapa por etapa. Si Álvaro quiere nombrar el pensamiento de diseño, que dicte la frase y se publica como suya |

Lo que **no** se tocó, por regla: la estructura del formulario (mismos campos, `required` y payload), la capa de medición (`generate_lead`, `data-track`, GTM, Pixel/CAPI), y ningún dato que no esté publicado o dicho por el cliente.

---

## 3. Lo que quedó ejecutado hoy

**En la landing (commit local `7461d73` en `apto-landing`, verificado con Playwright en iPhone 13 y desktop 1440):**
- Todo lo de la tabla anterior.
- Hero `<picture>` WebP 780/1170/1920 + `preload`.
- `/aviso-de-privacidad/` con los datos de APTO INNOVACIÓN DIGITAL, S.A.P.I. de C.V. (borrador para validación legal de APTO; el enlace del formulario ya apunta ahí; el valor que se guarda en HubSpot no cambió).
- Hero por intención (10 variantes por `utm_content`).
- Objetivos táctiles 44 px (LinkedIn de socios, DevSecOps); `select` de lada a 16 px; fallback sin JS y `prefers-reduced-motion` para `js-reveal`.
- FAQ y JSON-LD alineados a los seis retos.
- Verificado: campos del form idénticos (`firstname*, lastname*, email*, company*, jobtitle, phone_country_code, phone_number*, company_size, industry, message*, privacy_consent*`), 65 `data-track` (63 + 2 del reto nuevo), cero errores de consola, variante de hero activa solo con `utm_content` conocido, aviso responde 200.

**En Google Ads (ya en producción):**
- 29 negativas en la campaña landing (24178936025) y 29 en la base (24032573932).

**En GA4 (ya en producción):**
- `keyword` fuera de los parámetros de búsqueda interna en los dos flujos (G-T83JJQEYVH y MonsterInsights). Se acaba el `view_search_results` fantasma.

---

## 4. Lo que sigue (orden)

| Cuándo | Qué | Quién |
|---|---|---|
| Hoy | Aplicar el experimento en Google Ads | Chucho |
| Esta semana | Propiedad "Encaje ICP" (sí / parcial / no) en HubSpot; la llena Carlos en cada lead | Yo la creo desde la UI · Carlos la usa |
| Esta semana | Aviso de privacidad canónico en apto.mx/aviso-de-privacidad; logo vectorial de BanCoppel | Carlos |
| Semana 2 | Verificar en GTM Preview el doble `session_start`/`page_view` | Yo |
| Semana 2 | Formulario por campo en GA4 (dónde abandona quien abre y no envía) | Yo |
| Semana 3 | Leer el hero por intención por grupo de anuncios (apertura del form y nivel de calidad); decidir "empresa de desarrollo de software" | Yo |
| Cuando haya ≥ 30 leads/mes | Casos en segunda posición; WhatsApp como contacto alterno (preguntar a Álvaro si contestan) | — |

---

## 5. Cómo sabremos si funcionó (corte viernes)

| Métrica | Hoy | 30 días |
|---|---:|---:|
| CPC promedio brazo landing | $91 | ≤ $65 |
| Nivel de calidad, 5 keywords principales | 1–4 | ≥ 5 |
| Gasto en intención fuera de encaje | 57% | < 20% |
| Sesiones landing / día | 4 | 8 (con 100% del presupuesto) |
| Apertura del formulario | 12% | 15% |
| Clic pagado → lead | 7.6% | ≥ 7% sostenido |
| Leads con encaje | 3 de 5 | 4 de 5 |
| LCP móvil (producción) | 4.3 s | < 2.5 s |

---

## 6. Despliegue

Resuelto el 16-sep: `apto-landing` vive en la org Marketon-Saap; se agregó la cuenta `chuchopp` a `gh` en esta Mac. Verificación en producción: H1 en caja normal, seis retos (2 columnas en desktop), hero WebP servido (31 KB en móvil), aviso de privacidad en 200, variante de hero activa con `utm_content`, formulario con los mismos 11 campos, 65 `data-track`, cero errores de consola. No se envió ningún registro de prueba: el pipeline del formulario no se tocó.
