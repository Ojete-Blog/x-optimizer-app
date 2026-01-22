let postId = null;
let apiKeys = { 
  newsapi: '', 
  sentiment: '', // For Twinword Sentiment API
  newsdata: '' // Additional for NewsData.io
};

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
    apiKeys.sentiment = document.getElementById('sentimentApiKey').value.trim(); // Twinword key
    apiKeys.newsdata = document.getElementById('newsdataApiKey').value.trim(); // NewsData.io key
    alert('Claves API guardadas. Se usarán en el análisis si están presentes.');
}

async function enrichWithPublicApis(text) {
    let enrichment = '';

    // NewsAPI.org
    if (apiKeys.newsapi && text.length > 20) {
        try {
            const query = encodeURIComponent(text.slice(0, 100));
            const res = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=3&apiKey=${apiKeys.newsapi}`);
            const data = await res.json();
            if (data.status === 'ok' && data.articles.length > 0) {
                enrichment += '<h4>Noticias relacionadas (NewsAPI.org):</h4><ul>';
                data.articles.forEach(a => {
                    enrichment += `<li><a href="${a.url}" target="_blank">${a.title}</a> (${a.source.name})</li>`;
                });
                enrichment += '</ul>';
            }
        } catch (e) {
            enrichment += '<p>Error al consultar NewsAPI.org: ' + e.message + '</p>';
        }
    }

    // NewsData.io as alternative/better coverage (free tier up to 200 req/day)
    if (apiKeys.newsdata && text.length > 20) {
        try {
            const query = encodeURIComponent(text.slice(0, 100));
            const res = await fetch(`https://newsdata.io/api/1/news?apikey=${apiKeys.newsdata}&q=${query}&language=es`);
            const data = await res.json();
            if (data.status === 'success' && data.results.length > 0) {
                enrichment += '<h4>Noticias relacionadas (NewsData.io - Mejor cobertura 2026):</h4><ul>';
                data.results.slice(0, 3).forEach(a => {
                    enrichment += `<li><a href="${a.link}" target="_blank">${a.title}</a> (${a.source_id})</li>`;
                });
                enrichment += '</ul>';
            }
        } catch (e) {
            enrichment += '<p>Error al consultar NewsData.io: ' + e.message + '</p>';
        }
    }

    // Twinword Sentiment Analysis (free up to 9,000 words/month, best free in 2026 per searches)
    if (apiKeys.sentiment && text.length > 20) {
        try {
            const res = await fetch(`https://api.twinword.com/api/sentiment/analyze/latest/?text=${encodeURIComponent(text)}&token=${apiKeys.sentiment}`);
            const data = await res.json();
            if (data.type) {
                enrichment += `<h4>Análisis de Sentimiento (Twinword API):</h4><p>Tipo: ${data.type} | Score: ${data.score} | Palabras clave: ${data.keywords.map(k => k.word).join(', ')}</p>`;
            }
        } catch (e) {
            enrichment += '<p>Error al consultar Twinword Sentiment: ' + e.message + '</p>';
        }
    }

    return enrichment || '<p>No enriquecimiento disponible. Agrega API Keys para NewsAPI.org, NewsData.io o Twinword.</p>';
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

    // Enriquecimiento con APIs actualizadas
    const enrichmentHtml = await enrichWithPublicApis(fetchedText);

    generateReport(fetchedText, fetchedMedia, mode, enrichmentHtml);
}

