# Landing APTO · revisión local

Abre `index.html` en tu navegador. Conserva a su lado `styles.css`, `script.js` y la carpeta `assets/`. La página no requiere instalación ni compilación. Las imágenes y las fuentes son locales; los enlaces externos y el video requieren conexión.

## Referencias

- Estructura: https://landing.apto.mx/, consultada el 21 de septiembre de 2026.
- Diseño: sistema Norma, del repositorio `/Users/carlosbeltran/Code/aptobrain/apps/apto-web`.
- Fuente de verdad visual: `src/styles/global.css`; documentación: `docs/DESIGN.md` en la raíz del repositorio.
- Ilustraciones: `/Users/carlosbeltran/Documents/Codex/2026-09-14/t/outputs/`.
- Cómo pensamos: slide APTO adjunto por el usuario el 22 de septiembre de 2026; la correspondencia de capacidades, materiales y renders está documentada en `revision/referencias.json`.

## Qué contiene

Las diez secciones de la landing original, en el mismo orden: portada, enfoque, problemas, seis retos, casos, proyectos, metodología, equipo, contacto y preguntas frecuentes.

Se trasladaron las tipografías Satoshi y Clash Grotesk, las superficies cálidas, el azul de acento, los módulos de 4 px y la navegación de vidrio de Norma. Los renders navy se utilizan como material de marca; los casos conservan sus imágenes originales.

El 22 de septiembre se actualizó la sección «Cómo pensamos»: Estrategia se representa en azul liso, Diseño en azul texturado y Tecnología en cobre. Los tres materiales forman un marco triangular integrado. El HTML fuera de `#categoria` conserva exactamente el contenido de la versión previa a esta edición.

Los textos precisan entregas y alcances, eliminan repeticiones y promesas universales de implementación. Los testimonios conservan su redacción y atribución de la página de origen. Las cifras existentes proceden de esa página; no se agregaron métricas ni testimonios.

## Formulario

Es una vista previa local. Valida campos, correo, teléfono y consentimiento; muestra errores accesibles y una confirmación explícita de que no envía datos. No está conectado a HubSpot, no crea contactos y no contiene scripts de medición. Integrar el envío real y la medición corresponde a una futura publicación.

## Optimización y verificación

- Tres renders originales: 8,014,329 bytes → 188,630 bytes en sus variantes WebP máximas (97.65% menos). Hay variantes responsive adicionales para pantallas pequeñas.
- Assets completos tras esta edición: 40 archivos, 1,123,894 bytes, incluidas fuentes, fotografías, logos y licencias.
- Cómo pensamos incorpora 8 WebP que suman 69,070 bytes. Sus dimensiones y hashes coinciden con el manifest; los cuatro PNG originales permanecen intactos.
- Imágenes locales, dimensiones declaradas, carga diferida debajo de la portada y prioridad alta para el hero.
- Verificación en navegador servido por HTTP local: 390, 768, 1280 y 1440 px sin desbordamiento horizontal; menú móvil, Escape, anclas, FAQ, desplegable de retos y validación de formulario.
- Revisión de Cómo pensamos del 22 de septiembre: 390, 768, 1280 y 1440 px, sin desbordamiento horizontal, las cuatro imágenes cargadas y composición revisada visualmente; cero errores de consola observados.
- Comprobación estática del 22 de septiembre: diez secciones y seis retos; 60 referencias a 40 archivos locales existentes, incluidos 38 assets; anchos de `srcset` correctos; 42 IDs únicos y todas las referencias a IDs resueltas.
- JavaScript validado sintácticamente en la revisión base. La comprobación estática actual también verifica los destinos literales de `getElementById`.
- La apertura directa mediante file:// no pudo probarse en el navegador automatizado por su política de URLs; la estructura usa rutas relativas compatibles con apertura local.

`revision/` contiene las referencias de origen, el inventario de imágenes y la revisión editorial de trabajo. `revision/imagenes-capacidades-20260922.json` registra las fuentes, variantes, dimensiones, tamaños y hashes de la sección actualizada. La versión aplicada es `index.html`.

No se publicó la página ni se modificó el repositorio de la nueva web.

## Ajuste de portada y logo · 22 de septiembre de 2026

El logo ahora usa una imagen directa, sin máscara CSS, con contraste claro/oscuro según la sección. La portada utiliza Untitled6.jpg, la imagen elegida expresamente por el usuario, optimizada en dos WebP a 640 y 1024 px (182,484 bytes en total, sin ampliar el original); en móvil la ilustración ocupa un espacio debajo del título. Se conservaron los originales y las variantes anteriores como recursos alternativos.

Comprobación visual por HTTP local a 390, 768 y 1440 px: logo visible sobre superficies claras y navy, imágenes cargadas, sin desbordamiento horizontal ni errores de consola observados. El resto del contenido y el JavaScript se conservaron.

La selección final de portada se comprobó visualmente a 390 y 1440 px. Se conservó el grano de la imagen elegida; el logo, el diseño y las demás secciones mantienen la versión aprobada. Ver revision/imagen-portada-elegida-20260922.json.
