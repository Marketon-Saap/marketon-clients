# Auditoría CRO · landing.apto.mx

**Fecha:** 16 de septiembre de 2026 · **Para:** Chucho Porras (uso interno Marketon, previo a la llamada con Álvaro) · **Autor:** Marketon
**Ventana de datos:** 26-ago → 15-sep-2026 (21 días con la landing estable; último cambio `cecc90b` del 25-ago)
**Fuentes:** GA4 320108858 · Clarity xnhu9emdgs (64 grabaciones) · Google Ads 7021324934 (Experimento 10061487455, cuota de impresiones, nivel de calidad) · HubSpot · D1 `apto-leads` · Playwright (iPhone 13 y desktop 1440)
**Marco:** ResearchXL (heurística → técnica → analítica → cualitativa) · LIFT por sección · Fogg B=MAP · priorización ICE

---

## 1. Respuesta primero

**La landing ya convierte por encima de su categoría. El cuello de botella no es la página: es cuánta gente llega y con qué intención.**

- **7.6% de los clics pagados terminan en lead** (5 leads reales en CRM sobre 66 clics). Benchmark B2B de servicios: mediana 2–4%, decil superior ~10%.
- **12% de los usuarios abre el formulario y entre 62% y 87% de los que lo abren lo terminan.** El formulario no es el problema; la gente que lo abre, lo manda.
- **En la misma prueba, apto.mx recibió 107 clics, gastó $5,628 y no produjo un solo contacto en el CRM.** La diferencia es estadísticamente sólida (prueba exacta de Fisher, p = 0.007). La prueba ya tiene respuesta.
- **Google lo lee igual que el CRM:** en su Experimento formal, el tratamiento (landing) convierte 10.6% contra 1.9% del control, con 69% menos costo por conversión.
- **El volumen es la restricción: 86 sesiones en 21 días, cuatro al día.** A esta tasa la landing entrega 7–8 leads al mes. Cada brazo compra solo el 10% de las impresiones disponibles: hay nueve veces más demanda. Doblar el tráfico vale más que cualquier cambio de diseño.
- **La landing paga el clic al doble ($91 vs $49)** porque Google califica su experiencia de página por debajo del promedio en varias palabras clave. Los tres arreglos que suben esa calificación (velocidad móvil, aviso de privacidad, mensaje por intención) ya están en el backlog; bajan el CPC además de subir la conversión.
- **La calidad de la intención es la segunda restricción:** 2 de los 5 leads piden cosas que APTO no vende (soporte de TI con cuota mensual e implementación de Odoo; un estudio de mercado). Eso lo decide la campaña, no la landing.

**Regla de decisión para todo lo que sigue, incluidos los cambios que pida Álvaro:** con cuatro sesiones al día no existe prueba A/B en página que lea en menos de meses. Cada cambio entra por *principio + evidencia + medición antes/después*, no por prueba. Lo que no se pueda medir se declara como decisión de marca, no como optimización.

---

## 2. Panorama con datos

### 2.1 Tráfico y embudo de la landing (26-ago → 15-sep)

| Métrica | Landing | apto.mx (mismo periodo) |
|---|---:|---:|
| Sesiones | 86 | 231 |
| Usuarios | 66 | 186 |
| Desktop / móvil | 81% / 17% | 77% / 23% |
| Tasa de interacción desktop | 57% | 58% |
| Duración media desktop | 311 s | 190 s |
| Usuarios que llegan al 90% de scroll | 26% | — |
| Usuarios que abren el formulario | 8 (12%) | — |
| `generate_lead` | 7 (5 reales + 2 pruebas del 28-ago) | 1 (directo, no pagado) |

Lectura: quien llega se queda cinco minutos y una cuarta parte baja hasta el final. La página retiene. En julio, con tráfico de Meta en móvil, la tasa sesión→lead era 0.6%; no es comparable (otra audiencia, otra landing), pero marca el cambio de contexto: **hoy el 81% del tráfico es desktop desde búsqueda pagada.** Todo lo que se decida en las próximas semanas es para ese visitante.

