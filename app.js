function optimizePost() {
    const input = document.getElementById('postInput').value.trim();
    if (!input) {
        alert('Por favor, ingresa un post.');
        return;
    }

    let score = 0;
    let suggestions = [];
    const maxScore = 100; // Máx ajustado para más granularidad, basado en multi-action predictions.

    // 1. Check para replies de calidad (P(reply) con peso alto ~30, del weighted scorer)
    if (checkForReplies(input)) {
        score += 30;
        suggestions.push('✅ Buena invitación a replies: Incluye preguntas o calls to action (peso alto en algoritmo).');
    } else {
        suggestions.push('❌ Sugerencia: Agrega preguntas para fomentar replies de calidad (13-30x más que likes). Ej: "¿Qué opinas?"');
    }

    // 2. Threads largos para dwell time (P(dwell) +20)
    const wordCount = input.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Longitud ideal para threads: Alto potencial de dwell time (tiempo de lectura).');
    } else {
        suggestions.push('❌ Sugerencia: Extiende a >100 palabras para threads largos y mayor P(dwell).');
    }

    // 3. Videos cortos con alto dwell (P(video_view) +15, P(photo_expand) si aplica)
    if (checkForVideos(input)) {
        score += 15;
        suggestions.push('✅ Menciona video: Perfecto si es corto con hook inicial para dwell alto.');
    } else {
        suggestions.push('❌ Sugerencia: Incluye videos cortos (2-3 seg) que enganchan rápido para P(video_view).');
    }

    // 4. Evitar negatives (P(not_interested), P(block), etc., -20 si riesgo)
    if (checkForNegatives(input, wordCount)) {
        suggestions.push('✅ Bajo riesgo de negatives: Contenido no repetitivo ni spammy.');
        score += 20;
    } else {
        suggestions.push('❌ Sugerencia: Evita repeticiones, ventas directas o spam para no generar P(not_interested)/blocks.');
        score -= 20;
    }

    // 5. Diversidad general (del Author Diversity Scorer)
    suggestions.push('ℹ️ Recordatorio: Espacia tus posts para evitar penalty por repetición de autor en feeds (Author Diversity Scorer).');

    // Clase de score
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    // HTML de resultados
    let resultsHtml = `<h2>Score Estimado (Aproximado del Weighted Scorer): <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    suggestions.forEach(s => {
        resultsHtml += `<div class="suggestion">${s}</div>`;
    });

    // Post optimizado si score bajo
    let optimizedPost = input;
    if (score < 70) {
        optimizedPost = optimizeText(input);
        resultsHtml += `<h3>Versión Optimizada Sugerida:</h3><p>${optimizedPost.replace(/\n/g, '<br>')}</p>`;
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

// Funciones auxiliares (basadas en insights del repo)
function checkForReplies(text) {
    const replyTriggers = ['?', 'qué piensas', 'comparte tu', 'opinión', 'dime', 'cuéntame'];
    return replyTriggers.some(trigger => text.toLowerCase().includes(trigger));
}

function checkForVideos(text) {
    const videoTriggers = ['video', 'vídeo', 'clip', 'watch', 'ver'];
    return videoTriggers.some(trigger => text.toLowerCase().includes(trigger));
}

function checkForNegatives(text, wordCount) {
    const repetitive = new Set(text.split(/\s+/)).size < wordCount * 0.7;
    const spammy = text.toLowerCase().includes('compra') || text.toLowerCase().includes('vende') || text.toLowerCase().includes('gratis');
    return !repetitive && !spammy;
}

function optimizeText(text) {
    let optimized = text;
    if (!checkForReplies(text)) optimized += '\n\n¿Qué opinas de esto? ¡Comparte en replies!';
    if (text.split(/\s+/).length < 100) optimized += '\n(Extiende con más detalles para un thread engaging)';
    if (!checkForVideos(text)) optimized += '\nMira este video corto relacionado: [link]';
    optimized += '\n#GlobalEye_TV';
    return optimized;
}