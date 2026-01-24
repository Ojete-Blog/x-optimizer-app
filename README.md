# X Optimizer App con Anuncios

Esta es una versión mejorada del repositorio **x-optimizer-app**. Además de mantener el flujo de análisis y optimización de posts de X (antes Twitter) para @GlobalEye_TV, se ha añadido un sistema de anuncios sencillo que no requiere ninguna API ni clave externa.

## Características principales

- **Ads sin claves**: Se muestra un banner con imágenes aleatorias obtenidas de [Picsum Photos](https://picsum.photos), un servicio que genera imágenes de alta calidad de forma gratuita y sin necesidad de registro ni API keys【993678427988795†L123-L134】【993678427988795†L177-L183】.
- **Suscripción opcional**: Si el usuario prefiere una experiencia sin anuncios, puede activar la opción "Sin anuncios" por 1 $ (suscripción simulada que se guarda en `localStorage` y oculta los anuncios en futuras visitas).
- **Compatibilidad total**: El resto de la aplicación funciona igual que antes, incluyendo la detección de posts vía URL, el análisis automático/manual y la generación de prompt para Grok.

## Estructura del proyecto

- `index.html` – Estructura de la interfaz. Incluye el banner de anuncios y botones para suscribirse.
- `styles.css` – Estilos generales y estilos específicos para el banner de publicidad y el botón de suscripción.
- `app.js` – Lógica principal. Añade el manejo del estado de suscripción, carga de anuncios y refresco periódico.
- `.gitattributes` – Configuración de Git.

## Uso

1. Abre `index.html` en tu navegador para ejecutar la app de optimización.
2. Si prefieres la versión sin anuncios, pulsa en el botón "Sin anuncios 1$". La suscripción se guardará localmente y eliminará el banner de publicidad en futuras visitas.
3. Copia la URL del post que quieras analizar o introduce texto/manual en los campos correspondientes. La app generará un análisis detallado y sugerencias de optimización.

## Nota sobre las APIs

El enriquecimiento opcional con NewsAPI.org, NewsData.io o Twinword Sentiment sigue disponible si introduces tus propias claves API en los campos indicados. Estas claves no son obligatorias para el funcionamiento básico ni para el sistema de anuncios.