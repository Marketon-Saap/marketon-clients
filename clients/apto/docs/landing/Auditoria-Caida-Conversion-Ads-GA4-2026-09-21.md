# Auditoría · por qué no hay leads desde el 15 de septiembre

**Fecha:** 21 de septiembre de 2026 · **Para:** Chucho Porras · **Fuentes:** Google Ads 7021324934 (rendimiento diario, términos de búsqueda, nivel de calidad, historial de cambios, programación), GA4 320108858, D1 `apto-leads`, GTM GTM-K7J6MQ8, Clarity

---

## Respuesta primero

**No es la landing ni el formulario. Es el tráfico: llega menos, llega peor y hubo días sin anuncios.** El formulario pasó hoy cuatro pruebas de punta a punta (desktop y móvil, modal y fijo) y los cinco leads de septiembre entraron por el mismo pipeline que sigue vivo. Lo que cambió desde el 15 de septiembre es lo que Google manda a la página.

Leads reales (D1, sin pruebas): 8-sep (1), 10-sep (2), 14-sep (1). **Cero desde el 15.**

---

## 1. Días sin anuncios

| Periodo | Qué pasó |
|---|---|
| 29-ago → 6-sep | **Cero impresiones en las dos campañas** (ni siquiera los días hábiles 1–4 sep). El presupuesto se ajustó el 7 y 8 de septiembre (cuatro cambios de `amountMicros`, cuenta chucho@marketon.mx) y las campañas volvieron a servir el lunes 7. |
| Sábados y domingos | La programación de anuncios es **lunes a viernes, 8:00–19:00**. Los fines de semana no se sirve por diseño (12–13 y 19–20 sep en cero). |
| Viernes 18-sep | 10 impresiones, 0 clics en el brazo landing; 2 clics y $1 en el base. Un día hábil casi en blanco. |

En 21 días de septiembre el brazo landing sirvió 11 días.

## 2. El tráfico que sí llegó desde el 15 vale menos

**Brazo landing, 15–21 sep:** 40 clics, $3,116, 0 leads. Al 7.6% histórico se esperaban ~3; la probabilidad de cero por puro azar es ~4%. No es solo mala suerte:

- **15-sep: 3 clics costaron $1,447** (uno de ~$1,446) en el término *"desarrollo de plataformas digitales"*, disparado por la palabra clave *"empresa de desarrollo de software"* (nivel de calidad **1/10**). Ese día se perdió el **87% de las impresiones por presupuesto**: un clic se comió más de un día y medio de presupuesto. Con "Maximizar conversiones" sin CPA objetivo y solo 5 conversiones de historia, Google puja sin freno.
- **Los términos de búsqueda cambiaron de perfil.** 7–14 sep, lo que convirtió: *consultoría transformación digital*, *digitalización de procesos*, *empresa de desarrollo de software*, *agencia investigación de mercados* (grupos Transformación digital 19 clics/2 conv, Arquitectura 7/1, CX 5/1, Digitalización 2/1). 15–21 sep, lo que llegó: *cómo crear una empresa desde cero ejemplos*, *modelo de negocio canvas*, *aceleradoras de empresas en México*, *cómo mejorar mis ventas en mi negocio*, *hacer un mvp*, *programas a la medida*. Estudiantes, emprendedores y micronegocio. El grupo que más clics tuvo (Innovación corporativa, 12) nunca ha convertido; Digitalización de operaciones, que sí convierte, tuvo 0 clics.
- **GA4 confirma el desinterés, no una falla:** desde el 15, `form_start` real ≈ 1 (11 eventos de 5 usuarios, 4 son mis pruebas). La gente que llega no intenta el formulario. En la semana del 8 al 14, con tráfico de mejor intención, hubo 10 `form_start` y 4 leads.

## 3. Lo que descarté

| Hipótesis | Evidencia |
|---|---|
| Formulario roto | 4/4 pruebas E2E hoy desde UI (desktop y móvil, modal y fijo): Worker 200, HubSpot contacto + negocio, D1, CAPI, `generate_lead` en GA4. Los 5 leads del 8 al 14 entraron por este pipeline. |
| Bug de `jobtitle` del Worker | Solo rechazaba envíos sin cargo; corregido el 16-sep. Los 5 leads traían cargo. No explica la caída posterior. |
| Mis negativas del 16-sep | Ninguna de las palabras negativas toca los términos que convirtieron. Los clics no bajaron después (6, 13, 0, 15). |
| Anuncios rechazados | 35 anuncios activos por campaña, todos `APPROVED / REVIEWED`. |
| Medición duplicada en GTM | `generate_lead` de la landing cuelga de un solo disparador (`form_submit_success`, tag 84). En septiembre GA4 y D1 coinciden lead por lead. |

