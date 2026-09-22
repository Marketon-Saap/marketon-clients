# Smoke test E2E · Landing v2 en producción · 22-sep-2026

**Alcance:** landing.apto.mx recién publicada (commit `0fc1409`, tag de rollback `v1-2026-09-22`). Pruebas desde UI real, sin inyección de datos: desktop en Google Chrome (MCP de Chrome, 1920×929) y móvil en el navegador integrado con preset iPhone 375×812, porque Chrome está en pantalla completa y no acepta cambiar el viewport (mismo caso que el 21-sep). Verificación posterior en D1, HubSpot y GA4 por API.

## Resultado: 4 de 4 envíos correctos de punta a punta

| # | Dispositivo | Ruta | Contacto HubSpot | Deal | Fila D1 | Pixel Meta `Lead` | CAPI |
|---|---|---|---|---|---|---|---|
| 1 | Desktop Chrome | Modal desde CTA del hero | 250086969888 | 65198952831 | 48 | disparó (no instrumentado) | success |
| 2 | Desktop Chrome | Formulario inline al final | 250085377318 | 65198653520 | 49 | disparó (no instrumentado) | success |
| 3 | Móvil 375 | Bottom sheet desde barra fija | 250091470928 | 65176899688 | 50 | `Lead` con `eventID` = `event_id` del Worker | success |
| 4 | Móvil 375 | Formulario inline al final | 250100716148 | 65182011515 | 51 | `Lead` con `eventID` = `event_id` del Worker | success |

Los 4 deals están en el pipeline Marketon (922134387), etapa nuevo lead (1407911441), con el mensaje y la marca de tiempo del consentimiento en la descripción. Los 4 contactos traen nombre, apellido, empresa y cargo en MAYÚSCULAS, `mobilephone` en E.164 (+522224025291) y un deal asociado. GA4 en tiempo real: 4 `generate_lead`, 8 `form_start`, 2 `hero_cta_click`, 1 `sticky_cta_click`, 16 `page_view`. Google Ads: conversión "Hubspot - Form Submission (Lead)" disparada en cada envío con datos mejorados (correo). Clarity activo. Script de HubSpot cargado (cookie `hutk` presente en el payload).

**Es un solo formulario.** El modal y el bloque final comparten el mismo `#form-card`: se mueve al modal al abrirlo y regresa al bloque final al cerrarlo. Se probó por las dos rutas en los dos dispositivos.

## Reglas de campos verificadas en producción (desktop, modal)

| Campo | Regla | Resultado |
|---|---|---|
| Nombre, apellido, cargo | Solo letras y espacios; se guardan en MAYÚSCULAS | "Qa 123" rechazado con mensaje; "Qa desktop modal" → "QA DESKTOP MODAL" |
| Empresa | Letras, números y espacios (se permiten `.`, `&` y `-` por razones sociales) | "Marketon @QA!" rechazado; "Marketon QA" → "MARKETON QA" |
| Correo | Con arroba y dominio | "correo-invalido" rechazado |
| Teléfono | Solo dígitos, 10 exactos para México, recorte automático | "123456789" rechazado; el input no acepta letras |
| Consentimiento | Obligatorio | Bloquea el envío |
| Mensaje | Texto libre, obligatorio, 10 a 500 caracteres | Sin reglas adicionales |

## Hallazgos

1. **Correo de notificación no sale.** Las 4 filas D1 tienen `resend_status = skipped`: el Worker no tiene configurado el secreto de Resend, así que los 5 destinatarios (chucho@marketon.mx, chucho@apto.mx, alvaro@, carlosbeltran@, alejandro@) no reciben aviso por correo; el lead llega a HubSpot y ahí es donde lo ven. **Es preexistente:** todas las filas desde el 8-sep (ids 36 a 47) ya tenían `skipped`; el Worker nunca tuvo el secreto `RESEND_API_KEY`. Si APTO quiere el correo, se configura el secreto (5 minutos) y se prueba.
2. **D1 guarda solo la primera palabra del nombre** (`firstname = QA` cuando HubSpot tiene `QA DESKTOP MODAL`). Es comportamiento del Worker, no de la landing; HubSpot está completo. No bloquea.
3. En móvil, el hero tarda un instante en pintar la ilustración; en la captura definitiva aparece correcta.

## Registros de prueba (borrar cuando Chucho valide)

- HubSpot contactos: 250086969888 · 250085377318 · 250091470928 · 250100716148
- HubSpot deals: 65198952831 · 65198653520 · 65176899688 · 65182011515
- D1 `leads` ids 48, 49, 50, 51 (`utm_source = smoke`, excluidos de conteos por regla)

Evidencia: capturas de producción desktop y móvil en `Landing/Smoke-v2-prod-2026-09-22/`.