### 2.2 El experimento: apto.mx vs landing

Es un Experimento formal de Google Ads (`10061487455`, "APTO A/B · apto.mx vs landing 2026-08-25"): reparto 50/50, activo del 26-ago al 31-oct, meta declarada = bajar el costo por conversión. Control: campaña 24032573932 → apto.mx. Tratamiento: 24178936025 → landing. Una versión anterior (13–24 ago) se detuvo porque la landing cambiaba mientras se medía.

| | Control · apto.mx | Tratamiento · landing | Diferencia |
|---|---:|---:|---:|
| Impresiones | 1,989 | 1,455 | |
| Clics | 107 | 66 | |
| Gasto | $5,628 | $6,017 | |
| CPC promedio | $49 | $91 | +86% |
| Conversiones según Google Ads | 2 | 7 | |
| Tasa de conversión (Google) | 1.9% | 10.6% | ×5.7 |
| Costo por conversión (Google) | $2,814 | $860 | −69% |
| **Leads reales en CRM** | **0** | **5** | |
| **Costo por lead real** | — | **$1,203** | |

- **Google y el CRM cuentan la misma historia.** Fisher exacto, una cola: p = 0.007 con datos CRM, p = 0.016 con los de Google Ads. La landing gana con más de 98% de confianza pese a los números chicos. Intervalo de su tasa (Wilson 95%): 3.3% – 16.5%; la dirección es segura, la magnitud todavía no.
- **El tratamiento paga el clic casi al doble ($91 vs $49).** Google califica la *experiencia de la página de destino* de la landing por debajo del promedio en cinco palabras clave y le da nivel de calidad 1 de 10 en "empresa de desarrollo de software" (CPC $259) y en "consultoría corporativa". Los factores de esa calificación son relevancia del contenido con la búsqueda, transparencia (aviso de privacidad, datos de contacto), navegación y velocidad móvil: exactamente los puntos #3, #4 y #9 del backlog. Arreglarlos baja el CPC, no solo sube la conversión.
- **Cuota de impresiones: 10% en cada brazo.** 40% se pierde por presupuesto y 50% por ranking. Hay nueve veces más demanda de la que se está comprando: el volumen se sube con presupuesto y con calidad (ranking), no hace falta ir a buscar más demanda.
- **Recomendación: aplicar el experimento ahora** (Google Ads → "Aplicar": el tratamiento se vuelve la campaña base). Esperar al 31-oct cuesta ~$11,800 más en un brazo que en tres semanas no produjo un contacto (46 días × $256/día).

### 2.3 Los cinco leads: quién llegó y qué pidió

| Fecha | Empresa · rol | Qué pidió (su mensaje) | Palabra clave | Encaje con APTO |
|---|---|---|---|---|
| 26-ago | Tres Fénix Logística | Cambios a una app hecha por terceros, sin código fuente | empresa de desarrollo de software | Parcial · ya calificado por APTO |
| 8-sep | Hillman Group | Estudio de mercado de categorías HS/EPS | agencia investigación de mercados | Parcial · investigación, no transformación |
| 10-sep | Instituto Tultepec (móvil) | Automatizar comunicación de admisiones | consultoría transformación digital | **Sí** · oportunidad en pipeline |
| 10-sep | Club de Industriales GDL · Gerente General | Implementar Odoo, licencias Microsoft, soporte TI con cuota mensual, hardware | empresa de desarrollo de software | **No** · busca proveedor de TI · está como oportunidad |
| 14-sep | Creatoris Informática · Líder TI | Reforzar procesos operativos | digitalización de procesos | **Sí** |

Tres de cinco encajan. Los dos que no encajan entraron por la misma palabra clave: *empresa de desarrollo de software*. Ese grupo de anuncios (T2 Op · Arquitectura de software) es el que más convierte (3 de 7 conversiones) y el que peor califica. No es un problema de la landing: la landing hizo su trabajo con la gente que le mandaron.

