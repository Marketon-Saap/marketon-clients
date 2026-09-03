---
titulo: Sistema de Adquisición APTO · Cierre de agosto 2026
audiencia: APTO · Álvaro Plasencia · Carlos Beltrán
autor: Marketon (Chucho Porras)
version: v16
formato: reporte cliente A4
confidencialidad: cliente
---

# Sistema de Adquisición APTO
### Cierre de agosto de 2026

---

## Objetivo del sistema

Generar prospectos que llenen los formularios web —`apto.mx/contacto/` y `landing.apto.mx`— para que el equipo comercial los recoja y avance el pipeline: calificación, llamadas, cotización, cierre. Todo lo demás —anuncios, medición, atribución— existe para alimentar y afinar ese objetivo.

Agosto fue un mes de dos mitades. En la primera el sistema traía leads con un defecto que nadie podía ver. En la segunda lo encontramos, lo corregimos y reconstruimos la medición completa. Este reporte cuenta las dos.

---

## Contactos generados en agosto

| Fuente | Contactos | Comentario |
|---|---:|---|
| **Paid Search** (Google Ads) | **9** | El canal que más leads trajo |
| **Paid Social** (Meta Ads) | **3** | Sin entrega desde el 18 de agosto |
| **Leads de marketing** | **12** | |
| Tráfico directo | 8 | Marca, referidos, gente que ya conocía APTO |
| Formulario de reclutamiento | 1 | No es lead comercial |
| Importaciones offline | 9 | Altas manuales al CRM |
| **Total contactos nuevos** | **30** | |

**Por formulario:** 8 entraron por `landing.apto.mx` y 11 por `apto.mx/contacto/`. Uno más por el newsletter del sitio.

Comparación con el reporte anterior: la ventana post-arranque que ahí se reportaba (8 jul → 18 ago, 42 días) acumulaba 11 leads de marketing. **Agosto solo, 31 días, cerró en 12.** El ritmo mejoró, aunque sigue lejos de la meta.

---

## Los 12 leads de marketing, uno por uno

| # | Contacto · Empresa | Fecha | Canal | Formulario |
|---|---|---|---|---|
| 1 | Rodrigo Alcalá Fuentes · RODO | 3-ago | Google Ads | landing |
| 2 | Ricardo · ZUBLIMA | 5-ago | Google Ads | landing |
| 3 | Juan Pedro Vázquez · Grupo AMCON | 5-ago | Google Ads | landing |
| 4 | Jorge Carrasco · Teva Movilidad | 7-ago | **Meta Ads** | landing |
| 5 | Fernando Javier Toríz · Leo X Motors | 10-ago | **Meta Ads** | landing |
| 6 | Roberto Pulido · Marketing Ting | 10-ago | Google Ads | landing |
| 7 | Carlos Valencia · Croma Digital | 12-ago | Google Ads | apto.mx |
| 8 | Gabriel Handel · Homma | 16-ago | **Meta Ads** | landing |
| 9 | Javier Alcaraz · FERROVA | 18-ago | Google Ads | apto.mx |
| 10 | Armando Zúñiga · Klyns Farmacias | 20-ago | Google Ads | apto.mx |
| 11 | Cinthia Pérez · Ponchitos | 24-ago | Google Ads | apto.mx |
| 12 | **Daniel Valdivia** · Tres Fénix Logística | 26-ago | Google Ads | **landing** |

Daniel es el primero que entró por la landing **con el sistema completo funcionando**: negocio en el pipeline, notificación al equipo, conversión registrada en GA4 y señal a Meta. Los siete anteriores llegaron al CRM, pero por una ruta de emergencia. La sección siguiente explica por qué.

---

## El defecto de 17 días

**Qué pasó.** El 7 de agosto se agregó el selector de lada al formulario de la landing. Ese campo quedó sin su elemento de mensaje de error. El código que valida el formulario recorre todos los campos y busca ese elemento; al no encontrarlo, se rompía **antes de enviar los datos a nuestro servidor**.

