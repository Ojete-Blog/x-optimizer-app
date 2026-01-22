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
    let hasKeys = apiKeys.newsapi || apiKeys.sentiment || apiKeys.newsdata;

    if (!hasKeys) {
        return '<p>Análisis básico sin APIs (opcionales para enriquecimiento). Para más detalles, usa el Prompt para Grok o agrega keys.</p>';
    }

    // NewsAPI.org
    if (apiKeys.newsapi && text.length > 20) {
        try {
            const query = encodeURIComponent(text.slice(0, 100));
            const res = await fetch(`https://newsapi.org/v2/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=3&apiKey=${apiKeys.newsapi}`);
            if (!res.ok) throw new Error('Respuesta no OK');
            const data = await res.json();
            if (data.status === 'ok' && data.articles.length > 0) {
                enrichment += '<h4>Noticias relacionadas (NewsAPI.org):</h4><ul>';
                data.articles.forEach(a => {
                    enrichment += `<li><a href="${a.url}" target="_blank">${a.title}</a> (${a.source.name})</li>`;
                });
                enrichment += '</ul>';
            }
        } catch (e) {
            enrichment += '<p>Error al consultar NewsAPI.org: ' + e.message + '. Verifica key o conexión.</p>';
        }
    }

    // NewsData.io
    if (apiKeys.newsdata && text.length > 20) {
        try {
            const query = encodeURIComponent(text.slice(0, 100));
            const res = await fetch(`https://newsdata.io/api/1/news?apikey=${apiKeys.newsdata}&q=${query}&language=es`);
            if (!res.ok) throw new Error('Respuesta no OK');
            const data = await res.json();
            if (data.status === 'success' && data.results.length > 0) {
                enrichment += '<h4>Noticias relacionadas (NewsData.io):</h4><ul>';
                data.results.slice(0, 3).forEach(a => {
                    enrichment += `<li><a href="${a.link}" target="_blank">${a.title}</a> (${a.source_id})</li>`;
                });
                enrichment += '</ul>';
            }
        } catch (e) {
            enrichment += '<p>Error al consultar NewsData.io: ' + e.message + '. Verifica key o conexión.</p>';
        }
    }

    // Twinword Sentiment Analysis
    if (apiKeys.sentiment && text.length > 20) {
        try {
            const res = await fetch(`https://api.twinword.com/api/sentiment/analyze/latest/?text=${encodeURIComponent(text)}&token=${apiKeys.sentiment}`);
            if (!res.ok) throw new Error('Respuesta no OK');
            const data = await res.json();
            if (data.type) {
                enrichment += `<h4>Análisis de Sentimiento (Twinword API):</h4><p>Tipo: ${data.type} | Score: ${data.score} | Palabras clave: ${data.keywords.map(k => k.word).join(', ')}</p>`;
            }
        } catch (e) {
            enrichment += '<p>Error al consultar Twinword Sentiment: ' + e.message + '. Verifica key o conexión.</p>';
        }
    }

    return enrichment || '<p>No enriquecimiento disponible (verifica keys o conexión). Análisis básico procediendo.</p>';
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

    if (mode === 'link' && !fetchedText && !fetchedMedia) {
        previewStatus.textContent = 'Modo link detectado, pero sin texto/media manual. Análisis básico con suposiciones (agrega texto para precisión). O usa Prompt para Grok.';
    } else if (!fetchedText && !fetchedMedia && !urlInput) {
        previewStatus.textContent = 'No hay contenido suficiente. Pega URL, texto o media.';
        return;
    }

    const fullContent = fetchedText + (fetchedMedia ? ' ' + fetchedMedia : '') || 'Contenido de post de noticias globales (supuesto para análisis básico)';

    // Enriquecimiento con APIs (opcional)
    const enrichmentHtml = await enrichWithPublicApis(fetchedText || fullContent);

    generateReport(fetchedText || '[Texto no proporcionado - análisis genérico]', fetchedMedia || '[Sin media]', mode, enrichmentHtml);
}

