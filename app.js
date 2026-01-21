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
        previewStatus.textContent = 'URL inválida.';
        return;
    }

    postId = match[1];
    previewStatus.textContent = `Cargando preview/investigación del post ${postId}...`;

    function tryRender() {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
            window.twttr.widgets.createTweet(postId, tweetEmbed, { lang: 'es', dnt: true }).then(() => {
                previewStatus.textContent = 'Preview cargado – click Auto-Analizar para investigar/optimizar.';
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

async function autoAnalyze() {
    if (!postId) return alert('Pega URL primero para extraer ID.');
    const previewStatus = document.getElementById('previewStatus');
    previewStatus.textContent = 'Investigando post auto (fetch texto/media)...';

    // Hack: Observar embed para extraer texto visible (no perfecto, pero investiga)
    const embedIframe = document.querySelector('#tweetEmbed iframe');
    let fetchedText = '';
    let fetchedMedia = '';
    if (embedIframe) {
        const observer = new MutationObserver(() => {
            const textElem = embedIframe.contentDocument.querySelector('p'); // Parse texto aproximado
            fetchedText = textElem ? textElem.textContent.trim() : '';
            const mediaElem = embedIframe.contentDocument.querySelector('img, video');
            fetchedMedia = mediaElem ? (mediaElem.tagName === 'VIDEO' ? 'Video detectado' : 'Imagen detectada') : '';
            if (fetchedText) document.getElementById('postInput').value = fetchedText;
            if (fetchedMedia) document.getElementById('mediaInput').value = fetchedMedia;
            optimizePost(); // Auto-optimiza
            previewStatus.textContent = 'Investigación completa – mira resultados.';
        });
        observer.observe(embedIframe.contentDocument, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 5000); // Stop after 5s
    } else {
        previewStatus.textContent = 'No se pudo fetch auto (CORS block) – pega manual y optimiza.';
    }
}

function optimizePost() {
    const textInput = document.getElementById('postInput').value.trim();
    const mediaInput = document.getElementById('mediaInput').value.trim();
    if (!textInput) return alert('No hay texto para optimizar (fetch falló o pega manual).');

    const fullContent = textInput + (mediaInput ? ' ' + mediaInput : '');

    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    if (checkForReplies(fullContent)) { score += 30; suggestions.push('✅ Replies buenos (peso alto). Mejora: Más preguntas para noticias globales.'); } else { suggestions.push('❌ Agrega "¿Qué opinas de esta vista global?" para replies.'); }
    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) { score += 20; suggestions.push('✅ Dwell alto con thread largo.'); } else { suggestions.push('❌ Extiende para >100 palabras, ideal para @GlobalEye_TV.'); }
    if (checkForVideos(fullContent)) { score += 15; suggestions.push('✅ Video detectado – optimiza hook para dwell.'); } else { suggestions.push('❌ Agrega video corto de noticias para P(video_view).'); }
    if (checkForNegatives(fullContent, wordCount)) { score += 20; suggestions.push('✅ Bajo negatives.'); } else { score -= 20; suggestions.push('❌ Evita spam – limpia repeticiones.'); }
    if (checkForMedia(fullContent)) { score += 15; suggestions.push('✅ Media/links plus (detectado en fetch).'); } else { suggestions.push('❌ Agrega imágenes globales para diversidad.'); }
    suggestions.push('ℹ️ Mejora general: Espacia posts en @GlobalEye_TV para evitar penalty. Usa threads para engagement.');

    score = Math.max(0, Math.min(100, score));
    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="score ${scoreClass}">${score}/${maxScore}</span></h2>`;
    if (postId) resultsHtml += `<p>Post ID: ${postId} (investigado).</p>`;
    suggestions.forEach(s => resultsHtml += `<div class="suggestion">${s}</div>`);

    if (score < 70) {
        let optimized = textInput;
        if (!checkForReplies(fullContent)) optimized += '\n\n¿Qué opinas de esta noticia? ¡Comparte!';
        if (wordCount < 100) optimized += '\n(Extiende con detalles globales para dwell alto)';
        if (!checkForVideos(fullContent)) optimized += '\nVideo corto relacionado: [link]';
        if (!checkForMedia(fullContent)) optimized += '\nImagen extra: [URL]';
        optimized += '\n#GlobalEye_TV #OjoGlobal';
        resultsHtml += `<h3>Versión Optimizada (Mejorada):</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;
    }

    document.getElementById('results').innerHTML = resultsHtml;
}

// Funciones auxiliares (mejoradas con regex)
function checkForReplies(text) { return /\?|\b(qué piensas|opin(ás|ión)|comparte|dime|responde)\b/i.test(text); }
function checkForVideos(text) { return /\b(video|clip|corto|short|duración)\b/i.test(text); }
function checkForNegatives(text, wordCount) { const unique = new Set(text.split(/\s+/)).size; return unique >= wordCount * 0.8 && !/\b(compra|vende|gratis|spam)\b/i.test(text); }
function checkForMedia(text) { return /\b(imagen|foto|video|link|http|jpg|png|mp4)\b/i.test(text) || text.includes('http'); }