### 2.4 Por qué intención está pagando la landing

Términos de búsqueda con clic en la campaña de la landing que no describen a un cliente de APTO:

| Tipo de intención | Ejemplos | Gasto aprox. |
|---|---|---:|
| Agencia web / SEO / redes | posicionamiento de páginas web · desarrollo de páginas web · manejo de redes sociales · agencias de mercadotecnia · desarrollo de ecommerce · diseño web internacional | ~$860 |
| Proveedor de TI / software a la medida | desarrollo de plataformas digitales · empresas TI · consultora informática cerca de mí · empresas de cómputo en Guadalajara | ~$1,800 |
| Nombres de competidores sin intención de compra | wizeline · neoris · cognizant · telus digital · teknei · lievant · menthera | ~$700 |
| Sin sentido | loft in guadalajara in americana · empresas | ~$55 |

Cerca de **$3,400 de $6,017** (57%) se fueron a búsquedas que la landing no puede convertir bien porque no vende eso. Las negativas son la palanca de CRO más barata que existe hoy.

### 2.5 Comportamiento (Clarity, 64 grabaciones · 50 desktop · 9 móvil)

- **Desktop lee, no hace clic.** Mediana de 144 s activos; 31 de 50 sesiones pasan de un minuto; 27 de 50 no hacen ningún clic. Es lectura de evaluación, típica de compra considerada.
- **La navegación flotante sí se usa y "Casos" es lo más pedido:** 9 clics, contra 7 en "Qué construimos" y 4 en "Método". El visitante quiere ver pruebas antes que método.
- **Un lead real hizo clic en "aviso de privacidad" a mitad del formulario** (10-sep, móvil) y aterrizó en un 404 de apto.mx. Siguió y envió, pero es un hueco de confianza y un incumplimiento legal.
- **Clic muerto en la píldora "36 proyectos publicados"** del hero (10-sep, móvil): parece botón y no hace nada. Clarity marca 12.5% de sesiones desktop con clics muertos en los últimos 3 días.
- **Cargas lentas en móvil:** 3 de 9 sesiones móviles tardaron más de 4 s en cargar; una sesión (la del lead del 10-sep) registró CLS 0.27 mientras llenaba el formulario.
- **Cero rage clicks, cero quick backs** en la ventana. El bug de auto-scroll de Instagram WebView de agosto ya no aparece.

---

## 3. Heurística por sección (LIFT: relevancia · claridad · ansiedad · distracción · urgencia)

| Sección | Qué funciona | Fricción observada | Evidencia |
|---|---|---|---|
| **Hero** | Promesa concreta ("lo dejamos funcionando"), un solo CTA primario, logos en el primer pantallazo de desktop | Las tres píldoras parecen botones y no lo son; "Diseño, estrategia y tecnología en un mismo equipo" es afirmación, no prueba; el H1 es el mismo para 11 intenciones de búsqueda distintas | Clic muerto en píldora · hero_cta_click 5 / 66 usuarios (7.6%) |
| **Tres pruebas + cita Monte de Piedad** | Traduce el método a lenguaje del cliente | Es la segunda sección y el visitante pide "Casos" primero | Nav "Casos" 9 clics |
| **Problema (3 citas de cliente)** | Voz del cliente, no de APTO | — | — |
| **Cinco retos** | Acordeones "esto es lo que te llega a las manos" bajan la ansiedad de "¿qué me entregan?" | Es la cuarta sección; queda a 2,800 px en móvil | Scroll 90% = 26% |
| **Casos (Coppel + 3)** | Reto → solución → cita con nombre y cargo | Aparece en la quinta posición aunque es lo más buscado | Nav "Casos" 9 clics |
| **Proyectos (12) + logos** | Amplitud sin inflar | Envía a apto.mx ("Míralos todos") — distracción aceptable, abre en otra ventana | — |
| **Método (5 etapas)** | Fiel al sitio madre | Vocabulario interno (Inmersión, Ideación) sin traducción a resultado | Nav "Método" 4 clics |
| **Equipo + video** | "Con quién vas a hablar" reduce ansiedad de compra | Video de YouTube carga 190 KB de terceros | Peso total 599 KB |
| **Formulario (modal)** | 4 campos visibles al abrir, autocompletado, 16 px, teclado numérico en teléfono, submit claro | Aviso de privacidad → 404; el mensaje obligatorio no orienta qué escribir | Completación 62–87% · 1 clic a 404 |
| **FAQ (8)** | Responde precio, tiempo y "¿construyen o subcontratan?" | No hay una pregunta que descalifique ("¿qué NO hacen?") | 2 de 5 leads fuera de encaje |
| **Footer** | Contacto completo | "El formulario de apto.mx" manda al visitante al sitio que no convierte | — |

