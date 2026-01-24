// app.js — X Optimizer App con sistema de anuncios y suscripción sin API keys

let postId = null;
let apiKeys = {
  newsapi: '',
  sentiment: '', // Twinword Sentiment API
  newsdata: ''   // NewsData.io
};

/*
 * Función: loadPreview()
 * Descripción: procesa la URL pegada en el input, obtiene el ID del post y trata de renderizar el embed oficial
 * de X. Si falla, muestra un enlace fallback para abrir el post.
 */
function loadPreview() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const previewStatus = document.getElementById('previewStatus');
    const tweetEmbed = document.getElementById('tweetEmbed');

    previewStatus.textContent = 'Cargando preview...';
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

    // Si el iframe de embed no aparece después de 12 segundos, cae al modo fallback
    setTimeout(() => {
        if (!tweetEmbed.querySelector('iframe')) fallback(urlInput);
    }, 12000);
}

/* Fallback: muestra enlace si el embed no carga */
function fallback(url) {
    document.getElementById('previewStatus').innerHTML = `Embed no cargó. <a href="${url}" target="_blank" class="fallback-link">Abrir en X</a>`;
}

/* Guarda las claves API opcionales para enriquecimiento */
function saveApiKeys() {
    apiKeys.newsapi   = document.getElementById('newsApiKey').value.trim();
    apiKeys.sentiment = document.getElementById('sentimentApiKey').value.trim();
    apiKeys.newsdata  = document.getElementById('newsdataApiKey').value.trim();
    alert('Claves API guardadas. Se usarán en el análisis si están presentes.');
}

/* Enriquecimiento opcional con APIs públicas. No es obligatorio para el análisis básico. */
async function enrichWithPublicApis(text) {
    let enrichment = '';
    const hasKeys = apiKeys.newsapi || apiKeys.sentiment || apiKeys.newsdata;
    if (!hasKeys) {
        return '<p>Análisis básico sin APIs (opcionalmente puedes añadir claves para más detalles). Para más precisión, usa el Prompt para Grok.</p>';
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

    return enrichment || '<p>No se pudo obtener enriquecimiento (verifica claves o conexión). Análisis básico procediendo.</p>';
}

/* Auto analiza el post e imprime resultados con sugerencias */
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
        // Si solo hay URL y no hay texto o media manual, genera un análisis genérico y sugiere usar Grok
        previewStatus.textContent = 'Modo link: No hay texto/media manual. Generando análisis genérico y sugiriendo análisis preciso con Grok.';
        fetchedText = 'Post de @GlobalEye_TV sobre noticias globales (supuesto basado en URL). Para precisión, usa Prompt para Grok.';
        generateGrokPrompt();
    } else if (!fetchedText && !fetchedMedia && !urlInput) {
        previewStatus.textContent = 'No hay contenido suficiente. Pega URL, texto o media.';
        return;
    } else {
        previewStatus.textContent = 'Análisis en progreso...';
    }

    // Combina texto y media para el análisis básico
    const fullContent = fetchedText + (fetchedMedia ? ' ' + fetchedMedia : '') || 'Contenido de post de noticias globales (supuesto para análisis básico)';

    // Enriquecimiento opcional
    const enrichmentHtml = await enrichWithPublicApis(fetchedText || fullContent);

    // Genera el informe y muestra resultados
    generateReport(fetchedText || '[Texto no proporcionado - análisis genérico para @GlobalEye_TV]', fetchedMedia || '[Sin media]', mode, enrichmentHtml);
    previewStatus.textContent = 'Análisis completo. Revisa abajo.';
}

