// main.js – lógica de interfaz para X Optimizer (Clawdbot)

// Palabras para análisis de sentimiento básico
const positiveWords = [
  'bien', 'bueno', 'excelente', 'genial', 'positivo', 'mejor', 'fantástico', 'maravilloso', 'feliz', 'impresionante'
];
const negativeWords = [
  'mal', 'malo', 'horrible', 'terrible', 'negativo', 'peor', 'desastre', 'odio', 'triste', 'molesto'
];

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

function generateSuggestions(analysis) {
  const suggestions = [];
  if (analysis.replyScore < 0.3) {
    suggestions.push('Incluye una pregunta o llamada a la acción para fomentar respuestas.');
  }
  if (analysis.dwellScore < 0.3) {
    suggestions.push('Aumenta ligeramente el texto para incrementar el tiempo de lectura.');
  } else if (analysis.dwellScore > 0.8) {
    suggestions.push('Considera acortar el texto para mantener la atención del lector.');
  }
  if (!analysis.hasVideo) {
    suggestions.push('Añadir un vídeo o imagen atractiva puede aumentar el interés.');
  }
  if (analysis.linkPresent) {
    suggestions.push('Reduce el número de enlaces o colócalos al final para no distraer.');
  }
  if (analysis.hashtags.length === 0) {
    suggestions.push('Añade uno o dos hashtags relevantes para mejorar el descubrimiento.');
  } else if (analysis.hashtags.length > 3) {
    suggestions.push('Usa un máximo de tres hashtags para evitar saturar el post.');
  }
  if (analysis.sentiment.score < -0.3) {
    suggestions.push('Evita el lenguaje muy negativo; puede disuadir a los lectores.');
  } else if (analysis.sentiment.score > 0.5) {
    suggestions.push('El tono positivo es bueno, pero asegúrate de mantener autenticidad.');
  }
  return suggestions.join(' ');
}

function analyzePost({ postText, hasVideo = false, hashtags = [], linkPresent = false }) {
  const length = postText.length;
  const replyScore = /\?|¿|!\?|\bqué\b|\bpor qué\b/iu.test(postText) ? 0.7 : 0.2;
  const dwellScore = Math.min(length / 280, 1.0);
  const videoBonus = hasVideo ? 0.2 : 0.0;
  const linkPenalty = linkPresent ? -0.1 : 0.0;
  const hashtagScore = Math.min(hashtags.length * 0.15, 0.45);
  const sentiment = sentimentScore(postText);
  const overall = Math.min(Math.max(replyScore + dwellScore + videoBonus + hashtagScore + linkPenalty + sentiment.score, 0), 1);
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
  const prompt = `A continuación se muestra un post de X (Twitter). Analízalo y sugiere mejoras para aumentar su alcance y engagement.\n\n` +
    `**Texto del post:**\n${postText}\n\n` +
    `**Tiene vídeo?** ${hasVideo ? 'Sí' : 'No'}\n` +
    `**Hashtags:** ${hashtags.join(', ') || 'Ninguno'}\n` +
    `**Incluye enlaces?** ${linkPresent ? 'Sí' : 'No'}\n` +
    `\nGenera un informe corto (menos de 6 líneas) en español evaluando su desempeño potencial, señalando puntos fuertes y sugerencias de mejora.`;
  return { summary, analysis, suggestions, prompt };
}

// UI interactions
const postTextEl = document.getElementById('postText');
const hashtagsEl = document.getElementById('hashtags');
const hasVideoEl = document.getElementById('hasVideo');
const linkPresentEl = document.getElementById('linkPresent');
const analyzeBtn = document.getElementById('analyzeBtn');
const promptBtn = document.getElementById('promptBtn');
const resultsSection = document.getElementById('results');
const analysisEl = document.getElementById('analysis');
const suggestionsEl = document.getElementById('suggestions');
const promptEl = document.getElementById('prompt');

let lastResult = null;

analyzeBtn.addEventListener('click', () => {
  const postText = postTextEl.value.trim();
  const hashtags = hashtagsEl.value.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean);
  const hasVideo = hasVideoEl.checked;
  const linkPresent = linkPresentEl.checked;
  if (!postText) {
    alert('Por favor introduce el texto del post.');
    return;
  }
  lastResult = analyzePost({ postText, hasVideo, hashtags, linkPresent });
  analysisEl.textContent = lastResult.analysis;
  suggestionsEl.textContent = lastResult.suggestions;
  promptEl.value = '';
  promptBtn.disabled = false;
  resultsSection.classList.remove('hidden');
});

promptBtn.addEventListener('click', () => {
  if (lastResult) {
    promptEl.value = lastResult.prompt;
    promptEl.select();
    promptEl.setSelectionRange(0, lastResult.prompt.length);
    document.execCommand('copy');
    alert('Prompt copiado al portapapeles.');
  }
});