---

## 4. Técnico

| Hallazgo | Medición | Impacto | Fix |
|---|---|---|---|
| **LCP móvil 4.3 s** (umbral bueno 2.5 s) | Hero `hero-taller-apto.jpg` 1920×1071, 178 KB, sin `srcset`, servido igual a 390 px | Hoy 17% del tráfico; 100% del tráfico de Meta cuando regrese | `srcset` 780/1170/1920 + WebP/AVIF (~35 KB en móvil) |
| LCP desktop 136 ms · CLS 0.01 | Bien | — | — |
| **`session_start` y `page_view` ≈ 2× sesiones** | 166 eventos vs 86 sesiones | Infla vistas y ensucia tasas | Verificar en GTM Preview: config tag duplicado o disparo por hash/history |
| **`view_search_results` 108 eventos** | La medición mejorada lee `keyword=` de las URLs de Ads como búsqueda interna | Evento basura, distorsiona "interacción" | Quitar `keyword` de los parámetros de búsqueda en GA4 o apagar site search |
| Objetivos táctiles < 44 px | LinkedIn socios 26 px · enlace DevSecOps 16 px | Accesibilidad WCAG 2.5.8 | Padding invisible |
| `select` de lada a 13.5 px | Único control < 16 px | Zoom en iOS al enfocar | 16 px |
| Contenido con `js-reveal` (opacity 0 hasta scroll) | Toda sección | Sin JS o con IO lento, secciones invisibles | Fallback `no-js` y `prefers-reduced-motion` |
| **Experiencia de página según Google Ads: por debajo del promedio** | 5 keywords BELOW_AVERAGE · nivel de calidad 1/10 en "empresa de desarrollo de software" (CPC $259) y "consultoría corporativa" · CPC del brazo landing +86% | Cada clic cuesta casi el doble que en apto.mx | Los mismos #3, #4 y #9; y decidir qué hacer con "empresa de desarrollo de software" (2 leads sin encaje) |
| Peso total 599 KB · terceros: Pixel 190 KB, HubSpot tracking, YouTube | — | Aceptable; Pixel es el más pesado y Meta está pausado | Cargar `fbevents` diferido |

---

## 5. Hallazgos clasificados (ResearchXL)

**Just do it** (evidencia clara, riesgo bajo)
1. Aplicar el experimento en Google Ads: 100% del presupuesto a la landing. Esperar al 31-oct cuesta ~$11,800 en el brazo que no produce.
2. Negativas de búsqueda: agencia web/SEO/redes, proveedor de TI, competidores sin encaje.
3. Aviso de privacidad: página real en apto.mx (Carlos) o, mientras, una página en la landing.
4. Hero en móvil: `srcset` + WebP/AVIF.
5. Píldoras del hero: quitar el borde que las hace parecer botón, o enlazarlas a #proyectos.
6. Corregir `view_search_results` y el doble `session_start`.
7. Objetivos táctiles y el `select` de lada.

