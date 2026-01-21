function loadPreview() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const previewStatus = document.getElementById('previewStatus');
    const tweetEmbed = document.getElementById('tweetEmbed');

    if (!urlInput) {
        previewStatus.textContent = 'Pega la URL para ver el preview del post (embed oficial X).';
        tweetEmbed.innerHTML = '';
        return;
    }

    const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
    if (!match) {
        previewStatus.textContent = 'URL inválida. Ej: https://x.com/GlobalEye_TV/status/1234567890123456789';
        tweetEmbed.innerHTML = '';
        return;
    }

    const postId = match[1];
    previewStatus.textContent = `Cargando preview del post ${postId}... (espera 5-10s, bug común en embeds X)`;

    // Embed más robusto (usa x.com y link directo)
    tweetEmbed.innerHTML = `
        <blockquote class="twitter-tweet" data-lang="es" data-dnt="true">
            <a href="https://x.com/i/status/${postId}"></a>
        </blockquote>
    `;

    // Forzar render del widget (clave para dinámico)
    setTimeout(() => {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.load) {
            window.twttr.widgets.load(tweetEmbed);
            previewStatus.textContent = 'Preview cargado (si no ves nada, refresca página o prueba en incógnito).';
        } else {
            previewStatus.textContent = 'Widgets.js no cargó aún. Refresca la página o espera.';
        }
    }, 3000); // Delay 3s para dar tiempo al script

    // Fallback si no carga en 10s
    setTimeout(() => {
        if (tweetEmbed.innerHTML.includes('blockquote') && !tweetEmbed.querySelector('iframe')) {
            previewStatus.innerHTML = `No cargó el embed (bug X). <a href="${urlInput}" target="_blank">Ver post directamente aquí</a>`;
        }
    }, 10000);
}

function optimizePost() {
    // (Mismo código de optimización que en v3.1 – no cambió mucho, solo fullContent incluye media)
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim();
    const mediaInput = document.getElementById('mediaInput').value.trim();
    
    if (!textInput) {
        alert('Pega el texto del post para el análisis (el preview ya muestra lo visual).');
        return;
    }

    let postId = null;
    if (urlInput) {
        const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
        if (match) postId = match[1];
    }

    const fullContent = textInput + (mediaInput ? ' ' + mediaInput : '');

    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    if (checkForReplies(fullContent)) { score += 30; suggestions.push('✅ Replies: Bueno para engagement.'); } else { suggestions.push('❌ Agrega preguntas.'); }
    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) { score += 20; suggestions.push('✅ Dwell alto.'); } else { suggestions.push('❌ Extiende el thread.'); }
    if (checkForVideos(fullContent)) { score += 15; suggestions.push('✅ Video detectado.'); } else { suggestions.push('❌ Agrega video corto.'); }
    if (checkForNegatives(fullContent, wordCount)) { score += 20; suggestions.push('✅ Bajo riesgo negatives.'); } else { score -= 20; suggestions.push('❌ Evita spam.'); }
    if (checkForMedia(fullContent)) { score += 15; suggestions.push('✅ Media/links plus.'); } else { suggestions.push('❌ Agrega imágenes/links.'); }
    suggestions.push('ℹ️ Espacia posts para diversity.');

    score = Math.max(0, Math.min(100, score));
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score: <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    if (postId) resultsHtml += `<p>Post ID: ${postId}</p>`;
    suggestions.forEach(s => resultsHtml += `<div class="suggestion">${s}</div>`);

    if (score < 70) {
        let optimized = textInput;
        if (!checkForReplies(fullContent)) optimized += '\n\n¿Qué opinas? ¡Responde!';
        if (wordCount < 100) optimized += '\n(Extiende para más dwell)';
        if (!checkForVideos(fullContent)) optimized += '\nVideo corto: [agrega]';
        if (!checkForMedia(fullContent)) optimized += '\nImagen/link: [agrega]';
        if (mediaInput) optimized += `\nMedia: ${mediaInput}`;
        optimized += '\n#GlobalEye_TV';
        resultsHtml += `<h3>Versión Optimizada:</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

// Funciones auxiliares (sin cambios)
function checkForReplies(text) { return /\?|\b(qué piensas|qué opinas|comparte|dime|opinión|responde)\b/i.test(text); }
function checkForVideos(text) { return /\b(video|vídeo|clip|corto|short)\b/i.test(text); }
function checkForNegatives(text, wordCount) { 
    const unique = new Set(text.split(/\s+/)).size;
    const repetitive = unique < wordCount * 0.8;
    return !repetitive && !/\b(compra|vende|gratis|oferta)\b/i.test(text);
}
function checkForMedia(text) { return /\b(link|imagen|foto|video|http)\b/i.test(text) || text.includes('http'); }