## 4. Lo estructural (sigue igual que el 16-sep, y explica el techo)

- Cuota de impresiones 10–15%; **80–90% perdida por ranking** casi todos los días.
- Nivel de calidad 1–4 en las palabras clave que gastan: *empresa de desarrollo de software* (1), *consultoría corporativa* (1), *customer experience* (2), *transformación digital* (3).
- "Maximizar conversiones" sin CPA objetivo con 5 conversiones en 3 semanas: pujas erráticas (CPC promedio $258 en la palabra de nivel 1; $482 el 15-sep).
- **El experimento sigue abierto:** la mitad del presupuesto va a apto.mx, que en septiembre no produjo ningún lead.

## 5. Qué hice hoy (reversible, con datos que lo sostienen)

1. ~~Pausé la palabra clave "empresa de desarrollo de software"~~ **Corregido el mismo día:** la pausé por nivel de calidad 1 y costo, y fue un error. Sus dos leads (Tres Fénix, Club de Industriales) están avanzando en el pipeline de APTO. Reactivada en las dos campañas. Regla desde hoy: nada que tenga conversiones se apaga sin decisión de Chucho; la palanca es CPA objetivo, no el interruptor.
2. **Negativas nuevas en las dos campañas** (solo términos con clics y cero conversiones): crear una empresa · canvas · aceleradora(s) · ejemplos · mejorar mis ventas. Quité dos que había puesto y rozaban intenciones que sí vendemos (*programas a la medida*, *desarrollo de plataformas digitales*).
3. **Cruce de 280 negativas contra 430 palabras clave positivas:** ninguna negativa bloquea literalmente una positiva. Un conflicto real venía del setup original: la negativa *"empresas de tecnología"* (con acento) tapaba las búsquedas con acento de la positiva *empresas de tecnologia en guadalajara*. Eliminada en las dos campañas.
3. Landing: validación de teléfono por lada (México 10 dígitos exactos, cliente y Worker), campo sin recorte en móvil, confirmación de envío siempre visible.

## 5b. Aplicado con el go de Chucho (21-sep, tarde)

- **Programación eliminada: las campañas corren 24/7** (Chucho: toda la semana, las 24 horas; se optimiza después con datos). Antes solo servían lunes a viernes de 8 a 19.
- **CPA objetivo $1,200** en "Maximizar conversiones", en el experimento y en la campaña base.

## 6. Qué te toca decidir (no lo hago sin tu "go")

1. **Aplicar el experimento** y mandar el 100% a la landing. Sigue costando ~$250/día en un brazo que en septiembre no dio un lead.
2. **Confirmar qué pasó entre el 29-ago y el 6-sep:** desde la API solo se ve que no hubo impresiones y que el presupuesto se movió el 7 y 8.
3. Si quieres volumen ya: el grupo **Digitalización de operaciones** y **Transformación digital** son los que convierten; subirles prioridad (presupuesto propio o CPA más alto) y bajar Innovación corporativa, que gasta y no convierte.

## 7. Cómo lo seguimos

Corte diario esta semana: impresiones, clics, costo y CPC por grupo; términos de búsqueda con clic; `form_start` y `generate_lead` en GA4 contra D1. Si el jueves 25 seguimos en cero con tráfico de buena intención, entonces sí toca mirar la página con lupa, sección por sección, con las grabaciones de Clarity de esos usuarios.

---

## Anexo 21-sep (tarde) · Cobertura de keywords con conversiones en 2026 tras aplicar el experimento

**Estado verificado por API.** Experimento 10061487455 en estado PROMOTED (aplicado). La campaña base 24032573932 quedó ENABLED con las variables del experimento encima: todas las URLs finales apuntan a landing.apto.mx, tCPA $1,200, presupuesto compartido $800/día. La campaña de experimento 24178936025 quedó PAUSED. La campaña "[EXP]" 24130395983 aparece ENABLED pero con serving ENDED (experimento viejo, cero gasto en septiembre); no interfiere.

**Pregunta de Chucho:** que toda keyword con conversiones en el año esté en la estructura activa.

**Consulta:** `keyword_view`, 2026-01-01 a 2026-09-21, todas las campañas, `conversions > 0`. 41 keywords con conversiones: 29 en la campaña legacy "ESTRATEGIA DE NEGOCIO" (pausada, 111 conversiones de formulario en el año) y 12 en la estructura nueva.