**Instrument** (no se puede decidir sin medirlo)
8. Formulario por campo: dónde abandona quien abre y no envía (hoy solo hay `form_start` y `generate_lead`).
9. Etiquetar el encaje de cada lead en HubSpot (propiedad "encaje ICP: sí / parcial / no", la llena Carlos) para medir calidad, no solo cantidad.
10. Scroll por sección en Clarity una vez que haya tráfico móvil (hoy 9 sesiones no dicen nada).

**Hypothesize → medir antes/después** (no hay volumen para A/B en página)
11. Mensaje por intención: hero con variante por grupo de anuncios vía `utm_content` (5 variantes, solo texto, solo frases publicadas en apto.mx). Se lee por grupo de anuncios en Google Ads, que sí tiene señal.
12. Casos en segunda posición (después del hero). Lectura: tasa de apertura del form y clics en nav "Casos" cuatro semanas antes vs cuatro después.
13. Calificación suave: texto de encuadre arriba del formulario + placeholder del mensaje ("¿Qué proceso, producto o servicio quieres transformar?") + pregunta de FAQ "¿Qué retos no tomamos?". Lectura: proporción de leads con encaje.

**Investigate** (falta información del cliente)
14. Contacto alterno por WhatsApp o llamada: 27 de 50 sesiones desktop leen sin hacer clic. Depende de que APTO conteste WhatsApp; preguntar a Álvaro antes de construir.
15. Cita directa en calendario en vez de formulario para el CTA primario: clásico en B2B, pero el formulario ya completa 62–87%. No se toca hasta tener campo por campo (punto 8).

**Test** (cuando haya volumen: ≥ 30 leads/mes)
16. H1 concreto por resultado vs H1 de marca actual.
17. Largo de página: 21 pantallas en móvil. Hoy no hay evidencia de daño (26% llega al final, 5 min de lectura). No se recorta por intuición.

---

## 6. Backlog priorizado (ICE, 1–10)

| # | Cambio | Dónde | I | C | E | ICE | Cuándo |
|---|---|---|---:|---:|---:|---:|---|
| 1 | Aplicar el experimento: 100% del presupuesto a la landing | Google Ads | 10 | 9 | 10 | **9.7** | Esta semana |
| 2 | Negativas de búsqueda (3 familias) + decidir "empresa de desarrollo de software": mensaje propio o fuera | Google Ads | 8 | 8 | 9 | **8.3** | Esta semana |
| 3 | Hero móvil: srcset + WebP/AVIF | Landing | 6 | 9 | 9 | **8.0** | Esta semana |
| 4 | Aviso de privacidad real | apto.mx / landing | 6 | 9 | 8 | **7.7** | Esta semana · legal |
| 5 | Píldoras del hero sin afordancia de botón | Landing | 4 | 8 | 10 | **7.3** | Esta semana |
| 6 | Medición: `view_search_results` y doble `session_start` | GA4 / GTM | 5 | 8 | 8 | **7.0** | Esta semana |
| 7 | Objetivos táctiles + select de lada | Landing | 2 | 9 | 10 | 7.0 | Con el #3 |
| 8 | Encaje ICP como propiedad en HubSpot | HubSpot | 6 | 8 | 8 | 7.3 | Esta semana · lo llena Carlos |
| 9 | Hero por intención (`utm_content`) | Landing | 8 | 6 | 6 | 6.7 | Semana 2–3 |
| 10 | Calificación suave (encuadre + placeholder + FAQ) | Landing | 6 | 6 | 8 | 6.7 | Semana 2 |
| 11 | Formulario por campo en GA4 | GTM | 5 | 8 | 7 | 6.7 | Semana 2 |
| 12 | Casos en segunda posición | Landing | 6 | 5 | 7 | 6.0 | Semana 3, después de medir #9 |
| 13 | WhatsApp / llamada como alternativa | Landing | 5 | 5 | 8 | 6.0 | Preguntar a Álvaro |
| 14 | Fallback sin JS para `js-reveal` | Landing | 3 | 7 | 9 | 6.3 | Con el #3 |