**Qué provocó.** Del 7 al 24 de agosto, ningún envío de la landing llegó al Worker. Sin negocio en el pipeline, sin registro en nuestra base, sin notificación por correo, sin conversión en GA4 y sin señal a Meta.

**Por qué nadie lo vio.** HubSpot tiene un recolector automático que copia los formularios que ve en una página. Ese recolector siguió capturando los contactos. Los leads llegaban al CRM —por eso el problema fue invisible— pero llegaban solos, sin el resto de la cadena. Cuatro de los ocho leads de la landing en agosto entraron así.

**Por qué la prueba no lo detectó.** El smoke test del 13 de agosto se hizo llamando directo al servidor, saltándose la validación del navegador. El servidor respondía bien; el navegador era el que se rompía. Desde entonces toda prueba se hace navegando el sitio como lo haría un usuario.

**Cuándo se corrigió.** El 24 de agosto, junto con la versión 3 de la landing. Daniel Valdivia, el 26, es la confirmación de que la cadena volvió a cerrar.

---

## Iteraciones de la landing en agosto

El mes tuvo siete olas de trabajo sobre la landing, todas en producción.

**Semana 1 · estructura y captura (4 al 7 de agosto).** Sección de socios rediseñada con Álvaro y Carlos, sección de proyectos nueva, cuatro CTAs por sección, navegación que se oculta al bajar y reaparece al subir. En el formulario: teléfono obligatorio con selector de lada para diez países, aviso de privacidad con consentimiento registrado, y el campo de problema pasa a obligatorio.

**Semana 2 · fricción medida con datos (13 y 14 de agosto).** Microsoft Clarity mostró dónde se atoraba la gente. Se arregló el CTA que no respondía dentro del navegador de Instagram, se quitó el video pesado en móvil, el formulario bajó de diez campos a cuatro visibles, y se eliminaron los elementos que parecían clicables sin serlo.

**Semana 3 · comprensión (17 y 18 de agosto).** Reescritura para el cliente ideal. Navegación en píldoras flotantes, hero con imagen conceptual, capa de animación al entrar cada sección, y el formulario pasa a abrirse como ventana en vez de obligar a bajar hasta el fondo.

**Semana 4 · la versión 3 (24 de agosto).** La más profunda. Se corrigió el defecto de los 17 días. Y se realineó **todo el contenido a lo que APTO realmente publica en su sitio**: se quitaron precios y plazos que no existían, cifras de casos que no estaban verificadas y menciones que no correspondían. El método pasó a las cinco etapas reales, los casos a citas textuales de clientes, y el FAQ se reconstruyó con respuestas rastreables al sitio. La página bajó de 20 a 16.8 pantallas en móvil y la jerga se eliminó por completo.

---

## Medición: lo que se reconstruyó el 25 de agosto

Se auditó cómo se cuentan los leads. Aparecieron **seis conteos duplicados y dos fallas de identidad**. Todo corregido y verificado.

**Un solo evento de conversión.** Varias fuentes emitían la conversión en paralelo y una llegaba sin identificador de sesión, así que Analytics la atribuía a "directo" en vez del canal real. Hoy existe un único evento, enriquecido, que distingue si el lead vino de la landing o del sitio.

**Meta dejó de contar doble.** El evento del navegador y el del servidor no se emparejaban: cada lead del sitio principal se registraba dos veces. Ahora comparten un identificador derivado del correo.

**Google Ads sin duplicados.** La conversión se registraba dos veces por lead.

**El Pixel manda identidad.** Nombre, apellido, correo y teléfono viajan cifrados junto al identificador de contacto de HubSpot, lo que mejora la capacidad del algoritmo de encontrar gente parecida a quien ya convirtió.

---

## Por qué las plataformas reportan más conversiones de las que hay

Es importante para leer los números de agosto sin equivocarse.

| Fuente | Agosto |
|---|---:|
| Conversiones reportadas por Google Ads | 16.8 |
| Conversiones reportadas por Meta Ads | 8 |
| Eventos de conversión en GA4 | 49 |
| **Leads de marketing en el CRM** | **12** |