**Hallazgos:**
- 24 de las 29 keywords de la legacy no existían en la campaña activa (ni en frase ni en amplia).
- "software empresarial" en frase (3 conversiones con 4 clics) estaba REMOVED en el grupo Arquitectura. Se eliminó antes del 24-ago, durante el armado original (el historial de cambios de 30 días no registra la baja).
- 10 negativas a nivel campaña bloqueaban literalmente las keywords faltantes: ecommerce, e-commerce, desarrolladores, desarrollador, programador, programadores, developer, odoo, "implementación odoo", "empresas de software".
- Sin listas negativas compartidas ni negativas a nivel grupo.

**Ejecutado (campaña 24032573932):**

| Grupo | Keywords agregadas (amplia, igual que convirtieron) | Conv. 2026 en legacy |
|---|---|---|
| T2 Op · Arquitectura de software empresarial | desarrollo de software (10) · desarrolladores de software (10) · software personalizado (9) · desarrollo de software a la medida (4) · empresas de desarrollo de software (3) · desarrollo de software en mexico (3) · empresas de desarrollo de software en méxico (2) · programador de software (4) · programadores de software (1) · empresas de software en mexico (1) · **software empresarial [frase, re-agregada]** (3) | 50 |
| T2 Core · Diseño y desarrollo de productos digitales | desarrollo de apps (7) · desarrollador de apps (5) · app developer (4) · diseño de app (1) · desarrollo ecommerce (8) · desarrollo de ecommerce (1) · ecommerce b2b (1) | 27 |
| T1 · Consultoría de innovación corporativa | consultoría empresarial (9) · consultoras en mexico (2) · business consulting agency (1) | 12 |
| T2 Core · Transformación digital empresa mediana | digitalización de empresas (2) · transformacion digital empresas (2) | 4 |
| T2 Op · Digitalización de operaciones | erp (13) · implementación odoo (1) | 14 |

Negativas removidas: 10 (IDs 10160771, 10250421, 17990962, 17992272, 17718181, 19158081, 10231311, 1089643004, 1458354991161, 98809423). Quedan 127. Se conservaron las de intención laboral y formación (vacante, empleo, sueldo, cv, curriculum, salary, trabajo, freelance, curso, bootcamp) y las de competidores.

**Verificación posterior:** consulta fresca muestra las 25 keywords ENABLED en su grupo; cruce programático (amplia = todas las palabras contenidas, frase = subcadena, exacta = igual) contra las 127 negativas restantes: cero bloqueos.

**Ya cubiertas antes del cambio (no se tocaron):** service design, innovacion empresarial, customer journey, diseño de experiencias, proveedores de software, y las 12 de la estructura nueva (consultoría transformación digital, estrategia y diseño, estrategia de negocio digital, empresas de tecnologia en guadalajara, design thinking, desarrollo de software para empresas, experiencia de cliente, ux ui, consultoría de innovación, empresa de desarrollo de software frase y amplia, digitalización de procesos).

**Para decisión de Chucho, no ejecutado:**
- Keywords con solo conversiones secundarias (llamadas) en la legacy: "desarrollo de software a medida" (1) y "proveedores TI" (1). No se agregaron porque el criterio fue conversión principal.
- Riesgo a vigilar en 7 días: "erp" en amplia y las de "desarrolladores/programador" traen intención mixta (proveedores de ERP, gente buscando trabajo). El tCPA $1,200 y las negativas laborales acotan, pero conviene revisar términos de búsqueda el 28-sep antes de decidir si alguna pasa a frase.
- La landing no menciona ERP, apps ni ecommerce de forma explícita; el nivel de calidad de esas keywords arrancará bajo. Si convierten, vale un bloque en la landing (contenido que ya está en apto.mx).

---

## Anexo 22-sep · Términos de búsqueda con conversión y segmentación geográfica

### A) Términos de búsqueda con conversiones de formulario (2026-01-01 a 2026-09-22, todas las campañas)

46 términos con conversión, todos de formulario (Formulario de contacto, generate_lead, HubSpot Form Submission); ninguno de llamada. Clasificación:

**Ya cubiertos** por keyword existente o agregada el 21-sep: desarrollo de software, diseño de app, programador de software, desarrollador de apps, desarrolladores de software, desarrollador de app, erp para ventas, implementar odoo (variante de "implementación odoo").

**Agregados 22-sep (22 keywords):**

| Grupo | Keyword (concordancia) | Conv. |
|---|---|---|
| T2 Op · Arquitectura de software | casas desarrolladoras de software (amplia) · empresas desarrolladoras de software en méxico (amplia) · empresa desarrolladora de software en mexico (amplia) · empresas de desarrollo de software en puebla (amplia) · "servicios de programacion" (frase) · "consultoria de programacion" (frase) · "creacion de sistema" (frase) | 7 |
| T2 Core · Productos digitales | desarrollo de aplicaciones moviles (amplia) · creación de apps (amplia) · empresas de desarrollo de app (amplia) · ecommerce personalizado (amplia) · "realizacion de aplicaciones" (frase) | 5 |
| C6 · Competidores | "xr business solutions" (2) · "nearsoft" · "xdevelop" · "quadit" · "practia global" · "pci consultores" · "evolupyme" · "empresa ideo", todas en frase | 9 |
| T2 Op · Digitalización de operaciones | "software odoo" (frase) · "odoo guadalajara" (frase) | 2 |

