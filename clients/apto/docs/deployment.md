# Deployment · APTO Landing

## GitHub Pages
- Branch: `main`
- Path: `/clients/apto/landing/`
- URL preview: `https://mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/apto/landing/`

## Tracking snippets requeridos
- GTM: `GTM-K7J6MQ8` (container APTO existente)
- GA4: property `320108858`
- Meta Pixel: `721335916342252`
- Microsoft Clarity: `xnhu9emdgs`
- HubSpot Portal: `2583031`

Los snippets viven en el `<head>` del index.html según Sprint 5 SME configuración canónica.

## Custom domain (pendiente)
Cuando Álvaro autorice apto.mx:
1. Agregar CNAME en `clients/apto/landing/CNAME` con `apto.mx`
2. DNS APTO agrega registro CNAME apuntando a `mktgrupoplasenciaautomotriz.github.io`
3. GitHub Pages Settings: verificar dominio y habilitar HTTPS
