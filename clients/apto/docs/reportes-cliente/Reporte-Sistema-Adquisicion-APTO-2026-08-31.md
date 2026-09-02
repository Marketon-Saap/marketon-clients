---
titulo: Sistema de Adquisición APTO · Estado 31-Ago-2026
audiencia: APTO · Álvaro Plasencia · Carlos Beltrán
autor: Marketon (Chucho Porras)
version: v16
formato: reporte cliente A4
confidencialidad: cliente
---

# Sistema de Adquisición APTO
### Estado a 31 de agosto de 2026

---

## Lo primero

Diez leads entraron al CRM entre el 18 y el 31 de agosto. Seis de ellos ya no están en la bandeja de entrada: el equipo de APTO los movió a su pipeline comercial. Ése es el sistema haciendo lo que debe.

Dos cosas más que hay que decir de frente en este corte. Meta Ads no tuvo entrega en todo el periodo, cero pesos y cero impresiones, y eso explica por qué la landing recibió tan poco tráfico. Y hay una corrección al reporte del 18 de agosto que corresponde hacer por escrito.

---

## Leads del periodo · 18 al 31 de agosto

| # | Contacto · Empresa | Fecha | Formulario | Dónde está hoy |
|---|---|---|---|---|
| 1 | **Javier Alcaraz** · FERROVA | 18-ago | apto.mx/contacto/ | New Lead |
| 2 | **Davhinia Solís** · Financiera | 18-ago | apto.mx/contacto/ | New Lead |
| 3 | **Alejandra Rodríguez** · TREBLÉ | 20-ago | apto.mx/contacto/ | Pipeline APTO |
| 4 | **Armando Zúñiga** · Klyns Farmacias | 20-ago | apto.mx/contacto/ | Pipeline APTO |
| 5 | **Oscar Orea** · OnPoint | 21-ago | apto.mx/contacto/ | Pipeline APTO |
| 6 | **Alfredo Gutiérrez Cendejas** · Virbac | 24-ago | apto.mx/contacto/ | Pipeline APTO |
| 7 | **Cinthia Pérez** · Ponchitos | 24-ago | apto.mx/contacto/ | Pipeline APTO |
| 8 | **Ana Francisca González Casillas** · BBVA | 25-ago | apto.mx/contacto/ | Pipeline APTO |
| 9 | **Daniel Valdivia** · Tres Fénix Logística | 26-ago | **landing.apto.mx** | New Lead |
| 10 | **Alejandra Loaiza** · Universidad LAMAR | 31-ago | apto.mx/contacto/ | New Lead |

Los diez pasaron por la misma cadena: contacto en HubSpot, negocio automático en el pipeline, notificación a Álvaro, Carlos y Chucho, evento de conversión a GA4 y evento Lead a Meta para retroalimentar el algoritmo.

**Nueve entraron por `apto.mx/contacto/` y uno por `landing.apto.mx`.** El desbalance no es de conversión: es de tráfico, y la razón está en la siguiente sección.

---

## Inversión y tráfico del periodo

| Canal | Inversión | Impresiones | Clics | Conversiones |
|---|---:|---:|---:|---:|
| Google Ads | $6,598.81 MXN | 3,114 | 141 | 9.8 |
| Meta Ads | **$0.00** | **0** | **0** | **0** |

Costo por lead mezclado: **$660 MXN** sobre los 10 leads del periodo.

**Sesiones por destino**

| Destino | Sesiones | Pagadas |
|---|---:|---:|
| apto.mx | 263 | 142 |
| landing.apto.mx | 78 | 33 |

Meta estuvo apagado los catorce días. En el mes completo de agosto esa cuenta gastó $6,966.80 MXN y trajo 8 leads a un costo de $870.85, pero todo eso ocurrió antes del 18. Reactivarlo es la decisión más directa que tenemos sobre volumen: la landing está construida y medida para recibir tráfico frío de Meta, y hoy no le está llegando.

---

## Corrección al reporte del 18 de agosto

En ese reporte se informó que **Gabriel Handel (Homma)** había entrado por `landing.apto.mx` con el pipeline completo —Worker, red de seguridad, Meta CAPI, GA4, HubSpot y negocio—. Al auditar el sistema se encontró que no fue así.

Su registro lo capturó el recolector automático de formularios de HubSpot, que copia lo que ve en la página. No pasó por nuestro Worker. En la práctica eso significa que ese lead llegó al CRM, pero sin negocio en el pipeline, sin señal a Meta y sin registrar la conversión en GA4.

