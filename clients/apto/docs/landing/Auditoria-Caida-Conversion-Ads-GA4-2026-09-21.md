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
