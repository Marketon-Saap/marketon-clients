# Custom domain para landing Karbot

**URL actual (GitHub Pages)**: https://mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/karbot/

Chucho decide qué subdominio quiere. Recomendado: `demo.karbot.mx`.

Alternativas: `agenda.karbot.mx`, `automotive.karbot.mx`, `automotriz.karbot.mx`.

---

## Instrucciones para el equipo Karbot (Diego / Alejandro / quien tenga acceso a DNS)

Necesitamos apuntar un subdominio de `karbot.mx` a nuestra landing en GitHub Pages. El dominio ya está en Cloudflare (verificado por MX records), así que el setup es 2 minutos.

### Paso 1 · Agregar CNAME en Cloudflare DNS

1. Entrar a https://dash.cloudflare.com/ (con la cuenta que tiene karbot.mx)
2. Seleccionar el dominio `karbot.mx`
3. Menu izquierdo → **DNS** → **Records**
4. Click **Add record** y configurar:

   | Campo | Valor |
   |---|---|
   | Type | `CNAME` |
   | Name | `demo` (o el subdominio que decidan) |
   | Target | `mktgrupoplasenciaautomotriz.github.io` |
   | Proxy status | **DNS only** (nube gris, no naranja) |
   | TTL | Auto |

5. Save

> **Importante**: el proxy debe estar en "DNS only" (nube GRIS), no en "Proxied" (nube naranja), porque GitHub Pages emite su propio certificado SSL y Cloudflare proxy interfiere.

### Paso 2 · Confirmarnos que ya está

Nos avisas cuando el record esté agregado y nosotros terminamos:
- Agregamos un archivo `CNAME` al repo `MktGrupoPlasenciaAutomotriz/marketon-clients` con el valor `demo.karbot.mx`
- GitHub Pages detecta y auto-emite certificado Let's Encrypt (tarda 5-10 min propagación)
- Verificamos HTTPS funcionando y les compartimos el link final

**Costo**: $0. Es solo un CNAME.

---

## Alternativa si no quieren tocar DNS

Podemos mantener el URL actual de GitHub Pages (`mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/karbot/`). Es funcional al 100% — solo es un URL más largo.

Los ads pueden apuntar ahí con `?utm_source=meta&utm_campaign=...` y todo funciona igual.