/* Genera el informe final con puntuación, sugerencias y versión optimizada */
function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    const suggestions = [];
    const maxScore = 100;

    // Chequeos: replies
    if (checkForReplies(fullContent)) {
        score += 30;
        suggestions.push('✅ Invitación a replies fuerte → +30 (P(reply) alto). Mejora: Agrega preguntas específicas como "¿Cómo impacta esto en tu región?".');
    } else {
        suggestions.push('❌ Sin replies → Agrega "¿Qué opinas?" para +30. Ideal para debates en @GlobalEye_TV.');
    }
    // Dwell time
    const wordCount = fullContent.split(/\s+/).length;
    if (wordCount > 100) {
        score += 20;
        suggestions.push('✅ Buen dwell time (>100 palabras) → +20. Mejora: Usa threads para noticias extensas.');
    } else {
        suggestions.push('❌ Corto → Extiende con subpuntos para +20. Ej: 1. Contexto, 2. Impacto.');
    }
    // Vídeos
    if (checkForVideos(fullContent) || media.toLowerCase().includes('video')) {
        score += 15;
        suggestions.push('✅ Video → +15. Mejora: Hook rápido en los primeros 3 segundos para alto P(video_view).');
    } else {
        suggestions.push('❌ Sin video → Agrega clip corto para +15. Perfecto para noticias visuales.');
    }
    // Negativos
    if (checkForNegatives(fullContent, wordCount)) {
        score += 20;
        suggestions.push('✅ Bajo riesgo negatives → +20. Mantén tono informativo y neutral.');
    } else {
        score -= 15;
        suggestions.push('❌ Riesgo negatives → Limpia repeticiones o spam para recuperación +20.');
    }
    // Media
    if (checkForMedia(fullContent) || media) {
        score += 15;
        suggestions.push('✅ Media → +15. Mejora: Agrega alt-text descriptivo para accesibilidad.');
    } else {
        suggestions.push('❌ Sin media → Agrega imagen/video para +15 y mejor P(click).');
    }
    // Hashtags
    if (checkForHashtags(fullContent)) {
        score += 10;
        suggestions.push('✅ Hashtags → +10. Mejora: Usa relevantes como #NoticiasGlobales.');
    } else {
        suggestions.push('❌ Sin hashtags → Agrega #GlobalEye_TV para +10 y mejor discovery.');
    }
    // Enlaces
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
    // Gráfico de donut
    resultsHtml += '<h3>Visualización de Score:</h3><div style="max-width: 400px; margin: auto;"><canvas id="scoreChart" width="400" height="400"></canvas></div>';

    // Versión optimizada
    let optimized = text.trim();
    if (!checkForHashtags(optimized)) optimized += ' #GlobalEye_TV #NoticiasGlobales';
    if (!checkForReplies(optimized)) optimized += '\n\n¿Qué opinas sobre esta noticia global? ¡Comparte en replies! 👇';
    if (wordCount < 100) optimized += '\n\nContexto adicional: Amplía con detalles específicos para más dwell time. Usa threads: 1/3 Intro, 2/3 Análisis, 3/3 Conclusión.';
    if (media) optimized += `\n\nMedia: ${media}`;
    if (!/\b(http|https):\/\/\S+/i.test(optimized)) optimized += '\n\nFuente: [Agrega link relevante aquí para aumentar engagement]';
    resultsHtml += `<h3>Versión Optimizada (Mejorada):</h3><p>${optimized.replace(/\n/g, '<br>')}</p>`;

    document.getElementById('results').innerHTML = resultsHtml;

    // Renderiza gráfico
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

