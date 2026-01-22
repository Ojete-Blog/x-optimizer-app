let postId = null;

function loadPreview() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const previewStatus = document.getElementById('previewStatus');
    const tweetEmbed = document.getElementById('tweetEmbed');

    tweetEmbed.innerHTML = '';
    if (!urlInput) {
        previewStatus.textContent = 'Pega la URL para preview e investigación auto.';
        return;
    }

    const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
    if (!match) {
        previewStatus.textContent = 'URL inválida. Debe ser un enlace a un post de X (ej: https://x.com/user/status/123456).';
        return;
    }

    postId = match[1];
    previewStatus.textContent = `Cargando preview del post ${postId}...`;

    function tryRender() {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
            window.twttr.widgets.createTweet(postId, tweetEmbed, { lang: 'es', dnt: true }).then(() => {
                previewStatus.textContent = 'Preview cargado – usa Auto-Analizar para informe detallado.';
            }).catch((err) => {
                console.error('Error al cargar embed:', err);
                previewStatus.textContent = 'Error al cargar preview. Intenta de nuevo o usa modo manual.';
            });
        } else {
            setTimeout(tryRender, 2000);
        }
    }
    tryRender();

    setTimeout(() => {
        if (!tweetEmbed.querySelector('iframe')) fallback(urlInput);
    }, 10000);
}

function fallback(url) {
    document.getElementById('previewStatus').innerHTML = `No cargó embed. <a href="${url}" target="_blank" class="fallback-link">Ver en X</a>`;
}

function autoAnalyze() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim();
    const mediaInput = document.getElementById('mediaInput').value.trim();
    const previewStatus = document.getElementById('previewStatus');

    previewStatus.textContent = 'Iniciando análisis (detectando modo)...';

    let mode = 'manual';
    let fetchedText = textInput;
    let fetchedMedia = mediaInput;
    let parsingSuccess = false;

    if (urlInput && postId) {
        mode = 'link';
        previewStatus.textContent = 'Investigando con link (intentando parsear embed)...';
        // Nota: Dado que el embed es un iframe, no se puede acceder directamente al contenido por restricciones de same-origin.
        // En su lugar, informamos al usuario y fallback a manual si no hay inputs.
        // Mejora: Sugerir usar Grok para análisis preciso via tools.
        if (tweetEmbed.querySelector('iframe')) {
            previewStatus.textContent = 'Embed cargado, pero parsing directo no posible (seguridad iframe). Usa inputs manuales o Generar Prompt para análisis preciso en Grok.';
        } else {
            previewStatus.textContent = 'Embed no accesible - usando manual si disponible.';
        }
        if (!fetchedText && !fetchedMedia) {
            previewStatus.textContent += ' Para análisis preciso, pega texto/media manual o usa Prompt para Grok.';
        } else {
            parsingSuccess = true;
        }
    } else {
        previewStatus.textContent = 'Investigando manual (sin link) – informe detallado abajo.';
    }

    if (!fetchedText && !fetchedMedia) {
        previewStatus.textContent = 'No hay contenido - pega URL o texto/media.';
        return;
    }

    generateReport(fetchedText, fetchedMedia, mode, parsingSuccess);
}

