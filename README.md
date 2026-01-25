# X Optimizer App – Adaptado para Clawdbot (versión 2026)

Esta versión actualizada de **x‑optimizer‑app** ha sido adaptada para funcionar dentro del ecosistema de **Clawdbot**. La aplicación se ejecuta por completo en el cliente y no depende de servicios de pago: puede analizar y optimizar publicaciones de X (Twitter) sin necesidad de claves API de terceros.  
Los paneles de navegación, el sistema de pestañas y el informe siguen conservando el aspecto profesional, pero se han simplificado las opciones para centrarse en un análisis básico y en la generación de un _prompt_ para solicitar un análisis avanzado al agente de Clawdbot.

## Novedades y cambios

* **Integración con Clawdbot**: esta versión está pensada para ejecutarse como recurso estático en el servidor **canvas** de Clawdbot. Basta con copiar la carpeta del proyecto al directorio de _canvas_ y acceder a `index.html` desde el dashboard de Clawdbot. No requiere back‑end ni API externas.
* **Claves API opcionales desactivadas**: aunque la aplicación mantiene el soporte para introducir claves de **NewsAPI.org**, **NewsData.io** y **Twinword Sentiment** para obtener noticias y análisis de sentimiento, su uso es totalmente opcional. Si no introduces ninguna clave, el análisis se basa en heurísticas internas, por lo que no hay dependencias de servicios de pago.
* **Sistema de anuncios y suscripción**: el bloque de Google AdSense y el sistema de suscripción se conservan como en la versión original. Puedes sustituirlos por tu propio contenido o mantenerlos ocultos si no deseas usarlos.
* **Generación de prompt para Clawdbot**: el botón **Generar Prompt** crea un texto que puede pegarse en una conversación con tu agente de Clawdbot para obtener un informe detallado. Este prompt describe el post y su media, proporcionando al agente toda la información necesaria para realizar un análisis avanzado.

## Archivos del proyecto

| Archivo           | Descripción                                                                           |
|-------------------|---------------------------------------------------------------------------------------|
| `index.html`      | Estructura de la interfaz de usuario. Incluye la cabecera, menú de pestañas, paneles y contenedores. |
| `styles.css`      | Hoja de estilos con un tema oscuro profesional y elementos responsive.                 |
| `main.js`         | Lógica principal: gestión de pestañas, análisis heurístico, generación de informes y prompts, control de login, anuncios y suscripciones. |
| `.gitattributes`  | Configuración de Git para normalizar los finales de línea.                             |

## Uso con Clawdbot

1. **Instala Clawdbot** en tu máquina siguiendo la guía de instalación. Asegúrate de que el **canvas host** esté funcionando (por defecto en `http://localhost:18793/__clawdbot__/canvas/`).
2. Copia la carpeta `x-optimizer-app-clawdbot` en la ruta donde Clawdbot sirve el canvas o publícala a través de cualquier servidor estático accesible desde tu navegador.
3. Accede a `index.html` desde el dashboard de Clawdbot o directamente en tu navegador. La aplicación se ejecutará localmente.
4. Pega la URL de un post de X o introduce texto y descripción de media manualmente en la pestaña **Optimizar**. Pulsa **Auto‑Analizar & Optimizar** para generar el informe básico.
5. Para obtener un análisis detallado, pulsa **Generar Prompt**. Copia el texto generado y pégalo en el chat con tu agente de Clawdbot. El agente utilizará el prompt para producir un informe exhaustivo.

## Consideraciones

* La aplicación está diseñada para funcionar **sin dependencias de pago**. Las llamadas a NewsAPI.org, NewsData.io y Twinword Sentiment están desactivadas a menos que proporciones tus propias claves.  
* Google AdSense y el inicio de sesión con Google son componentes gratuitos opcionales. Si no deseas usarlos, puedes eliminar sus scripts de `index.html` o reemplazarlos por tus propios fragmentos.
* La optimización se basa en reglas heurísticas internas que puntúan aspectos como invitaciones a respuestas, tiempo de lectura (dwell time), presencia de vídeos, uso de hashtags y enlaces, y la probabilidad de comentarios negativos.
* El sistema de suscripción almacena la fecha de expiración en `localStorage`. No se realiza ninguna transacción real.
