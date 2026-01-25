/**
 * X Optimizer Plugin for Clawdbot
 *
 * Este módulo implementa una función de análisis heurístico de posts de X (Twitter).
 * Dada una entrada con el texto del post y algunos indicadores opcionales,
 * devuelve un resumen de métricas, sugerencias de mejora y un prompt que
 * puede ser utilizado por un agente de Clawdbot para generar un análisis más
 * profundo o elaborar la respuesta óptima.
 */

// Listas muy básicas de palabras positivas y negativas para un análisis de sentimiento simplificado.
const positiveWords = [
  'bien', 'bueno', 'excelente', 'genial', 'positivo', 'mejor', 'fantástico', 'maravilloso', 'feliz', 'impresionante'
];
const negativeWords = [
  'mal', 'malo', 'horrible', 'terrible', 'negativo', 'peor', 'desastre', 'odio', 'triste', 'molesto'
];

/**
 * Calcula una puntuación de sentimiento muy rudimentaria basada en la aparición
 * de palabras positivas y negativas.
 *
 * @param {string} text
 * @returns {{score: number, positive: number, negative: number}}
 */
function sentimentScore(text) {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  let positive = 0;
  let negative = 0;
  words.forEach((w) => {
    if (positiveWords.includes(w)) positive++;
    if (negativeWords.includes(w)) negative++;
  });
  const total = positive + negative || 1;
  const score = (positive - negative) / total;
  return { score, positive, negative };
}

/**
 * Genera sugerencias basadas en el análisis de heurísticas.
 *
 * @param {object} analysis
 * @returns {string}
 */
function generateSuggestions(analysis) {
  const suggestions = [];
  // Respuesta / engagement
  if (analysis.replyScore < 0.3) {
    suggestions.push('Incluye una pregunta o llamada a la acción para fomentar respuestas.');
  }
  // Dwell time
  if (analysis.dwellScore < 0.3) {
    suggestions.push('Aumenta ligeramente el texto para incrementar el tiempo de lectura.');
  } else if (analysis.dwellScore > 0.8) {
    suggestions.push('Considera acortar el texto para mantener la atención del lector.');
  }
  // Vídeo
  if (!analysis.hasVideo) {
    suggestions.push('Añadir un vídeo o imagen atractiva puede aumentar el interés.');
  }
  // Enlaces
  if (analysis.linkPresent) {
    suggestions.push('Reduce el número de enlaces o ponlos al final para no distraer al lector.');
  }
  // Hashtags
  if (analysis.hashtags.length === 0) {
    suggestions.push('Añade uno o dos hashtags relevantes para mejorar el descubrimiento.');
  } else if (analysis.hashtags.length > 3) {
    suggestions.push('Usa un máximo de tres hashtags para evitar saturar el post.');
  }
  // Sentimiento
  if (analysis.sentiment.score < -0.3) {
    suggestions.push('Evita el lenguaje muy negativo; puede disuadir a los lectores.');
  } else if (analysis.sentiment.score > 0.5) {
    suggestions.push('El tono positivo es bueno, pero asegúrate de mantener autenticidad.');
  }
  return suggestions.join(' ');
}

/**
 * Analiza un post de X aplicando heurísticas sencillas.
 *
 * @param {string} postText
 * @param {boolean} hasVideo
 * @param {string[]} hashtags
 * @param {boolean} linkPresent
 * @returns {{summary: string, analysis: string, suggestions: string, prompt: string}}
 */
function analyzePost({ postText, hasVideo = false, hashtags = [], linkPresent = false }) {
  // Calcular puntuaciones heurísticas sencillas.
  const length = postText.length;
  const replyScore = /\?|¿|!\?|\bqué\b|\bpor qué\b/iu.test(postText) ? 0.7 : 0.2;
  const dwellScore = Math.min(length / 280, 1.0); // 0 a 1 basado en longitud (max 280 caracteres)
  const videoBonus = hasVideo ? 0.2 : 0.0;
  const linkPenalty = linkPresent ? -0.1 : 0.0;
  const hashtagScore = Math.min(hashtags.length * 0.15, 0.45);
  const sentiment = sentimentScore(postText);
  // Puntuación global simplificada
  const overall = Math.min(Math.max(replyScore + dwellScore + videoBonus + hashtagScore + linkPenalty + sentiment.score, 0), 1);
  // Crear un resumen textual de métricas
  const summary = [
    `Longitud del texto: ${length} caracteres`,
    `Puntuación de invitación a respuestas: ${(replyScore * 100).toFixed(1)}%`,
    `Puntuación de tiempo de lectura: ${(dwellScore * 100).toFixed(1)}%`,
    `Tiene vídeo: ${hasVideo ? 'sí' : 'no'}`,
    `Número de hashtags: ${hashtags.length}`,
    `Contiene enlace: ${linkPresent ? 'sí' : 'no'}`,
    `Sentimiento: ${sentiment.score >= 0 ? 'positivo' : 'negativo'} (${sentiment.score.toFixed(2)})`,
    `Puntuación global: ${(overall * 100).toFixed(1)}%`
  ].join('\n');
  const analysis = summary;
  const suggestions = generateSuggestions({ replyScore, dwellScore, hasVideo, hashtags, linkPresent, sentiment });
  // Construir un prompt para Clawdbot
  const prompt = `A continuación se muestra un post de X (Twitter). Analízalo y sugiere mejoras para aumentar su alcance y engagement.\n\n` +
    `**Texto del post:**\n${postText}\n\n` +
    `**Tiene vídeo?** ${hasVideo ? 'Sí' : 'No'}\n` +
    `**Hashtags:** ${hashtags.join(', ') || 'Ninguno'}\n` +
    `**Incluye enlaces?** ${linkPresent ? 'Sí' : 'No'}\n` +
    `\nGenera un informe corto (menos de 6 líneas) en español evaluando su desempeño potencial, señalando puntos fuertes y sugerencias de mejora.`;
  return { summary, analysis, suggestions, prompt };
}

/**
 * Punto de entrada del plugin para Clawdbot. Recibe los argumentos de entrada
 * definidos en `tool.json` y devuelve un objeto con los campos definidos en
 * `output_schema`.
 *
 * @param {object} args Argumentos de entrada, debe contener al menos `postText`.
 * @param {object} context Contexto proporcionado por Clawdbot (no usado aquí).
 */
module.exports = async function (args = {}, context = {}) {
  const { postText, hasVideo = false, hashtags = [], linkPresent = false } = args;
  if (!postText || typeof postText !== 'string') {
    throw new Error('El campo postText es obligatorio y debe ser una cadena.');
  }
  // Normalizar hashtags: asegurar que sea un array de cadenas sin # inicial
  const normalizedHashtags = Array.isArray(hashtags)
    ? hashtags.map((h) => h.replace(/^#/, '')).filter(Boolean)
    : [];
  return analyzePost({ postText, hasVideo: Boolean(hasVideo), hashtags: normalizedHashtags, linkPresent: Boolean(linkPresent) });
};