Los genéricos van en frase para no abrir "sistema", "programación" o "aplicaciones" en amplia. Se removió la negativa "desarrolladora" (307371999791) porque bloqueaba "empresa desarrolladora de software en mexico"; quedan 126 negativas.

**No agregados, para decisión de Chucho:**
- Cluster web (5 conv.: desarrollo de paginas web 2, desarrollo de sitio web, diseño web guadalajara, web development mexico). Bloqueado a propósito por las negativas "paginas web", "página web", "diseño web" del armado original: APTO no se posiciona como agencia web. Si se quiere entrar, hay que quitar esas 4 negativas y agregar las 4 keywords.
- "partner odoo" (1 conv.). Bloqueado por la negativa "odoo partner". Decidir si APTO quiere pelear búsquedas de partner Odoo.
- Catálogos (3 conv.: diseñadores de catalogos 2, diseño de catalogos digitales 1). Fuera de la oferta publicada en apto.mx; los leads probablemente no encajan. Revisar en HubSpot antes de abrir.
- Agencias y genéricos (agencias de diseño grafico, agencias de branding en guadalajara, agencia publicidad, mercadotecnia cerca de mi, agencia investigacion de mercados, servicio al cliente, ventas, programador web full stack): 1 conv. cada uno, intención fuera de encaje y varios ya negativizados a propósito. No se agregan.

### B) Segmentación geográfica (últimos 12 meses, 2025-09-22 a 2026-09-22)

Reporte geográfico con conversiones de formulario, todas las campañas, presencia + interés. 23 estados con al menos una conversión:

| Estado | Conv. | Estado | Conv. |
|---|---|---|---|
| Jalisco | 47 | Coahuila | 3 |
| Ciudad de México | 47 | San Luis Potosí | 3 |
| Estado de México | 18 | Yucatán | 2 |
| Nuevo León | 12 | Tamaulipas | 2 |
| Querétaro | 8 | Oaxaca | 2 |
| Quintana Roo | 5 | Chihuahua | 2 |
| Puebla | 4 | Guerrero | 2 |
| Morelos | 4 | Veracruz | 2 |
| Guanajuato | 4 | Durango · Michoacán · Sinaloa · Sonora · Chiapas · Baja California | 1 c/u |

**Antes:** 12 ciudades (Aguascalientes, Tijuana, CDMX, Guadalajara, Zapopan, Cuernavaca, Monterrey, Querétaro, Cancún, Hermosillo, Mérida, Puebla). Aguascalientes: cero conversiones en el año. Fuera de la lista quedaban Estado de México (18), SLP, Coahuila, Tamaulipas, Oaxaca, Playa del Carmen y varias más.

**Ahora:** los 23 estados con conversión, a nivel estado (la resolución geográfica por ciudad en México es pobre y partiría la demanda del área metropolitana). Cambio en una sola operación atómica: 12 bajas + 23 altas, sin ventana con la campaña sin ubicaciones. Tipo de segmentación sin cambio (presencia o interés). Fuera quedan los 9 estados sin conversión en el año: Aguascalientes, Zacatecas, Nayarit, Colima, Hidalgo, Tlaxcala, Tabasco, Campeche y Baja California Sur.

**Verificado por API tras el cambio:** 23 criterios de ubicación activos, todos estados, ninguna ciudad restante.

---

## Nota 22-sep · Odoo fuera por decisión del cliente

APTO (vía Chucho, 22-sep) no quiere aparecer en búsquedas relacionadas con Odoo. Revertido: se removieron las keywords "implementación odoo", "software odoo" y "odoo guadalajara" del grupo Digitalización de operaciones, y se restauraron las negativas de campaña "odoo" (amplia) e "implementación odoo" (frase), que se suman a "oddo", "odoo partner", "odoo partners", "odoo mexico" y "odoo puebla" que nunca se tocaron. Con "odoo" en amplia como negativa, "erp" en amplia tampoco puede entrar a consultas que mencionen Odoo. Las 5 conversiones históricas de Odoo se dan por renunciadas a propósito. Queda cerrado el punto "partner odoo" de la lista de decisiones.

Siguiente revisión: en unos días, con datos del nuevo set de keywords y de la segmentación por 23 estados.
