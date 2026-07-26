# APTO · Landing Madre

Landing page para captura de leads B2B enterprise. Owner: Marketon (Chucho Porras, Fractional CMO).

## Estructura

```
landing/
├── index.html         # Landing single-file self-contained (HTML + CSS inline + JS vanilla)
├── assets/
│   ├── favicon.svg
│   └── og-image.svg
├── scripts/           # Reservado para módulos JS futuros
├── styles/            # Reservado para CSS externo si se modulariza
└── README.md
```

## Deploy

**GitHub Pages** (actual):
`https://mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/apto/landing/`

**Custom domain (futuro)**:
`https://apto.mx/` o subdomain a definir con Álvaro.

## Backend / Form integration

Form submit va directo a HubSpot Forms API v3:
- Portal: `2583031`
- Form ID: `6f9db620-165b-451b-8b49-76b441eea7ce`
- Endpoint: `POST https://api.hsforms.com/submissions/v3/integration/submit/2583031/6f9db620-165b-451b-8b49-76b441eea7ce`

**Iteración 2 pendiente**: reemplazar submit directo a HubSpot por endpoint Cloudflare Worker Marketon que orquestra:
1. HubSpot Contact create/update + lifecyclestage=lead
2. HubSpot Deal create en pipeline `Marketon · APTO Sales Pipeline 2026H2` (id 922134387), stage New Lead
3. Meta CAPI Lead event
4. Google Ads Enhanced Conversion
5. GA4 generate_lead
6. Email notify chucho@marketon.mx

Documentación completa: `Clientes/Apto/03-Estrategia/Fase-2-Plan-MKT/Landing/HubSpot-Backend-Credentials-v1.md`

## Tracking (GTM dataLayer events)

| Event | Trigger |
|---|---|
| `hero_cta_click` | Click CTA hero |
| `hero_secondary_click` | Click "Ver casos" link secundario |
| `nav_cta_click` | Click CTA nav sticky |
| `sticky_cta_click` | Click CTA sticky bottom mobile |
| `whitepaper_intent` | Click "Descargar whitepaper" flagship Coppel |
| `form_start` | Focus primer input del form |
| `form_field_error` | Validación de campo falla |
| `form_submit_success` | HubSpot 200 |
| `form_submit_fail` | HubSpot 4xx/5xx |

Todos los eventos incluyen `label` con texto del elemento (max 50 chars).

## Specs de diseño

Ver `Clientes/Apto/03-Estrategia/Fase-2-Plan-MKT/Landing/UI-Copy-Landing-Madre-v1.md` para:
- Design tokens (colores, tipografía, spacing)
- Copy canónico por sección
- Estados form (9 estados obligatorios)
- Métricas objetivo (LCP<2.5s, CTA CR>12%, form CR 3-6%)

## Restricciones técnicas

- Vanilla JS únicamente (cero React/jQuery/Vue)
- CSS moderno (custom properties, grid, flex, no preprocesador)
- Single-file para performance (reduce round-trips HTTP)
- Fuentes: Inter via Google Fonts con preconnect + preload
- Imágenes: WebP con fallback JPG cuando reemplacemos placeholders SVG
- HTML W3C validated
- WCAG 2.1 AA a11y baseline

## Assets pendientes de reemplazo (Fase 6.2)

- [ ] Logo APTO oficial (SVG con brand book)
- [ ] Logos clientes reales (Coppel, APIMSA, MTP, Corona, Iusa, Grisi) — SVG o PNG optimizado
- [ ] Hero visual: metáfora abstracto→concreto pixelado (Carlos 00:20:11) — via visual-composer o Figma
- [ ] Caso flagship Coppel visual: diagrama sistémico
- [ ] og-image real (PNG 1200×630, actualmente SVG placeholder)
- [ ] favicon real (32×32 y 180×180 apple-touch-icon)

## Iteración

Ver `Clientes/Apto/03-Estrategia/Fase-2-Plan-MKT/Landing/CRO-Playbook-Landing-Madre-v1.md` para las 10 hipótesis de CRO priorizadas por ICE score, listas para A/B test post-launch cuando lleguemos a volumen mínimo (500 sessions/mes).
