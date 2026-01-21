function loadPreview() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const previewStatus = document.getElementById('previewStatus');
    const tweetEmbed = document.getElementById('tweetEmbed');

    if (!urlInput) {
        previewStatus.textContent = 'Pega la URL arriba para ver el preview del post (embed real de X).';
        tweetEmbed.innerHTML = '';
        return;
    }

    // Regex preciso para post_id (soporta x.com y twitter.com)
    const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
    if (!match) {
        previewStatus.textContent = 'URL inválida. Usa formato https://x.com/user/status/123456...';
        tweetEmbed.innerHTML = '';
        return;
    }

    const postId = match[1];
    previewStatus.textContent = `Cargando preview del post ID: ${postId}... (puede tardar unos segundos)`;

    // Generar embed oficial de X
    tweetEmbed.innerHTML = `
        <blockquote class="twitter-tweet">
            <a href="https://x.com/i/status/${postId}"></a>
        </blockquote>
    `;

    // Forzar recarga de widgets si ya está cargado
    if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load();
    }
}

function optimizePost() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim();
    const mediaInput = document.getElementById('mediaInput').value.trim();
    
    if (!textInput) {
        alert('Pega el texto del post para análisis (el preview ya lo muestra visualmente).');
        return;
    }

    let postId = null;
    if (urlInput) {
        const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
        if (match) {
            postId = match[1];
        }
    }

    const fullContent = textInput + (mediaInput ? ' ' + mediaInput : '');

    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Checks precisos (igual que v3.0, pero con fullContent incluyendo media desc)
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Replies: Triggers detectados (peso alto en scorer).');
    } else {
        suggestions.push('❌ Agrega preguntas para P(reply) alto.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Dwell: Contenido largo ideal.');
    } else {
        suggestions.push('❌ Extiende para mayor dwell time.');
    }

    if (checkForVideos(fullContent)) {
        score += 15;
        suggestions.push('✅ Video: Bueno si corto y engaging.');
    } else {
        suggestions.push('❌ Agrega video corto para P(video_view).');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives.');
    } else {
        score -= 20;
        suggestions.push('❌ Evita spam/repetitivo.');
    }

    if (checkForMedia(fullContent)) {
        score += 15;
        suggestions.push('✅ Media/links: Plus engagement.');
    } else {
        suggestions.push('❌ Agrega media para diversidad.');
    }

    suggestions.push('ℹ️ Tip @GlobalEye_TV: Espacia posts para author diversity.');

    score = Math.max(0, Math.min(100, score));
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    if (postId) resultsHtml += `<p>Post ID: ${postId}</p>`;
    suggestions.forEach(s => resultsHtml += `<div class="suggestion">${s}</div>`);

    let optimizedPost = optimizeText(textInput, mediaInput, { hasReplies: checkForReplies(fullContent), hasVideos: checkForVideos(fullContent), hasMedia: checkForMedia(fullContent), wordCount });
    if (score < 70) {
        resultsHtml += `<h3>Versión Optimizada:</h3><p>${optimizedPost.replace(/\n/g, '<br>')}</p>`;
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

// Funciones auxiliares (mismas que antes, regex precisos)
function checkForReplies(text) {
    return /\?|\b(qué piensas|qué opinas|comparte tu|dime|cuéntame|opinión|discute|reply|responde)\b/i.test(text);
}

function checkForVideos(text) {
    return /\b(video|vídeo|clip|watch|ver|reel|corto|short|segundos|seg|duración)\b/i.test(text);
}

function checkForNegatives(text, wordCount) {
    const unique = new Set(text.split(/\s+/)).size;
    const repetitive = unique < wordCount * 0.8;
    const spammy = /\b(compra|vende|gratis|oferta|descuento|urgente|paywall|suscripción)\b/i.test(text);
    return !repetitive && !spammy;
}

function checkForMedia(text) {
    return /\b(link|enlace|imagen|foto|video|media|url|http|https|jpg|png|gif|mp4)\b/i.test(text) || text.includes('http');
}

function optimizeText(text, media, { hasReplies, hasVideos, hasMedia, wordCount }) {
    let optimized = text;
    if (!hasReplies) optimized += '\n\n¿Qué opinas? ¡Responde abajo!';
    if (wordCount < 100) optimized += '\n(Extiende para thread engaging)';
    if (!hasVideos) optimized += '\nVideo corto: [agrega]';
    if (!hasMedia) optimized += '\nImagen/link: [agrega]';
    if (media) optimized += `\n\nMedia: ${media}`;
    optimized += '\n#GlobalEye_TV #NoticiasGlobales';
    return optimized;
}