function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Checks mejorados
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies fuerte → +30 (P(reply) alto). Mejora: Agrega preguntas específicas.');
    } else {
        suggestions.push('❌ Sin replies → Agrega "¿Qué opinas?" para +30.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Buen dwell time (>100 palabras) → +20. Mejora: Usa threads.');
    } else {
        suggestions.push('❌ Corto → Extiende para +20.');
    }

    if (checkForVideos(fullContent) || media.toLowerCase().includes('video')) {
        score += 15;
        suggestions.push('✅ Video → +15. Mejora: Hook rápido.');
    } else {
        suggestions.push('❌ Sin video → Agrega para +15.');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives → +20.');
    } else {
        score -= 15;
        suggestions.push('❌ Riesgo negatives → Limpia spam.');
    }

    if (checkForMedia(fullContent) || media) {
        score += 15;
        suggestions.push('✅ Media → +15. Mejora: Optimiza.');
    } else {
        suggestions.push('❌ Sin media → Agrega para +15.');
    }

    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags → +10.');
    } else {
        suggestions.push('❌ Sin hashtags → Agrega #GlobalEye_TV.');
    }

    if (/\b(http|https):\/\/\S+/i.test(fullContent)) {
        score += 10;
        suggestions.push('✅ Enlaces → +10. Mejora: Fuentes confiables.');
    } else {
        suggestions.push('❌ Sin enlaces → Agrega para +10.');
    }

    score = Math.max(0, Math.min(100, score));

    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="${scoreClass}">${score}/${maxScore}</span></h2>`;
    resultsHtml += `<p>Modo: ${mode} | ID: ${postId || 'manual'} | Análisis funciona sin APIs obligatorias.</p>`;
    resultsHtml += enrichmentHtml;

    resultsHtml += '<h3>Sugerencias:</h3><table class="suggestions-table"><thead><tr><th>Estado</th><th>Descripción</th></tr></thead><tbody>';
    suggestions.forEach(s => {
        const [status, desc] = s.split(' → ');
        resultsHtml += `<tr><td>${status}</td><td>${desc}</td></tr>`;
    });
    resultsHtml += '</tbody></table>';

    resultsHtml += '<h3>Visualización:</h3><canvas id="scoreChart" width="300" height="300"></canvas>';

    let optimized = text.trim();
    if (!checkForHashtags(optimized)) optimized += ' #GlobalEye_TV';
    if (!checkForReplies(optimized)) optimized += '\n\n¿Qué opinas? ¡Replies!';
    if (wordCount < 100) optimized += '\n\nAmplía aquí.';
    if (media) optimized += `\n\n${media}`;
    if (!/\b(http|https):\/\/\S+/i.test(optimized)) optimized += '\n\nFuente: [link]';

    resultsHtml += `<h3>Optimizada:</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;

    document.getElementById('results').innerHTML = resultsHtml;

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
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function generateGrokPrompt() {
    const url = document.getElementById('postUrl').value.trim();
    const text = document.getElementById('postInput').value.trim() || '[texto]';
    const media = document.getElementById('mediaInput').value.trim() || '[media]';
    const mode = url ? 'link' : 'manual';

    const prompt = `Analiza post @GlobalEye_TV. Modo: ${mode} | URL: ${url} | ID: ${postId}
Texto: "${text}"
Media: "${media}"
Usa x_thread_fetch si ID. Informe: Score, P(reply/dwell/etc), mejoras, optimizada. Exhaustivo.`;

    const container = document.getElementById('grokPromptContainer');
    container.innerHTML = `<h3>Prompt Grok:</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar</button>`;
    document.getElementById('results').appendChild(container);
}

function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Copiado!')).catch(err => alert('Error: ' + err));
}

// Helpers
function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame|debate)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n|mp4)\b/i.test(t); }
function checkForNegatives(t, wc) { const u = new Set(t.split(/\s+/)).size; return u >= wc * 0.8 && !/\b(compra|venta|gratis|spam|crypto|bitcoin|nsfw)\b/i.test(t); }
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4|gif)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/.test(t); }