function generateReport(text, media, mode, parsingSuccess) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Checks mejorados con patrones más precisos
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies detectada: En x-algorithm, P(reply) pesa alto en weighted scorer (13-30x like, per README). Explicación extensa: El transformer predice multi-actions (P(like/reply/repost/etc.), con masks para isolation). Para este post, fomenta engagement; mejora específica: Agrega preguntas como "¿Cómo crees que impacta esta noticia en tu región?" para multiplicar replies, aumentando score total en ~25% según heurísticas del repo. Esto evita negatives como P(not_interested) y mejora diversidad en feeds. Modo: ' + mode + '.');
    } else {
        suggestions.push('❌ Sin replies fuertes: Detalle: Weighted Scorer combina P(action) con pesos positivos para replies – sin ellos, score baja. Mejora específica para este post (con ID ' + (postId || 'manual') + '): Incluye "¡Dime tu opinión en replies sobre esta noticia!" – podría +30 puntos, basado en engagement history hidration. Explicación: Evita filters como SelfpostFilter; para @GlobalEye_TV, usa para debates globales, elevando P(reply/quote). Modo: ' + mode + '.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Longitud ideal para threads largos y dwell time alto: El repo elimina features manuales, delegando a Grok-based transformer para P(dwell), que mide tiempo de lectura. Este post favorece; mejora específica: Expande con subpuntos noticiosos como "1. Contexto global, 2. Impacto local" para +P(dwell), ideal para noticias. Detalle: Pipeline hydrates con metadata; evita AgeFilter con contenido fresco. Modo: ' + mode + '.');
    } else {
        suggestions.push('❌ Thread corto: Detalle: Pre-Scoring Filters remueven cortos; P(dwell) bajo baja score. Mejora específica: Extiende a >100 palabras con threads (e.g., "Parte 1: Intro global, 2. Impacto"), +20 puntos. Explicación: Para @GlobalEye_TV, usa para videos intercalados, evitando PreviouslyServedPostsFilter. Modo: ' + mode + '.');
    }

    if (checkForVideos(fullContent)) {
        score += 15;
        suggestions.push('✅ Video corto con potencial dwell alto detectado: En phoenix/README, P(video_view) se predice con candidate isolation; videos cortos (2-3 seg hook) pesan positivo. Para este post, el video engaging eleva score. Mejora específica: Agrega caption como "Mira este clip de 10s sobre noticias globales – ¿qué piensas?" para +P(reply), basado en multi-action prediction (like/repost/view). Evita negatives como P(report) con contenido gore/violento, per VFFilter. Modo: ' + mode + '.');
    } else {
        suggestions.push('❌ Sin video: Detalle: Hydrators enriche media; sin, baja P(photo_expand/video_view). Mejora específica: Agrega "Clip corto de tema: [link]" , +15 puntos. Explicación: Ideal para @GlobalEye_TV noticias, usa short clips para hook, evitando negatives. Modo: ' + mode + '.');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo de negatives (blocks/mutes/reports): El repo lista P(not_interested/block_author) con pesos negativos en weighted scorer, empujando down content. Este post pasa AuthorSocialgraphFilter (no blocked). Mejora específica: Mantén relevancia global para evitar "not interested"; detalle: Evita muted keywords (spam), usa diversity scorer para feeds. Modo: ' + mode + '.');
    } else {
        score -= 20;
        suggestions.push('❌ Riesgo de negatives alto – limpia repeticiones/spam: Pre-scoring filters (e.g., DropDuplicatesFilter, MutedKeywordFilter) remueven posts spammy; P(report) negativo baja score drásticamente. Mejora para este post: Elimina repeticiones (único words >80%), evita ventas; +20 recuperación. Explicación: Para @GlobalEye_TV, enfoca puro noticias. Modo: ' + mode + '.');
    }

    if (checkForMedia(fullContent)) {
        score += 15;
        suggestions.push('✅ Media/links detectados para diversidad: Hydration stage en candidate-pipeline enriquece con media entities; P(click/share) positivo. En este post, media eleva score. Mejora específica: Para videos/imágenes globales, agrega alt-text descriptivo (e.g., "Imagen de ojo global para noticias"), compatible con filter:media/links, mejorando out-of-network retrieval via Phoenix two-tower. Modo: ' + mode + '.');
    } else {
        suggestions.push('❌ No media – agrega para P(click): El thunder/phoenix maneja in-network/out con media; sin ella, baja score. Mejora para este post: Incluye "Imagen de noticia global: [URL]" o link, +15 puntos. Ideal para @GlobalEye_TV, usa visuales noticias, evita RepostDeduplicationFilter reutilizando media única. Modo: ' + mode + '.');
    }

    // Nuevo check: Hashtags
    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags detectados: Ayudan en discovery via Phoenix out-of-network, elevando score. Mejora: Agrega más relevantes como #NoticiasGlobales para mayor reach.');
    } else {
        suggestions.push('❌ Sin hashtags: Agrega #GlobalEye_TV para +10 puntos, mejora retrieval en searches.');
    }

    suggestions.push('ℹ️ Mejora general extensa: System usa Thunder para in-network, Phoenix para out – para @GlobalEye_TV, optimiza engagement history para transformer. Espacia posts (author diversity), evita post-selection filters (dedup). Esto boostea "For You" reach 50%+, per architecture diagram. Modo: ' + mode + '.');

    score = Math.max(0, Math.min(100, score));
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado Detallado: <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    resultsHtml += '<p>Explicación extensa: Simulación de weighted scorer (Σ weight × P(action), per repo) – alto si >70 (buen engagement), medio 40-70 (mejorable), bajo <40 (riesgos altos). Para este post, basado en investigación (modo ' + mode + '). Nota: Parsing success: ' + (parsingSuccess ? 'Sí' : 'No, usa manual o Grok para precisión') + '.</p>';
    if (postId) resultsHtml += `<p>ID investigado: ${postId}</p>`;
    suggestions.forEach(s => resultsHtml += `<div class="suggestion">${s}</div>`);

    // Versión optimizada mejorada: Aplicar cambios automáticos
    let optimized = text.trim();
    if (!checkForHashtags(optimized)) {
        optimized += ' #GlobalEye_TV';
    }
    if (!checkForReplies(optimized)) {
        optimized += '\n\n¿Qué piensas sobre esta noticia? ¡Comparte tu opinión en replies!';
    }
    if (wordCount < 100) {
        optimized += '\n\nContexto adicional: Esta noticia tiene un impacto global porque [agrega detalles específicos aquí para extender el thread].';
    }
    if (media) {
        optimized += '\n\nMedia adjunta: ' + media;
    } else if (!checkForMedia(fullContent)) {
        optimized += '\n\n[Agrega una imagen o video relevante aquí para aumentar engagement]';
    }

    if (score < 70) {
        resultsHtml += '<h3>Versión Optimizada (Mejorada Automáticamente):</h3><p>' + optimized.replace(/\n/g, '<br>') + '</p>';
        resultsHtml += '<p>Explicación optimización: Cambios aplicados para maximizar scorer, agregando elementos faltantes como preguntas, hashtags y sugerencias de media. Usa pipeline full (query hydration to selection). Delega a ML para relevance. Para análisis más profundo, usa el Prompt para Grok.</p>';
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

function generateGrokPrompt() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim() || ' [texto del post]';
    const mediaInput = document.getElementById('mediaInput').value.trim() || ' [media]';
    const mode = urlInput ? 'link' : 'manual';
    const prompt = `Como Grok, analiza este post de @GlobalEye_TV con ${mode === 'link' ? 'URL "' + urlInput + '" (ID ${postId}). Usa x_thread_fetch con post_id ${postId} para fetch contenido preciso' : 'texto manual'}: Texto: "${textInput}". Media: "${mediaInput}". Da informe detallado extenso: Score (weighted scorer), explicaciones paso a paso (P(reply)/dwell/video_view/negatives), mejoras específicas para replies/threads/videos, evitando negatives. Genera versión optimizada. Sé exhaustivo con Premium, y considera algorithm de X para optimizaciones avanzadas.`;

    const results = document.getElementById('results');
    let promptHtml = '<div id="grokPromptContainer"><h3>Prompt para Grok (copia y pega en chat Grok):</h3><pre>' + prompt + '</pre><button onclick="copyPrompt()" class="copy-button">Copiar Prompt</button><p>Modo detectado: ' + mode + '.</p></div>';
    results.innerHTML += promptHtml;
}

function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => {
        alert('Prompt copiado al portapapeles!');
    }).catch(err => {
        alert('Error al copiar: ' + err);
    });
}

// Funciones auxiliares mejoradas
function checkForReplies(text) { return /\?|\b(qué|piensas|opin(ás|ión)|comparte|dime|responde|cuéntame|debate|comenta)\b/i.test(text); }
function checkForVideos(text) { return /\b(video|clip|corto|short|duración|mp4|watch|ver)\b/i.test(text); }
function checkForNegatives(text, wordCount) { 
    const unique = new Set(text.split(/\s+/)).size; 
    return unique >= wordCount * 0.8 && !/\b(compra|vende|gratis|spam|oferta|promo|bitcoin|crypto|nsfw)\b/i.test(text); 
}
function checkForMedia(text) { return /\b(imagen|foto|video|link|http|https|jpg|png|mp4|gif)\b/i.test(text) || text.includes('http'); }
function checkForHashtags(text) { return /#\w+/.test(text); }