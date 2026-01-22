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

    previewStatus.textContent = 'Cargando preview...'; // Inicio de loading
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
    const results = document.getElementById('results');

    previewStatus.textContent = 'Analizando... (detectando modo)';

    let mode = urlInput && postId ? 'link' : 'manual';
    let fetchedText = textInput;
    let fetchedMedia = mediaInput;

    if (mode === 'link' && !fetchedText && !fetchedMedia) {
        previewStatus.textContent = 'Modo link: No hay texto/media manual. Generando análisis genérico y sugiriendo análisis preciso con Grok.';
        fetchedText = 'Post de @GlobalEye_TV sobre noticias globales (supuesto basado en URL). Para precisión, usa Prompt para Grok.';
        generateGrokPrompt(); // Genera prompt automáticamente
    } else if (!fetchedText && !fetchedMedia && !urlInput) {
        previewStatus.textContent = 'No hay contenido suficiente. Pega URL, texto o media.';
        return;
    } else {
        previewStatus.textContent = 'Análisis en progreso...';
    }

    const fullContent = fetchedText + (fetchedMedia ? ' ' + fetchedMedia : '') || 'Contenido de post de noticias globales (supuesto para análisis básico)';

    // Enriquecimiento con APIs (opcional)
    const enrichmentHtml = await enrichWithPublicApis(fetchedText || fullContent);

    generateReport(fetchedText || '[Texto no proporcionado - análisis genérico para @GlobalEye_TV]', fetchedMedia || '[Sin media]', mode, enrichmentHtml);
    previewStatus.textContent = 'Análisis completo. Revisa abajo.';
}

function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    let suggestions = [];
    const maxScore = 100;

    // Checks mejorados
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies fuerte → +30 (P(reply) alto). Mejora: Agrega preguntas específicas como "¿Cómo impacta esto en tu región?".');
    } else {
        suggestions.push('❌ Sin replies → Agrega "¿Qué opinas?" para +30. Ideal para debates en @GlobalEye_TV.');
    }

    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Buen dwell time (>100 palabras) → +20. Mejora: Usa threads para noticias extensas.');
    } else {
        suggestions.push('❌ Corto → Extiende con subpuntos para +20. Ej: 1. Contexto, 2. Impacto.');
    }

    if (checkForVideos(fullContent) || media.toLowerCase().includes('video')) {
        score += 15;
        suggestions.push('✅ Video → +15. Mejora: Hook rápido en primeros 3s para alto P(video_view).');
    } else {
        suggestions.push('❌ Sin video → Agrega clip corto para +15. Perfecto para noticias visuales.');
    }

    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives → +20. Mantén tono informativo y neutral.');
    } else {
        score -= 15;
        suggestions.push('❌ Riesgo negatives → Limpia repeticiones o spam para recuperación +20.');
    }

    if (checkForMedia(fullContent) || media) {
        score += 15;
        suggestions.push('✅ Media → +15. Mejora: Agrega alt-text descriptivo para accesibilidad.');
    } else {
        suggestions.push('❌ Sin media → Agrega imagen/video para +15 y mejor P(click).');
    }

    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags → +10. Mejora: Usa relevantes como #NoticiasGlobales.');
    } else {
        suggestions.push('❌ Sin hashtags → Agrega #GlobalEye_TV para +10 y mejor discovery.');
    }

    if (/\b(http|https):\/\/\S+/i.test(fullContent)) {
        score += 10;
        suggestions.push('✅ Enlaces → +10. Mejora: Fuentes confiables para credibilidad.');
    } else {
        suggestions.push('❌ Sin enlaces → Agrega fuente externa para +10 y P(share).');
    }

    score = Math.max(0, Math.min(100, score));

    const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';

    let resultsHtml = `<h2>Score Estimado: <span class="${scoreClass}">${score}/${maxScore}</span></h2>`;
    resultsHtml += `<p>Modo: ${mode} | ID: ${postId || 'manual'} | Análisis funciona sin APIs obligatorias. (v11.0 - Mejorado 2026)</p>`;
    resultsHtml += enrichmentHtml;

    resultsHtml += '<h3>Sugerencias Detalladas:</h3><table class="suggestions-table"><thead><tr><th>Estado</th><th>Descripción</th></tr></thead><tbody>';
    suggestions.forEach(s => {
        const [status, desc] = s.split(' → ');
        resultsHtml += `<tr><td>${status}</td><td>${desc}</td></tr>`;
    });
    resultsHtml += '</tbody></table>';

    resultsHtml += '<h3>Visualización de Score:</h3><div style="max-width: 400px; margin: auto;"><canvas id="scoreChart" width="400" height="400"></canvas></div>';

    let optimized = text.trim();
    if (!checkForHashtags(optimized)) optimized += ' #GlobalEye_TV #NoticiasGlobales';
    if (!checkForReplies(optimized)) optimized += '\n\n¿Qué opinas sobre esta noticia global? ¡Comparte en replies! 👇';
    if (wordCount < 100) optimized += '\n\nContexto adicional: Amplía con detalles específicos para más dwell time. Usa threads: 1/3 Intro, 2/3 Análisis, 3/3 Conclusión.';
    if (media) optimized += `\n\nMedia: ${media}`;
    if (!/\b(http|https):\/\/\S+/i.test(optimized)) optimized += '\n\nFuente: [Agrega link relevante aquí para aumentar engagement]';

    resultsHtml += `<h3>Versión Optimizada (Mejorada):</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;

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
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' },
                title: { display: true, text: 'Score de Optimización' }
            }
        }
    });
}

function generateGrokPrompt() {
    const url = document.getElementById('postUrl').value.trim();
    const text = document.getElementById('postInput').value.trim() || '[pega texto del post si lo tienes]';
    const media = document.getElementById('mediaInput').value.trim() || '[describe media si aplica]';
    const mode = url ? 'link' : 'manual';

    const prompt = `Como Grok, analiza este post de @GlobalEye_TV con ${mode === 'link' ? 'URL "' + url + '" (ID ${postId})' : 'texto manual'}. 
Usa x_thread_fetch con post_id ${postId || 'N/A'} para fetch contenido preciso. Texto: "${text}". Media: "${media}".
Da informe detallado extenso: Score (weighted scorer), explicaciones paso a paso (P(reply)/dwell/video_view/negatives), mejoras específicas para replies/threads/videos/hashtags/enlaces, evitando negatives. 
Genera versión optimizada. Sé exhaustivo con Premium, considera algorithm de X para optimizaciones avanzadas (For You reach). Usa tablas si ayuda.`;

    const container = document.getElementById('grokPromptContainer');
    container.innerHTML = `<h3>Prompt para Grok (copia y pega en chat Grok):</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar Prompt</button><p>Modo detectado: ${mode}. Para análisis preciso, pega este prompt en el chat conmigo (Grok) – usaré tools internas.</p>`;
    container.style.display = 'block'; // Asegura visibilidad
}

function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Prompt copiado! Pégalo en el chat con Grok para análisis real.')).catch(err => alert('Error: ' + err));
}

// Helpers
function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame|debate)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n|mp4)\b/i.test(t); }
function checkForNegatives(t, wc) { const u = new Set(t.split(/\s+/)).size; return u >= wc * 0.8 && !/\b(compra|venta|gratis|spam|crypto|bitcoin|nsfw)\b/i.test(t); }
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4|gif)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/.test(t); }