Los cambios 1, 2 y 8 no son "de landing" pero son los que más mueven leads y calidad. Sin ellos, cualquier ajuste de diseño se mide sobre tráfico equivocado.

**Hipótesis formales de los cambios en página (formato: si X, entonces Y, porque Z)**
- #9: Si el hero refleja la intención con la que el visitante buscó, subirá la apertura del formulario del 12% al 18%, porque hoy quien busca "arquitectura de software" o "customer experience" aterriza en la misma promesa genérica. Se lee por grupo de anuncios.
- #10: Si el formulario y el FAQ encuadran qué retos toma APTO y cuáles no, la proporción de leads con encaje pasará de 3/5 a 4/5, porque los dos leads fuera de encaje describen necesidades de proveedor de TI que la página nunca descarta.
- #12: Si los casos van justo después del hero, subirá la apertura del formulario en desktop, porque "Casos" es el destino más pedido en la navegación y hoy está en la quinta posición.

---

## 7. Cómo vamos a evaluar los cambios que pida Álvaro

Antes de aceptar un cambio, cinco preguntas. Con dos "no", el cambio se documenta y se explica por qué no entra ahora.

1. **¿Ataca una fricción que los datos muestran?** (relevancia, claridad, ansiedad, distracción). Si es preferencia estética, es decisión de marca, se dice así y se acepta como tal, no como CRO.
2. **¿Usa solo contenido publicado en apto.mx?** Nada nuevo entra sin estar en el sitio madre.
3. **¿Toca algo que hoy funciona?** Completación del formulario 62–87%, contrato de datos del form, capa de medición, mapa de CTAs. Si sí, no.
4. **¿Se puede medir?** Antes/después con al menos cuatro semanas, o por grupo de anuncios. Si no, se etiqueta como no medible y se decide por criterio, no por resultado.
5. **¿Mejora la calificación del lead?** Cualquier cambio que atraiga más "proveedor de TI" o "agencia" va en contra aunque suba la tasa.

---

## 8. Lo que no se toca

- La estructura de datos del formulario, sus campos, `required` y el payload al Worker.
- La capa de medición: `generate_lead` enriquecido, `data-track` en los 64 elementos, GTM v72, Pixel/CAPI.
- La regla de contenido: nada que no esté publicado en apto.mx.
- Meta sigue en pausa hasta cerrar la prueba de mensaje (#9) y arreglar LCP móvil (#3) y aviso de privacidad (#4). Esos tres son las condiciones para encender tráfico frío.

---

## Anexo · Métricas a seguir (corte semanal, viernes)

| Métrica | Hoy | Meta 30 días | Fuente |
|---|---:|---:|---|
| Sesiones landing / día | 4 | 8 (con 100% del presupuesto) | GA4 |
| Clic pagado → lead | 7.6% | ≥ 7% sostenido | Ads + CRM |
| Apertura del formulario (usuarios) | 12% | 15% | GA4 `form_start` |
| Leads / mes | ~7 | 12–15 | CRM |
| Leads con encaje | 3 de 5 | 4 de 5 | HubSpot (propiedad nueva) |
| Costo por lead | $1,203 | ≤ $1,000 | Ads / CRM |
| LCP móvil (lab) | 4.3 s | < 2.5 s | Playwright |
| Sesiones con clic muerto (desktop) | 12.5% | < 5% | Clarity |
| Gasto en intención fuera de encaje | 57% | < 20% | Ads search terms |

**Límites de esta lectura:** 66 clics, 86 sesiones, 5 leads, 9 sesiones móviles grabadas. La dirección de cada hallazgo está sostenida; las magnitudes tienen intervalos anchos y se irán cerrando con volumen. Clarity solo expone tres días por consulta agregada; los porcentajes de clics muertos vienen de ese corte.
