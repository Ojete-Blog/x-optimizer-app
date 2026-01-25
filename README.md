# X Optimizer – Plugin para Clawdbot

Esta carpeta contiene una implementación completa del **X Optimizer** como una **herramienta de Clawdbot**.  
El objetivo de este plugin es llevar la lógica heurística de la aplicación *x‑optimizer‑app* dentro del sistema de Clawdbot para que pueda ejecutarse directamente desde una conversación o desde el panel de herramientas del agente, sin depender de servicios externos de pago.  

El plugin expone una función que acepta como entrada el texto de un post de X (Twitter) junto con algunos indicadores opcionales (si incluye vídeo, si contiene enlaces externos y los hashtags utilizados) y devuelve un análisis estructurado y un conjunto de sugerencias para optimizarlo.  
Además genera un *prompt* en español que se puede utilizar para solicitar un análisis más profundo al agente de Clawdbot.  

## Contenido del repositorio

| Archivo/Directorio                 | Descripción                                                                                                           |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| `tool.json`                       | Metadatos y esquemas de entrada/salida del plugin. Define el identificador, nombre, descripción e interfaz.           |
| `index.js`                        | Implementación de la función principal que analiza el post y genera el resumen, sugerencias y prompt.                |
| `package.json`                    | Declaración mínima de paquete npm para permitir instalación y resolución de dependencias, si fuera necesario.        |
| `ui/`                             | Versión simplificada de la interfaz gráfica de *x‑optimizer‑app*, adaptada para ejecutarse en el `canvas` de Clawdbot. |
| `ui/index.html`                   | Estructura HTML del panel.                                                                                            |
| `ui/main.js`                      | Lógica de la interfaz web: gestiona formularios, llama al plugin local y muestra el resultado.                        |
| `ui/styles.css`                   | Estilos para una apariencia moderna en modo oscuro.                                                                   |

## Instalación en Clawdbot

1. Asegúrate de tener Clawdbot instalado y configurado en tu máquina. Consulta la documentación oficial para instalar el gateway y habilitar el *canvas*.
2. Copia toda la carpeta `x-optimizer-clawdbot-plugin` dentro de la ruta `tools/` o `skills/` de tu instalación de Clawdbot (la ruta exacta puede variar según tu configuración; en instalaciones estándar suele ser `~/.clawdbot/tools/`).
3. Reinicia el gateway de Clawdbot o recarga las herramientas desde el panel de control. El plugin debería aparecer bajo el nombre **X Optimizer**.
4. Para usarlo desde una conversación, puedes invocar el comando de herramienta indicado o abrir la interfaz gráfica desde el *canvas* (`http://localhost:18793/__clawdbot__/canvas/x-optimizer-clawdbot-plugin/ui/index.html`).
5. Si utilizas la interfaz gráfica, rellena los campos del post y pulsa **Analizar** para obtener el informe. El botón **Generar Prompt** preparará un texto que puedes copiar y pegar en el chat con tu agente de Clawdbot.

## Funcionamiento del análisis heurístico

El algoritmo implementado en `index.js` aplica reglas simples para evaluar la probabilidad de recibir respuestas (invitación al diálogo), el tiempo de lectura (prolongación de la atención), la presencia de multimedia y enlaces, y el uso de hashtags.  
Con ello calcula puntuaciones relativas y genera sugerencias concretas para mejorar el alcance del post. También aplica un análisis básico de sentimiento comprobando palabras negativas y positivas.  
Estas reglas son orientativas y no sustituyen un estudio exhaustivo de la plataforma de X, pero ofrecen una primera guía sin coste alguno ni dependencias de APIs externas.

## Dependencias opcionales

El plugin no depende de APIs de pago. Los campos para NewsAPI.org, NewsData.io o Twinword Sentiment permanecen en el código de la interfaz (`ui/main.js`), pero están desactivados por defecto. Si deseas habilitarlos con tus propias claves (gratuitas u obtenidas por tu cuenta), puedes introducirlas en la interfaz web. Las peticiones se realizarán directamente desde el navegador y no desde Clawdbot, por lo que no se requiere modificar el backend.

## Licencia

Este código se distribuye sin garantía alguna. Puedes modificarlo y adaptarlo a tus necesidades siempre que respetes las licencias de los proyectos de origen. Aunque el plugin está inspirado en el repositorio original [x-optimizer-app](https://github.com/Ojete-Blog/x-optimizer-app), esta implementación es una adaptación independiente orientada a Clawdbot.