La brecha tiene dos causas: los conteos duplicados descritos arriba, y las pruebas técnicas que se hicieron sobre el sistema durante el mes. Ambas están resueltas.

**Desde el 26 de agosto los datos cuadran uno a uno.** El 26 GA4 registró un evento y fue Daniel Valdivia. El 31 registró uno y fue Alejandra Loaiza, de Universidad LAMAR. Los dos del 28 fueron pruebas de verificación, identificadas como tales. De aquí en adelante, lo que muestre el tablero es lo que pasó.

**La cifra a usar para decisiones de negocio es la del CRM.**

---

## Inversión del mes

| Canal | Inversión | Impresiones | Clics |
|---|---:|---:|---:|
| Google Ads | $16,125.32 MXN | 8,304 | 351 |
| Meta Ads | $6,966.80 MXN | 37,196 | 1,071 |
| **Total** | **$23,092.12 MXN** | 45,500 | 1,422 |

Costo por lead sobre los 12 leads de marketing del CRM: **$1,924 MXN**.

**Meta se detuvo el 18 de agosto** y no volvió a entregar en lo que quedó del mes. Sus tres leads llegaron en la primera mitad. Es la palanca más directa que tenemos sobre volumen: la landing está construida y medida para tráfico frío de Meta, y hoy no le está llegando.

---

## Los dos A/B de Google Ads

**El primero, del 13 al 26 de agosto.** Repartía el tráfico pagado entre `apto.mx/contacto/` y `landing.apto.mx`. Cerró con $2,846.72 invertidos, 2,041 impresiones y 83 clics.

**No tiene veredicto, y es correcto que no lo tenga.** Corrió justo durante los días en que el formulario de la landing estaba roto. La landing competía con una mano atada: su formulario no cerraba la cadena. Cualquier conclusión de ese experimento habría estado mal.

**El segundo, desde el 25 de agosto.** Misma mecánica, ya con el formulario corregido y la medición reconstruida. Lleva $1,255.75 invertidos, 262 impresiones, 16 clics y 2 conversiones. Es poco todavía, y con Meta apagado la landing recibe muy poco tráfico frío, que es justo el que debería probarse.

---

## Qué queda operando

**Anuncios.** Google Ads con tres campañas de adquisición organizadas por tipología de cliente. Meta Ads configurado, sin entrega desde el 18 de agosto.

**Web.** Landing y sitio principal, los dos con el mismo formulario de HubSpot como destino. Contenido de la landing alineado a lo que APTO publica.

**CRM.** Cada contacto genera un negocio automático y notificación al equipo. Cinco campos guardan la atribución completa.

**Medición.** Un evento de conversión unificado, Meta CAPI del lado del servidor, Clarity con grabaciones, y base de datos propia como red de seguridad de cada envío.

**Vigilancia.** Revisión diaria automática que verifica que sigan entrando leads en cada sitio por separado, que los envíos no fallen y que la configuración de medición no se mueva. Existe precisamente por el defecto de los 17 días: convierte una falla silenciosa en un aviso al día siguiente.

---

## Métricas objetivo

| Indicador | Agosto | Meta a 30 días | Meta a 60 días |
|---|---:|---:|---:|
| Leads de marketing / mes | 12 | 20 | 35 |
| Costo por lead | $1,924 | $1,200 | $800 |
| Participación de Meta en los leads | 25% | 40% | 45% |

Los números de agosto son el primer piso medido con confianza. Los anteriores estaban contaminados por duplicación.

---

## Lo que sigue

**Reactivar Meta.** Es la decisión con efecto más directo sobre el volumen y sobre el costo por lead. La landing existe para ese tráfico.

**Dejar correr el segundo A/B con Meta encendido.** Solo así compara dos destinos en condiciones iguales.

**Siguiente corte: 8 de septiembre.** Con Meta activo y una semana de datos limpios, ahí hay base para decidir a cuál de los dos destinos mandar el presupuesto.

---

Preparado por Marketon · Chucho Porras · 31-ago-2026
