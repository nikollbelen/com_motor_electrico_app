import { SoundManager } from '../../utils/SoundManager.js';

/**
 * AudioManager - Reproduce locuciones pre-generadas desde ./audios/{lang}/{id}.mp3
 */
export class AudioManager {
    constructor() {
        this.currentAudio = null;
        this.currentId    = null;
        this.basePath     = './audios/';
        this.lang         = 'es';
    }

    setLanguage(lang) {
        this.lang = lang;
    }

    async playStepAudio(paso) {
        if (!paso) return;

        const id = (typeof paso === 'string') ? paso : paso.id;
        if (!id) return;

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

        const numericId = id.replace('paso', '');
        const url = `${this.basePath}${this.lang}/${numericId}.mp3`;

        this.currentAudio = new Audio(url);
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

        this.currentAudio.play().catch(err => {
            console.warn(`[AudioManager] Audio no encontrado: ${url}`, err);
            window.dispatchEvent(new CustomEvent('v3d:audioEnded', { detail: { id } }));
        });
    }

    stop() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {}
            this.currentAudio = null;
        }
    }
}
