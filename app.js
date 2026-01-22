let postId = null;
let apiKeys = { newsapi: '', sentiment: '' }; // Puedes expandir con más

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
        previewStatus.textContent = 'URL inválida. Ejemplo: https://x.com/user/status/123456789';
        return;
    }

    postId = match[1];
    previewStatus.textContent = `Cargando preview del post ${postId}...`;

    function tryRender() {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
            window.twttr.widgets.createTweet(postId, tweetEmbed, { lang: 'es', dnt: true }).then(() => {
                previewStatus.textContent = 'Preview cargado. Usa Auto-Analizar para informe detallado.';
            }).catch(err => {
                console.error(err);
                previewStatus.textContent = 'Error al cargar embed. Usa modo manual o fallback.';
            });
        } else {
            setTimeout(tryRender, 2000);
        }
    }
    tryRender();

    setTimeout(() => {
        if (!tweetEmbed.querySelector('iframe')) fallback(urlInput);
    }, 12000);
}

function fallback(url) {
    document.getElementById('previewStatus').innerHTML = `Embed no cargó. <a href="${url}" target="_blank" class="fallback-link">Abrir en X</a>`;
}

function saveApiKeys() {
    apiKeys.newsapi = document.getElementById('newsApiKey').value.trim();
    apiKeys.sentiment = document.getElementById('sentimentApiKey').value.trim();
    alert('Claves API guardadas (se usan en análisis si están presentes).');
}

async function enrichWithPublicApis(text) {
    let enrichment = '';

    // Ejemplo: NewsAPI (https://newsapi.org) - requiere key gratuita
    if (apiKeys.newsapi && text.length > 20) {
        try {
            const query = encodeURIComponent(text.slice(0, 100));
            const res = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=3&apiKey=${apiKeys.newsapi}`);
            const data = await res.json();
            if (data.status === 'ok' && data.articles.length > 0) {
                enrichment += '<h4>Noticias relacionadas (NewsAPI):</h4><ul>';
                data.articles.forEach(a => {
                    enrichment += `<li><a href="${a.url}" target="_blank">${a.title}</a> (${a.source.name})</li>`;
                });
                enrichment += '</ul>';
            }
        } catch (e) {
            enrichment += '<p>Error al consultar NewsAPI: ' + e.message + '</p>';
        }
    }

    // Ejemplo: Sentiment Analysis (puedes usar MeaningCloud o similar de publicapis.io)
    // Aquí placeholder - adapta a una API real gratuita como https://www.meaningcloud.com/developer/sentiment-analysis
    if (apiKeys.sentiment && text.length > 20) {
        enrichment += '<p>Análisis de sentimiento pendiente (integra API como MeaningCloud o NLP Cloud).</p>';
    }

    return enrichment || '<p>No enriquecimiento disponible (agrega API Keys para NewsAPI u otras).</p>';
}

async function autoAnalyze() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const textInput = document.getElementById('postInput').value.trim();
    const mediaInput = document.getElementById('mediaInput').value.trim();
    const previewStatus = document.getElementById('previewStatus');

    previewStatus.textContent = 'Analizando... (detectando modo)';

    let mode = urlInput && postId ? 'link' : 'manual';
    let fetchedText = textInput;
    let fetchedMedia = mediaInput;

    if (mode === 'link') {
        previewStatus.textContent = 'Modo link – parsing embed limitado por seguridad iframe. Usa texto manual para precisión.';
    }

    if (!fetchedText && !fetchedMedia) {
        previewStatus.textContent = 'No hay contenido suficiente. Pega URL + texto o usa manual.';
        return;
    }

    const fullContent = fetchedText + (fetchedMedia ? ' ' + fetchedMedia : '');

    // Enriquecimiento con APIs públicas
    const enrichmentHtml = await enrichWithPublicApis(fetchedText);

    generateReport(fetchedText, fetchedMedia, mode, enrichmentHtml);
}

function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Lógica de checks (igual que antes, pero con mejoras)
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies fuerte → +30 (P(reply) alto en weighted scorer). Mejora: Agrega "¿Qué opinas tú?" o "¿En tu país cómo se ve esto?".');
    } else {
        score -= 10;
        suggestions.push('❌ Falta llamada a replies → agrega pregunta abierta para +30.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 80) {
        score += 20;
        suggestions.push('✅ Buen dwell time potencial (>80 palabras). Mejora: Convierte en thread si >150.');
    } else {
        suggestions.push('❌ Contenido corto → extiende a thread para +20.');
    }

    if (checkForVideos(fullContent) || media.toLowerCase().includes('video')) {
        score += 15;
        suggestions.push('✅ Media video detectada → alto P(video_view). Mejora: Caption con pregunta.');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives/spam.');
    } else {
        score -= 15;
        suggestions.push('❌ Posible riesgo negatives → limpia keywords spam.');
    }

    if (checkForMedia(fullContent) || media) {
        score += 15;
        suggestions.push('✅ Media presente → +P(click). Mejora: Optimiza con TinyPNG API si tienes key.');
    }

    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags → mejor discovery.');
    } else {
        suggestions.push('❌ Sin hashtags → agrega #Noticias #GlobalEye_TV.');
    }

    score = Math.max(0, Math.min(100, score + 10)); // Bonus base por usar la tool

    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="${scoreClass}">${score}/${maxScore}</span></h2>`;
    resultsHtml += `<p>Modo: ${mode} | ID: ${postId || 'manual'}</p>`;
    resultsHtml += enrichmentHtml;
    suggestions.forEach(s => resultsHtml += `<div class="suggestion">${s}</div>`);

    // Versión optimizada
    let optimized = text.trim();
    if (!checkForHashtags(optimized)) optimized += ' #GlobalEye_TV #NoticiasGlobales';
    if (!checkForReplies(optimized)) optimized += '\n\n¿Qué opinas? ¡Comparte en replies! 👇';
    if (wordCount < 80) optimized += '\n\nContexto adicional: [amplía con datos o subpuntos para más dwell time]';
    if (media) optimized += `\n\n${media}`;

    resultsHtml += `<h3>Versión Optimizada:</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;

    document.getElementById('results').innerHTML = resultsHtml;
}

function generateGrokPrompt() {
    const url = document.getElementById('postUrl').value.trim();
    const text = document.getElementById('postInput').value.trim() || '[pega texto]';
    const media = document.getElementById('mediaInput').value.trim() || '[media]';
    const mode = url ? 'link' : 'manual';

    const prompt = `Como Grok (Premium), analiza post de @GlobalEye_TV.
Modo: ${mode} | URL: ${url} | ID: ${postId || 'manual'}
Texto: "${text}"
Media: "${media}"

Usa tool x_thread_fetch con post_id: ${postId || 'N/A'} si aplica.
Da informe exhaustivo:
- Score estimado (weighted scorer X)
- Paso a paso: P(reply), P(dwell), P(video_view), negatives
- Mejoras concretas: replies, threads, videos, hashtags, evitar negatives/filters
- Versión optimizada final
Sé detallado y orientado a maximizar reach en "For You".`;

    const container = document.getElementById('grokPromptContainer') || document.createElement('div');
    container.id = 'grokPromptContainer';
    container.innerHTML = `<h3>Prompt para Grok:</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar</button>`;
    document.getElementById('results').appendChild(container);
}

function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Copiado!'));
}

// Helpers
function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n)\b/i.test(t); }
function checkForNegatives(t, wc) { const u = new Set(t.split(/\s+/)).size; return u >= wc * 0.75 && !/\b(compra|venta|gratis|spam|crypto|bitcoin)\b/i.test(t); }
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/i.test(t); }