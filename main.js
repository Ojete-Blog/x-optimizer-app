// main.js — Adaptación de X Optimizer App para el ecosistema Clawdbot
//
// Esta versión conserva la lógica original de análisis y generación de informes,
// pero modifica los textos relacionados con el prompt para orientarlo a un
// agente de Clawdbot. El resto de la aplicación se mantiene intacto y no
// depende de servicios de pago: las llamadas a NewsAPI.org, NewsData.io y
// Twinword Sentiment son totalmente opcionales.

/* =============================================================== */
/* ======================= VARS GLOBALES ========================= */
/* =============================================================== */

// Identificador del post cargado a partir de la URL.
let postId = null;

// Claves API opcionales para enriquecimiento de contenido.
const apiKeys = {
  newsapi: '',
  sentiment: '',
  newsdata: ''
};

// Clave para almacenar la fecha de expiración de la suscripción (ms desde Epoch).
const LS_SUB_EXPIRY = 'xo_sub_expiry';

/* =============================================================== */
/* ======================= TABULACIONES UI ======================== */
/* =============================================================== */

/**
 * Muestra la sección correspondiente al tab seleccionado y oculta las demás.
 * @param {string} tabName Nombre del tab (coincide con sufijo de id: tab-analyze o tab-report)
 */
function openTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(el => {
        if (el.id === 'tab-' + tabName) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
    // Actualiza clase activa en botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
}

/* =============================================================== */
/* ======================= PREVIEW DEL POST ====================== */
/* =============================================================== */

/**
 * Procesa la URL del post para extraer el ID y cargar el embed oficial de X (o Twitter).
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
    // Intenta renderizar el embed cuando la librería esté lista
    function tryRender() {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
            window.twttr.widgets.createTweet(postId, tweetEmbed, { lang: 'es', dnt: true }).then(() => {
                previewStatus.textContent = 'Preview cargado. Usa Auto‑Analizar para informe detallado.';
            }).catch(err => {
                console.error(err);
                previewStatus.textContent = 'Error al cargar embed. Usa modo manual o fallback.';
            });
        } else {
            setTimeout(tryRender, 2000);
        }
    }
    tryRender();
    // Si no se carga un iframe en 12 segundos, usar fallback
    setTimeout(() => {
        if (!tweetEmbed.querySelector('iframe')) fallback(urlInput);
    }, 12000);
}

/**
 * Muestra un enlace directo al post cuando el embed no carga.
 * @param {string} url URL del post en X
 */
function fallback(url) {
    document.getElementById('previewStatus').innerHTML = `Embed no cargó. <a href="${url}" target="_blank" class="fallback-link">Abrir en X</a>`;
}

/* =============================================================== */
/* ========================= API KEY HANDLING ==================== */
/* =============================================================== */

/**
 * Guarda las claves API opcionales introducidas por el usuario para NewsAPI, NewsData y Twinword.
 */
function saveApiKeys() {
    apiKeys.newsapi   = document.getElementById('newsApiKey').value.trim();
    apiKeys.sentiment = document.getElementById('sentimentApiKey').value.trim();
    apiKeys.newsdata  = document.getElementById('newsdataApiKey').value.trim();
    alert('Claves API guardadas. Se usarán en el análisis si están presentes.');
}

/**
 * Enriquecimiento opcional con APIs públicas.
 * Si no hay claves, devuelve un texto informando al usuario.
 * @param {string} text Texto del post
 * @returns {Promise<string>} HTML con noticias y análisis de sentimiento
 */
async function enrichWithPublicApis(text) {
    let enrichment = '';
    const hasKeys = apiKeys.newsapi || apiKeys.sentiment || apiKeys.newsdata;
    if (!hasKeys) {
        return '<p>Análisis básico sin APIs (puedes añadir claves opcionalmente). Para un análisis más profundo, copia el prompt generado y utilízalo con tu agente de Clawdbot.</p>';
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

/* =============================================================== */
/* ========================= ANALIZADOR ========================== */
/* =============================================================== */

/**
 * Ejecuta el análisis automático y muestra los resultados.
 */
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
        previewStatus.textContent = 'Modo link: No hay texto/media manual. Generando análisis genérico y sugiriendo análisis preciso vía Clawdbot.';
        fetchedText = 'Post de @GlobalEye_TV sobre noticias globales (supuesto basado en URL). Para precisión, copia el prompt para Clawdbot.';
        generateGrokPrompt();
    } else if (!fetchedText && !fetchedMedia && !urlInput) {
        previewStatus.textContent = 'No hay contenido suficiente. Pega URL, texto o media.';
        return;
    } else {
        previewStatus.textContent = 'Análisis en progreso...';
    }
    const fullContent = fetchedText + (fetchedMedia ? ' ' + fetchedMedia : '') || 'Contenido de post de noticias globales (supuesto para análisis básico)';
    const enrichmentHtml = await enrichWithPublicApis(fetchedText || fullContent);
    generateReport(fetchedText || '[Texto no proporcionado - análisis genérico para @GlobalEye_TV]', fetchedMedia || '[Sin media]', mode, enrichmentHtml);
    previewStatus.textContent = 'Análisis completo. Revisa abajo.';
}

/**
 * Genera un informe con puntuación, sugerencias, gráfico y versión optimizada.
 * @param {string} text Texto del post
 * @param {string} media Descripción de media
 * @param {string} mode Modo (link/manual)
 * @param {string} enrichmentHtml HTML con información de APIs
 */
function generateReport(text, media, mode, enrichmentHtml) {
    const fullContent = text + (media ? ' ' + media : '');
    let score = 0;
    const suggestions = [];
    const maxScore = 100;
    // Replies
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
    resultsHtml += '<h3>Visualización de Score:</h3><div class="chart-container"><canvas id="scoreChart" width="400" height="400"></canvas></div>';
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

/**
 * Genera el prompt para Clawdbot basado en la entrada del usuario.
 */
function generateGrokPrompt() {
    const url   = document.getElementById('postUrl').value.trim();
    const text  = document.getElementById('postInput').value.trim() || '[pega texto del post si lo tienes]';
    const media = document.getElementById('mediaInput').value.trim() || '[describe media si aplica]';
    const mode  = url ? 'link' : 'manual';
    const prompt = `Como tu agente de Clawdbot, analiza este post de @GlobalEye_TV con ${mode === 'link' ? 'URL "' + url + '" (ID ' + (postId || 'N/A') + ')' : 'texto manual'}.` +
                   `\nUsa x_thread_fetch con post_id ${postId || 'N/A'} para fetch contenido preciso. Texto: "${text}". Media: "${media}".` +
                   `\nDa informe detallado extenso: Score (weighted scorer), explicaciones paso a paso (P(reply)/dwell/video_view/negatives), mejoras específicas para replies/threads/videos/hashtags/enlaces, evitando negatives.` +
                   `\nGenera versión optimizada. Sé exhaustivo y considera el algoritmo de X para optimizaciones avanzadas (For You reach). Usa tablas si ayuda.`;
    const container = document.getElementById('grokPromptContainer');
    container.innerHTML = `<h3>Prompt para Clawdbot (copia y pega en el chat):</h3><pre>${prompt}</pre><button onclick="copyPrompt()">Copiar Prompt</button><p>Modo detectado: ${mode}. Para análisis avanzado, pega este prompt en el chat con tu agente de Clawdbot.</p>`;
    container.style.display = 'block';
}

/**
 * Copia el prompt generado al portapapeles.
 */
function copyPrompt() {
    const pre = document.querySelector('#grokPromptContainer pre');
    navigator.clipboard.writeText(pre.textContent).then(() => alert('Prompt copiado. Pégalo en el chat de Clawdbot para análisis real.')).catch(err => alert('Error: ' + err));
}

/* =============================================================== */
/* ======================= VALIDADORES DE TEXTO ================== */
/* =============================================================== */

function checkForReplies(t) { return /\?|\b(qu[ée]|piensas|opini[óo]n|dime|responde|comparte|cu[ée]ntame|debate)\b/i.test(t); }
function checkForVideos(t) { return /\b(video|clip|short|ver|duraci[óo]n|mp4)\b/i.test(t); }
function checkForNegatives(t, wc) {
    const u = new Set(t.split(/\s+/)).size;
    return u >= wc * 0.8 && !/\b(compra|venta|gratis|spam|crypto|bitcoin|nsfw)\b/i.test(t);
}
function checkForMedia(t) { return /\b(imagen|foto|video|http|jpg|png|mp4|gif)\b/i.test(t) || t.includes('http'); }
function checkForHashtags(t) { return /#[\wáéíóú]+/.test(t); }

/* =============================================================== */
/* =================== SUSCRIPCIÓN Y PUBLICIDAD ================== */
/* =============================================================== */

/**
 * Devuelve true si la suscripción está activa (fecha futura en localStorage).
 */
function isSubscribed() {
    try {
        const exp = parseInt(localStorage.getItem(LS_SUB_EXPIRY), 10);
        if (!exp) return false;
        if (Date.now() < exp) return true;
        localStorage.removeItem(LS_SUB_EXPIRY);
        return false;
    } catch {
        return false;
    }
}

/**
 * Activa o desactiva la suscripción. Cuando se activa, almacena 30 días de vigencia.
 * @param {boolean} val true para activar la suscripción
 */
function setSubscribed(val) {
    try {
        if (val) {
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const expiry = Date.now() + thirtyDaysMs;
            localStorage.setItem(LS_SUB_EXPIRY, String(expiry));
        } else {
            localStorage.removeItem(LS_SUB_EXPIRY);
        }
    } catch {}
}

/**
 * Actualiza el texto de los botones de suscripción y oculta/mostrar anuncios según estado.
 */
function updateSubscriptionUI() {
    const sub = isSubscribed();
    const footer = document.getElementById('footerAd');
    // Mostrar u ocultar anuncio de pie según suscripción
    if (footer) footer.classList.toggle('hidden', sub);
    ['btnSubscribe', 'btnSubscribeFooter'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.textContent = sub ? 'Suscrito' : 'Sin anuncios 1€';
            btn.disabled = sub;
        }
    });
}

/**
 * Muestra el anuncio de pie de página y refresca su contenido.
 */
function showFooterAd() {
    if (isSubscribed()) return;
    const footer = document.getElementById('footerAd');
    if (footer) {
        footer.classList.remove('hidden');
        const ins = footer.querySelector('ins.adsbygoogle');
        if (ins) {
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.warn('Error al cargar anuncio en footer:', e);
            }
        }
    }
}

