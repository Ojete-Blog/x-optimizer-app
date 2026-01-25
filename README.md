# X Optimizer App – Versión final

Esta versión pulida de **x-optimizer-app** te permite optimizar y analizar publicaciones de X (Twitter) para **@GlobalEye_TV** con una experiencia de usuario de aspecto profesional. Se incorporan paneles de navegación, un encabezado moderno, autenticación real con Google, anuncios de Google AdSense y un sistema de suscripción que elimina la publicidad durante un mes.

## Novedades destacadas

### Interfaz renovada

* **Cabecera y navegación**: un encabezado con diseño limpio y un menú de pestañas permiten alternar fácilmente entre la sección de optimización y la de informe.
* **Presentación del post optimizada**: el campo de URL renderiza la publicación de X mediante el widget oficial; las áreas de texto permiten análisis manual, y los resultados se muestran en una pestaña dedicada con tablas y gráficas.

### Inicio de sesión con Google

La app utiliza [Google Identity Services](https://developers.google.com/identity/gsi/web?hl=es) para ofrecer un botón de “Iniciar sesión con Google”. Cuando el usuario inicia sesión, su correo electrónico se almacena en `localStorage` y se muestra en la interfaz. Para que funcione correctamente debes reemplazar `REEMPLAZA_CON_TU_CLIENT_ID_DE_GOOGLE` en `main.js` por el *Client ID* de tu proyecto de Google Cloud.

### Anuncios reales con Google AdSense

La app incluye un bloque de Google AdSense fijado en el pie de página. Para que se muestre correctamente debes:

1. Tener una cuenta de Google AdSense y obtener tu identificador de editor (`ca‑pub‑xxxxxxxxxxxxxxx`).
2. Reemplazar `REPLACE_WITH_YOUR_ADSENSE_CLIENT` en `index.html` por tu identificador de AdSense.
3. Crear una unidad de anuncio en tu panel de AdSense y copiar su *ad slot ID*. Sustituye `REPLACE_WITH_FOOTER_AD_SLOT_ID` en `index.html` por el código de ese bloque.

Si no configuras AdSense, la estructura del bloque seguirá presente pero el anuncio no se cargará. Puedes sustituirlo por contenido propio o mantener el sistema sin publicidad.

### Sistema de suscripción

Los usuarios pueden suscribirse por 1 € al mes para ocultar el anuncio de pie de página. La app almacena la fecha de expiración en `localStorage` y, mientras esté vigente, no se volverán a mostrar anuncios. Este sistema se gestiona completamente en el cliente y no requiere claves ni procesamiento en el servidor.

### Enriquecimiento opcional

Si deseas un análisis más profundo, puedes proporcionar tus claves para **NewsAPI.org**, **NewsData.io** y **Twinword Sentiment** en la sección de API keys. La aplicación continuará funcionando sin estas claves, generando un informe básico.

## Archivos del proyecto

* `index.html` – Estructura de la interfaz de usuario, bloques de anuncios y contenedores de pestañas. Incluye las etiquetas `<ins>` de AdSense y la carga del botón de Google.
* `styles.css` – Estilos globales para la cabecera, menú de pestañas, formularios, tablas de resultados y componentes publicitarios.
* `main.js` – Lógica de la aplicación: gestión de pestañas, análisis de posts, generación de informes y prompts, inicio de sesión con Google, anuncios AdSense y control de suscripciones.
* `.gitattributes` – Configuración de Git.

## Uso

1. Descomprime el proyecto y abre `index.html` en tu navegador favorito.
2. Configura tu Client ID de Google y tus identificadores de AdSense, si dispones de ellos, modificando `main.js` e `index.html` tal como se explica en las secciones anteriores.
3. En la pestaña **Optimizar**, pega la URL de un post de X o introduce texto y media manualmente. Pulsa **Auto‑Analizar & Optimizar** para generar un informe detallado. Puedes alternar a la pestaña **Informe** para ver el resultado y el gráfico.
4. Para utilizar las APIs opcionales, introduce tus claves en los campos correspondientes y pulsa **Guardar Keys**. Para obtener un prompt extendido compatible con Grok, usa **Generar Prompt para Grok**.
5. Al cargar la página se mostrará un anuncio en el pie de página. Si prefieres eliminarlo, haz clic en cualquier botón “Sin anuncios 1 €”; la suscripción se almacenará durante 30 días en tu navegador.

## Consideraciones

* Esta aplicación está concebida como una herramienta de ejemplo que funciona íntegramente en el cliente. El manejo de anuncios y suscripciones es local y no implica transacciones reales.
* Para mostrar anuncios reales, debes cumplir con las políticas de Google AdSense y proporcionar tus propios códigos. Si prefieres no usar AdSense, puedes sustituir los bloques `<ins class="adsbygoogle">` por tus propios contenidos o imágenes.