function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Checks mejorados y expandidos
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies fuerte → +30 (P(reply) alto en weighted scorer). Mejora: Agrega "¿Qué opinas tú?" o "¿En tu país cómo se ve esto?".');
    } else {
        score -= 10;
        suggestions.push('❌ Falta llamada a replies → agrega pregunta abierta para +30.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) { // Actualizado a >100 para threads más largos
        score += 20;
        suggestions.push('✅ Buen dwell time potencial (>100 palabras). Mejora: Convierte en thread si >200 para máximo engagement.');
    } else {
        suggestions.push('❌ Contenido corto → extiende a thread para +20.');
    }

    if (checkForVideos(fullContent) || media.toLowerCase().includes('video')) {
        score += 15;
        suggestions.push('✅ Media video detectada → alto P(video_view). Mejora: Caption con pregunta y hook en primeros 3s.');
    } else {
        suggestions.push('❌ Sin video → agrega clip corto para +15. Ideal para noticias globales.');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives/spam. Mejora: Mantén tono neutral-informativo para @GlobalEye_TV.');
    } else {
        score -= 15;
        suggestions.push('❌ Posible riesgo negatives → limpia keywords spam o repetitivos.');
    }

    if (checkForMedia(fullContent) || media) {
        score += 15;
        suggestions.push('✅ Media presente → +P(click). Mejora: Optimiza imágenes/videos para carga rápida.');
    } else {
        suggestions.push('❌ Sin media → agrega imagen/video relevante para +15.');
    }

    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags → mejor discovery en Phoenix out-of-network.');
    } else {
        suggestions.push('❌ Sin hashtags → agrega #GlobalEye_TV #NoticiasGlobales para +10.');
    }

    // Nuevo check: Enlaces externos (para P(click))
    if (/\b(http|https):\/\/\S+/i.test(fullContent)) {
        score += 10;
        suggestions.push('✅ Enlaces detectados → aumenta P(click/share). Mejora: Usa links a fuentes confiables.');
    } else {
        suggestions.push('❌ Sin enlaces → agrega fuente externa para +10.');
    }

    score = Math.max(0, Math.min(100, score));

    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="${scoreClass}">${score}/${maxScore}</span></h2>`;
    resultsHtml += `<p>Modo: ${mode} | ID: ${postId || 'manual'} | Actualizado para algoritmos X 2026.</p>`;
    resultsHtml += enrichmentHtml;

    // Tabla de sugerencias para mejor visualización
    resultsHtml += '<h3>Sugerencias Detalladas:</h3><table class="suggestions-table"><thead><tr><th>Estado</th><th>Descripción</th></tr></thead><tbody>';
    suggestions.forEach(s => {
        const [status, desc] = s.split(' → ');
        resultsHtml += `<tr><td>${status}</td><td>${desc || s}</td></tr>`;
    });
    resultsHtml += '</tbody></table>';

    // Gráfico simple de score (usando Chart.js)
    resultsHtml += '<h3>Visualización de Score:</h3><canvas id="scoreChart" width="300" height="300"></canvas>';

    // Versión optimizada expandida
    let optimized = text.trim();
    if (!checkForHashtags(optimized)) optimized += ' #GlobalEye_TV #NoticiasGlobales';
    if (!checkForReplies(optimized)) optimized += '\n\n¿Qué opinas? ¡Comparte en replies! 👇';
    if (wordCount < 100) optimized += '\n\nContexto adicional: [Amplía con datos o subpuntos para más dwell time]. Usa threads: 1/3, 2/3, etc.';
    if (media) optimized += `\n\n${media}`;
    if (!/\b(http|https):\/\/\S+/i.test(optimized)) optimized += '\n\nFuente: [agrega link relevante]';

    resultsHtml += `<h3>Versión Optimizada (2026):</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;

    document.getElementById('results').innerHTML = resultsHtml;

    // Renderizar gráfico
    const ctx = document.getElementById('scoreChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Score', 'Restante'],
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [score >= 70 ? '#00ff9d' : score >= 40 ? '#ffcc00' : '#ff4444', '#333']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
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

Usa tool x_thread_fetch con post_id: ${postId || 'N/A'} para contenido preciso.
Incluye análisis de sentimiento, predicción de engagement basado en algoritmos X 2026.
Da informe exhaustivo:
- Score estimado (weighted scorer X, con P(reply), P(dwell), P(video_view), negatives)
- Mejoras concretas: replies, threads, videos, hashtags, enlaces, evitando filters/negatives
- Integración con APIs: Sugiere noticias relacionadas (usa web_search si necesitas)
- Versión optimizada final
Sé detallado, usa tablas para sugerencias, y maximiza reach en "For You".`;

    const container = document.getElementById('grokPromptContainer') || document.createElement('div');
    container.id = 'grokPromptContainer';
    container.innerHTML = `<h3>Prompt para Grok (Actualizado 2026):</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar</button>`;
    document.getElementById('results').appendChild(container);
}

function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Copiado!'));
}

// Helpers expandidos
function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame|debate)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n|mp4)\b/i.test(t); }
function checkForNegatives(t, wc) { 
    const u = new Set(t.split(/\s+/)).size; 
    return u >= wc * 0.8 && !/\b(compra|venta|gratis|spam|crypto|bitcoin|nsfw)\b/i.test(t); 
}
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4|gif)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/.test(t); }