/**
 * Oculta el anuncio de pie de página.
 */
function closeFooterAd() {
    const footer = document.getElementById('footerAd');
    if (footer) footer.classList.add('hidden');
}

/**
 * Inicializa el sistema de publicidad: asigna manejadores y programa refrescos periódicos.
 */
function initAds() {
    updateSubscriptionUI();
    const subscribeHandler = () => {
        if (!isSubscribed()) {
            setSubscribed(true);
            updateSubscriptionUI();
            // Ocultar anuncio de pie al suscribirse
            closeFooterAd();
            alert('Suscripción activada por 30 días. ¡Gracias por apoyar!');
        } else {
            alert('Ya estás suscrito.');
        }
    };
    // Asignar manejador de suscripción a botones
    ['btnSubscribe', 'btnSubscribeFooter'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', subscribeHandler);
    });
    // Asignar cierre del anuncio de pie directamente (botón tiene onclick inline)
    if (!isSubscribed()) {
        showFooterAd();
        setInterval(showFooterAd, 90000); // refrescar cada 1.5 minutos
    }
}

/* =============================================================== */
/* ===================== INICIO DE SESIÓN GOOGLE ================= */
/* =============================================================== */

/**
 * Descifra un token JWT de Google para obtener los datos del usuario.
 * @param {string} token JWT devuelto por Google Identity Services
 * @returns {any} Objeto con datos del usuario (por ejemplo, email)
 */
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

/**
 * Maneja la respuesta de credenciales de Google y almacena el email en localStorage.
 */
function handleCredentialResponse(response) {
    try {
        const payload = parseJwt(response.credential);
        const email = payload.email;
        if (email) {
            localStorage.setItem('xo_user_email', email);
            updateUserUI();
        }
    } catch (e) {
        console.error('Error al procesar credencial de Google:', e);
    }
}

/**
 * Actualiza la UI según si hay usuario logueado. Muestra/hide el botón de login y datos del usuario.
 */
function updateUserUI() {
    const email = localStorage.getItem('xo_user_email') || '';
    const userInfo = document.getElementById('userInfo');
    const emailSpan = document.getElementById('userEmail');
    const signInDiv = document.getElementById('googleSignInDiv');
    if (email) {
        if (userInfo) userInfo.style.display = 'block';
        if (emailSpan) emailSpan.textContent = email;
        if (signInDiv) signInDiv.style.display = 'none';
    } else {
        if (userInfo) userInfo.style.display = 'none';
        if (signInDiv) signInDiv.style.display = 'block';
    }
}

/**
 * Inicializa Google Identity Services y configura el botón de inicio de sesión.
 */
function initGoogleSignIn() {
    // Reemplaza con tu propio client_id de Google Cloud Console
    const clientId = 'REEMPLAZA_CON_TU_CLIENT_ID_DE_GOOGLE';
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.warn('Google Identity Services no está cargado. Asegúrate de incluir su script en index.html.');
        return;
    }
    google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('googleSignInDiv'),
        { theme: 'outline', size: 'large', type: 'standard', shape: 'pill', width: 250 }
    );
    // Permite login automático si el usuario ya está autenticado con Google
    google.accounts.id.prompt();
}

/**
 * Cierra sesión: elimina el email almacenado y solicita a GIS que detenga autoselección.
 */
function logout() {
    localStorage.removeItem('xo_user_email');
    try {
        if (google && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
    } catch {}
    updateUserUI();
}

/* =============================================================== */
/* ========================= INICIALIZACIÓN ====================== */
/* =============================================================== */

// Espera a que el DOM cargue para inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // Configurar tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => openTab(btn.dataset.tab));
    });
    openTab('analyze');
    // Inicializar publicidad, login e interfaz
    initAds();
    initGoogleSignIn();
    updateUserUI();
    // Enlazar logout con botón
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});