Lo corregimos porque el dato cambia la lectura del A/B de ese periodo y porque un reporte que no se corrige solo deja de servir. El comportamiento ya está resuelto: desde el 25 de agosto los envíos de la landing pasan por el Worker y quedan registrados en el mismo formulario de HubSpot que el sitio principal.

---

## Lo que se reconstruyó en la capa de medición

El 25 de agosto se hizo una revisión completa de cómo se cuentan los leads. Se encontraron seis conteos duplicados y dos fallas de identidad. Todo está corregido y en producción.

**El evento de conversión ahora es uno solo.** Antes había varias fuentes emitiendo la conversión de lead en paralelo y una de ellas llegaba sin identificador de sesión, así que Google Analytics la atribuía a "directo" en vez de al canal que realmente trajo al prospecto. Hoy existe un único evento `generate_lead`, enriquecido, que distingue si el lead vino de la landing o del sitio principal.

**Meta dejó de contar doble.** El evento del navegador y el que manda nuestro servidor no se estaban emparejando, así que cada lead del sitio principal se registraba dos veces. Ahora comparten un identificador derivado del correo y Meta los reconoce como uno.

**El Pixel ahora sí manda los datos de identidad.** Nombre, apellido, correo y teléfono viajan cifrados junto con el identificador de contacto de HubSpot. Eso mejora la calidad de emparejamiento y, con ella, la capacidad del algoritmo de encontrar más gente parecida a quien ya convirtió.

**Se limpiaron los duplicados de Google Ads.** La conversión se estaba registrando dos veces por lead. Ya no.

Verificación: los dos formularios, en computadora y en celular, probados uno por uno navegando como usuario, con los registros de prueba borrados al terminar.

---

## Un cambio en el formulario de la landing

El campo "¿qué problema necesitas resolver?" pasó de opcional a obligatorio. Antes un lead podía llegar a Álvaro y Carlos con la descripción vacía; ahora llega con el problema del prospecto escrito, dentro del negocio en HubSpot.

Es un intercambio consciente: un campo obligatorio más reduce algo la tasa de llenado, y a cambio el equipo comercial arranca la conversación sabiendo de qué se trata. En B2B enterprise, donde cada lead cuesta cientos de pesos y una llamada vale más que un dato, la balanza está de este lado. Con esto además los dos formularios quedan idénticos, porque en `apto.mx/contacto/` ese campo ya era obligatorio.

---

## Vigilancia automática

Se dejó corriendo una revisión diaria del sistema. Verifica cuatro cosas sin tocar nada: que sigan entrando leads en cada sitio por separado, que los envíos a HubSpot y a Meta no estén fallando, que la configuración de medición no se haya movido, y que el formulario de la landing conserve sus campos.

Existe por una razón concreta. En agosto el formulario estuvo semanas sin registrar como debía y nadie se enteró hasta que se revisó a mano. Esa clase de falla es silenciosa por naturaleza: el sitio se ve bien, los anuncios corren, y el problema solo aparece cuando alguien va a buscar los leads y no están. La revisión diaria convierte eso en un aviso al día siguiente.

---

## Qué queda operando

**Anuncios.** Google Ads con tres campañas activas de adquisición, organizadas por tipología de cliente. Meta Ads configurado y listo, sin entrega desde el 18 de agosto.

**Web.** `landing.apto.mx` con el formulario en modal y `apto.mx/contacto/` con el formulario embebido. Los dos aterrizan en el mismo formulario de HubSpot.

**CRM.** Cada contacto que entra genera un negocio automático y notificación al equipo. Cinco campos guardan la atribución completa del lead.

**Medición.** Un evento de conversión unificado en GA4, Meta Pixel con CAPI del lado del servidor, Microsoft Clarity con grabaciones de sesión, y base de datos propia como red de seguridad de cada envío.

---

## Lo que sigue

**Decisión inmediata: reactivar Meta.** Es la palanca con efecto más directo sobre el volumen. La landing existe para ese tráfico y hoy está vacía.

**Segundo A/B en curso.** El 25 de agosto se lanzó una campaña que reparte tráfico entre `apto.mx/contacto/` y `landing.apto.mx` con la medición ya corregida. La lectura anterior estaba contaminada por el problema del formulario; ésta será la comparación limpia.

**Siguiente corte: 8 de septiembre.** Con Meta reactivado y una semana de A/B limpio, ahí sí hay base para decidir a cuál de los dos destinos mandar el presupuesto.

---

Preparado por Marketon · Chucho Porras · 31-ago-2026
