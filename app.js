function optimizePost() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim();
    
    if (!textInput) {
        alert('Por favor, pega el texto del post (requerido para análisis preciso). Si das URL, copia el texto de X manualmente.');
        return;
    }

    let postId = null;
    if (urlInput) {
        // Regex preciso para extraer post_id de URL de X (e.g., /status/1234567890123456789)
        const match = urlInput.match(/\/status\/(\d+)/);
        if (match) {
            postId = match[1];
            alert(`Post ID extraído: ${postId}. Análisis basado en texto pegado (fetch no disponible sin API/costo).`);
        } else {
            alert('URL inválida. Debe ser como https://x.com/user/status/123456.');
            return;
        }
    }

    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // 1. Replies de calidad (P(reply) +30, preciso con triggers del repo como engagement history)
    if (checkForReplies(textInput)) {
        score += 30;
        suggestions.push('✅ Excelente para replies: Incluye triggers como preguntas (peso alto ~13-30x like en weighted scorer).');
    } else {
        suggestions.push('❌ Mejora: Agrega calls-to-action precisos para P(reply) (e.g., "¿Qué opinas de esta noticia global?").');
    }

    // 2. Threads largos para dwell (P(dwell) +20, check palabra count >100, del scoring)
    const wordCount = textInput.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Ideal para dwell time: Thread largo favorece P(dwell) y engagement sostenido.');
    } else {
        suggestions.push('❌ Mejora: Extiende a >100 palabras para threads (aumenta P(dwell) en Phoenix scorer).');
    }

    // 3. Videos cortos con alto dwell (P(video_view) +15, check para media/filter:videos)
    if (checkForVideos(textInput)) {
        score += 15;
        suggestions.push('✅ Bueno para videos: Mención a clips cortos con hook para alto P(video_view).');
    } else {
        suggestions.push('❌ Mejora: Incluye videos cortos (2-3 seg iniciales) para P(video_view/photo_expand).');
    }

    // 4. Evitar negatives (P(not_interested/block/report) -20, check repetitivo/spam, muted keywords comunes)
    if (checkForNegatives(textInput, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo de negatives: No spammy, pasa pre-scoring filters como muted keywords.');
    } else {
        score -= 20;
        suggestions.push('❌ Mejora: Evita repeticiones o spam (genera P(not_interested)/block, pesos negativos en scorer).');
    }

    // 5. Media/links extra (filter:media/links +10, para diversidad)
    if (checkForMedia(textInput)) {
        score += 10;
        suggestions.push('✅ Plus para media/links: Aumenta P(click/share), compatible con candidate hydration.');
    } else {
        suggestions.push('❌ Mejora: Agrega links o media para P(click) y diversidad (evita author diversity penalty).');
    }

    // 6. Recordatorio general (del repo: Author Diversity Scorer, para @GlobalEye_TV nicho noticias)
    suggestions.push('ℹ️ Tip para @GlobalEye_TV: Espacia posts noticiosos para evitar penalty por autor repetido. Usa videos globales para dwell alto.');

    // Ajuste final score (clamp 0-100)
    score = Math.max(0, Math.min(100, score));

    // Clase de score (más estricta)
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    // HTML resultados
    let resultsHtml = `<h2>Score Estimado (Simulación Weighted Scorer): <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    if (postId) resultsHtml += `<p>Post ID: ${postId} (usa para tracking en X).</p>`;
    suggestions.forEach(s => {
        resultsHtml += `<div class="suggestion">${s}</div>`;
    });

    // Post optimizado (más inteligente, basado en faltas)
    let optimizedPost = optimizeText(textInput, { hasReplies: checkForReplies(textInput), hasVideos: checkForVideos(textInput), wordCount });
    if (score < 70) {
        resultsHtml += `<h3>Versión Optimizada Sugerida:</h3><p>${optimizedPost.replace(/\n/g, '<br>')}</p>`;
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

// Funciones auxiliares (mejoradas con regex precisos, basadas en repo)
function checkForReplies(text) {
    const replyRegex = /\?|\b(qué piensas|qué opinas|comparte tu|dime|cuéntame|opinión|discute)\b/i;
    return replyRegex.test(text);
}

function checkForVideos(text) {
    const videoRegex = /\b(video|vídeo|clip|watch|ver|reel)\b/i;
    return videoRegex.test(text);
}

function checkForNegatives(text, wordCount) {
    const uniqueWords = new Set(text.split(/\s+/)).size;
    const repetitive = uniqueWords < wordCount * 0.75; // Más estricto que antes
    const spammyRegex = /\b(compra|vende|gratis|oferta|descuento|urgente)\b/i; // Muted keywords comunes
    return !repetitive && !spammyRegex.test(text);
}

function checkForMedia(text) {
    const mediaRegex = /\b(link|enlace|imagen|foto|video|media|url)\b/i || text.includes('http');
    return mediaRegex.test(text);
}

function optimizeText(text, { hasReplies, hasVideos, wordCount }) {
    let optimized = text;
    if (!hasReplies) optimized += '\n\n¿Qué opinas de esta noticia global? ¡Comparte en replies para más alcance!';
    if (wordCount < 100) optimized += '\n(Agrega más detalles aquí para un thread engaging y mayor dwell time)';
    if (!hasVideos) optimized += '\nMira este video corto relacionado: [inserta link o descripción]';
    optimized += '\n#GlobalEye_TV #NoticiasGlobales';
    return optimized;
}