/* Genera el prompt para Grok basado en la entrada */
function generateGrokPrompt() {
    const url   = document.getElementById('postUrl').value.trim();
    const text  = document.getElementById('postInput').value.trim() || '[pega texto del post si lo tienes]';
    const media = document.getElementById('mediaInput').value.trim() || '[describe media si aplica]';
    const mode  = url ? 'link' : 'manual';
    const prompt = `Como Grok, analiza este post de @GlobalEye_TV con ${mode === 'link' ? 'URL "' + url + '" (ID ${postId})' : 'texto manual'}.\n` +
                   `Usa x_thread_fetch con post_id ${postId || 'N/A'} para fetch contenido preciso. Texto: "${text}". Media: "${media}".\n` +
                   `Da informe detallado extenso: Score (weighted scorer), explicaciones paso a paso (P(reply)/dwell/video_view/negatives), mejoras específicas para replies/threads/videos/hashtags/enlaces, evitando negatives.\n` +
                   `Genera versión optimizada. Sé exhaustivo con Premium, considera algorithm de X para optimizaciones avanzadas (For You reach). Usa tablas si ayuda.`;
    const container = document.getElementById('grokPromptContainer');
    container.innerHTML = `<h3>Prompt para Grok (copia y pega en chat Grok):</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar Prompt</button><p>Modo detectado: ${mode}. Para análisis preciso, pega este prompt en el chat conmigo (Grok) – usaré tools internas.</p>`;
    container.style.display = 'block';
}

/* Copia el prompt al portapapeles */
function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Prompt copiado! Pégalo en el chat con Grok para análisis real.')).catch(err => alert('Error: ' + err));
}

/* Helpers para verificar condiciones en el texto */
function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame|debate)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n|mp4)\b/i.test(t); }
function checkForNegatives(t, wc) {
    const u = new Set(t.split(/\s+/)).size;
    return u >= wc * 0.8 && !/\b(compra|venta|gratis|spam|crypto|bitcoin|nsfw)\b/i.test(t);
}
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4|gif)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/.test(t); }

/*
 * ───────────────────────────── Anuncios & Suscripción ─────────────────────────────
 * A continuación se implementa un sistema sencillo de anuncios que carga imágenes aleatorias
 * desde Picsum Photos (sin necesidad de API key)【993678427988795†L123-L134】【993678427988795†L177-L183】.
 * El usuario puede activar una suscripción local (simulada) para ocultar los anuncios.
 */

const LS_SUB = 'xo_sub_v1';

function isSubscribed() {
    try {
        return localStorage.getItem(LS_SUB) === '1';
    } catch {
        return false;
    }
}

function setSubscribed(val) {
    try {
        localStorage.setItem(LS_SUB, val ? '1' : '0');
    } catch {}
}

function updateSubscriptionUI() {
    const sub = isSubscribed();
    const adBanner = document.getElementById('adBanner');
    if (adBanner) {
        if (sub) adBanner.classList.add('hidden');
        else adBanner.classList.remove('hidden');
    }
    const btn1 = document.getElementById('btnSubscribe');
    const btn2 = document.getElementById('btnSubscribeInline');
    if (btn1) {
        btn1.textContent = sub ? 'Suscrito' : 'Sin anuncios 1$';
    }
    if (btn2) {
        btn2.textContent = sub ? 'Gracias' : 'Sin anuncios 1$';
        btn2.disabled = sub;
    }
}

function loadAd() {
    if (isSubscribed()) return;
    const img = document.getElementById('adImage');
    const link = document.getElementById('adLink');
    const seed = Math.floor(Math.random() * 1000000);
    const urlImg = `https://picsum.photos/seed/${seed}/400/200`;
    if (img) {
        img.src = urlImg;
        img.alt = 'Publicidad';
    }
    if (link) {
        link.href = 'https://picsum.photos/';
    }
}

function initAds() {
    updateSubscriptionUI();
    loadAd();
    const btn1 = document.getElementById('btnSubscribe');
    const btn2 = document.getElementById('btnSubscribeInline');
    const subscribeHandler = () => {
        if (!isSubscribed()) {
            setSubscribed(true);
            updateSubscriptionUI();
            alert('Suscripción activada. ¡Gracias por apoyar! Los anuncios han sido eliminados.');
        } else {
            alert('Ya estás suscrito.');
        }
    };
    if (btn1) btn1.addEventListener('click', subscribeHandler);
    if (btn2) btn2.addEventListener('click', subscribeHandler);
    // Recarga los anuncios cada 60 segundos
    setInterval(() => {
        loadAd();
    }, 60000);
}

// Inicializa los anuncios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAds);