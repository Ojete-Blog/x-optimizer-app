function loadPreview() {
    const urlInput = document.getElementById('postUrl').value.trim();
    const previewStatus = document.getElementById('previewStatus');
    const tweetEmbed = document.getElementById('tweetEmbed');

    tweetEmbed.innerHTML = ''; // Limpiar previo
    if (!urlInput) {
        previewStatus.textContent = 'Pega la URL para ver el preview del post.';
        return;
    }

    const match = urlInput.match(/(?:x\.com|twitter\.com)\/(?:\w+)\/status\/(\d{1,19})/);
    if (!match) {
        previewStatus.textContent = 'URL inválida. Ej: https://x.com/GlobalEye_TV/status/123456...';
        return;
    }

    const postId = match[1];
    previewStatus.textContent = `Intentando cargar preview del post ${postId}... (espera 5-15s)`;

    // Método recomendado para dinámico: createTweet
    function tryRender() {
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
            window.twttr.widgets.createTweet(postId, tweetEmbed, {
                conversation: 'none',  // Oculta replies si quieres
                cards: 'visible',      // Muestra media
                align: 'center',
                lang: 'es',
                dnt: true              // No trackear
            }).then(() => {
                previewStatus.textContent = 'Preview cargado ✅ (si no ves nada, revisa login en X o adblock).';
            }).catch(err => {
                console.error('Error createTweet:', err);
                fallback();
            });
        } else {
            // Retry si script no listo
            setTimeout(tryRender, 2000);
        }
    }

    tryRender();

    // Retry automático 3 veces
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (attempts >= 3 || tweetEmbed.querySelector('iframe')) {
            clearInterval(interval);
            if (!tweetEmbed.querySelector('iframe')) fallback();
        }
    }, 3000);

    function fallback() {
        clearInterval(interval);
        previewStatus.innerHTML = `No cargó el embed (bug común X 2026). <br><a href="${urlInput}" target="_blank" class="fallback-link">Ver post directamente en X →</a>`;
        tweetEmbed.innerHTML = `<p style="color:#999;">(Texto pegado abajo para análisis mientras tanto)</p>`;
    }
}

// Resto de optimizePost() igual que v3.2 (copia del anterior si necesitas)
function optimizePost() {
    // ... (mismo código de análisis y score que en la versión anterior – no cambió)
    // Puedes copiarlo de tu app.js actual si ya lo tienes ajustado
    alert('Análisis completado – mira resultados abajo. Preview debería estar arriba si cargó.');
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