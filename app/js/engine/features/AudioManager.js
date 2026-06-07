import { SoundManager } from '../../utils/SoundManager.js';
import { PuterTTSService } from '../../services/PuterTTSService.js';

/**
 * AudioManager - Gestión de locuciones dinámicas.
 * Soporta dos proveedores:
 *   - 'elevenlabs': reproduce archivos MP3 pre-generados en ./audios/
 *   - 'puter':      genera audio en el navegador vía Puter.js (Gemini TTS)
 */
export class AudioManager {
    constructor() {
        this.currentAudio  = null;
        this.currentId     = null;
        this.basePath      = './audios/';
        this.provider      = localStorage.getItem('tts-provider') || 'puter';
        this.lang          = 'es';
        this._generating   = false;
        this._puterTTS     = new PuterTTSService();
    }

    setProvider(provider) {
        this.provider = provider;
        localStorage.setItem('tts-provider', provider);
    }

    setLanguage(lang) {
        this.lang = lang;
    }

    async playStepAudio(paso) {
        if (!paso) return;

        const id = (typeof paso === 'string') ? paso : paso.id;
        if (!id) return;

        // Toggle: mismo audio sonando → pausar
        if (this.currentId === id && this.currentAudio && !this.currentAudio.paused) {
            this.stop();
            return;
        }

        if (SoundManager.isMuted()) {
            this.stop();
            return;
        }

        this.stop();
        this.currentId = id;

        if (this.provider === 'puter' && typeof paso === 'object') {
            await this._playPuterAudio(paso, id);
        } else {
            this._playElevenLabsAudio(id);
        }
    }

    // ── Proveedores ──────────────────────────────────────────────────────────

    _playElevenLabsAudio(id) {
        const numericId = id.replace('paso', '');
        const url = `${this.basePath}${this.lang}/${numericId}.mp3`;

        console.log(`[AudioManager] ElevenLabs → ${url}`);
        this.currentAudio = new Audio(url);
        this._attachEvents(id);
        this.currentAudio.play().catch(err => {
            console.warn(`[AudioManager] Audio no encontrado: ${url}`, err);
            window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
        });
    }

    async _playPuterAudio(paso, id) {
        if (this._generating) return;
        this._generating = true;

        const text = this.lang === 'en' ? paso.ENdescription : paso.ESdescription;
        if (!text) {
            this._generating = false;
            return;
        }

        console.log(`[AudioManager] Puter AI → generando audio (${this.lang}) para: "${text}"`);
        window.dispatchEvent(new CustomEvent('v3d:audioGenerating', { detail: { id } }));

        try {
            const audioUrl = await this._puterTTS.generateAudio(text, this.lang);
            if (!audioUrl) throw new Error('No se obtuvo URL de audio desde Puter.js');

            // Verificar que el usuario no haya cambiado de paso mientras generábamos
            if (this.currentId !== id) {
                this._generating = false;
                return;
            }

            this.currentAudio = new Audio(audioUrl);
            this._attachEvents(id);
            this.currentAudio.play().catch(err => {
                console.warn('[AudioManager] Puter TTS play error:', err);
                window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
            });
        } catch (err) {
            console.error('[AudioManager] Error en Puter TTS:', err);
            window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
        } finally {
            this._generating = false;
        }
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    _attachEvents(id) {
        this.currentAudio.addEventListener('play', () => {
            window.dispatchEvent(new CustomEvent('v3d:audioStarted', { detail: { id } }));
        });
        this.currentAudio.addEventListener('ended', () => {
            window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
            this.currentId = null;
        });
        this.currentAudio.addEventListener('pause', () => {
            window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
        });
    }

    stop() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {
                // Audio ya terminado — silenciamos el error
            }
            this.currentAudio = null;
        }
    }
}
