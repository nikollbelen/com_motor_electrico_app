/**
 * PuterTTSService - Genera audio TTS en el navegador usando Puter.js (Gemini)
 * Requiere que puter.js esté cargado como script global en index.html.
 */
export class PuterTTSService {
    constructor() {
        // Caché: "lang:text" → blob URL, para no regenerar el mismo audio dos veces
        this._cache = new Map();
    }

    /**
     * Genera un blob URL de audio a partir del texto y el idioma dados.
     * @param {string} text
     * @param {'es'|'en'} lang
     * @returns {Promise<string|null>}
     */
    async generateAudio(text, lang = 'es') {
        if (!text || !text.trim()) return null;

        if (!window.puter || typeof window.puter.ai?.txt2speech !== 'function') {
            console.error('[PuterTTS] puter.js no está disponible o no tiene txt2speech.');
            return null;
        }

        const key = `${lang}:${text.trim()}`;
        if (this._cache.has(key)) {
            return this._cache.get(key);
        }

        const langInstructions = {
            es: 'Habla en español con un tono educativo, claro y profesional.',
            en: 'Speak in English in a clear, educational, professional tone.'
        };

        const response = await window.puter.ai.txt2speech(text, {
            provider: 'gemini',
            model: 'gemini-2.5-flash-preview-tts',
            voice: 'Achird',
            instructions: langInstructions[lang] || langInstructions.es
        });

        const url = this._resolveUrl(response);
        if (url) {
            this._cache.set(key, url);
        }
        return url;
    }

    /** @param {Blob|HTMLAudioElement|object} response */
    _resolveUrl(response) {
        if (response instanceof Blob) {
            return URL.createObjectURL(response);
        }
        if (response instanceof HTMLAudioElement) {
            return response.src || null;
        }
        if (response && (response.src || response.url)) {
            return response.src || response.url;
        }
        console.warn('[PuterTTS] Tipo de respuesta no reconocido:', response);
        return null;
    }

    /** Libera todos los blob URLs del caché. */
    clearCache() {
        this._cache.forEach((url) => {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        this._cache.clear();
    }
}
