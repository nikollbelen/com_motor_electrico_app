/**
 * SoundManager - Servicio Global de Sonidos
 * Singleton: se instancia UNA sola vez y todos los componentes lo importan.
 * Equivalente al hook useSoundButton de molino_sag pero en Vanilla JS puro.
 */
class SoundManagerClass {
    constructor() {
        // Rutas relativas al index.html (app/sounds/)
        this._hover = new Audio('./sounds/hover.mp3');
        this._click = new Audio('./sounds/click.mp3');
        this._menuOpen  = new Audio('./sounds/menu-open.mp3');
        this._menuClose = new Audio('./sounds/menu-close.mp3');

        // Configuración de volumen global
        this._hover.volume     = 0.6;
        this._click.volume     = 0.7;
        this._menuOpen.volume  = 0.4;
        this._menuClose.volume = 0.4;
    }

    /** Detiene y reinicia un audio para poder repetirlo rápido entre hovers */
    _play(audio) {
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch(e) {}
    }

    playHover()     { this._play(this._hover); }
    stopHover()     { this._hover.pause(); this._hover.currentTime = 0; }

    playClick()     { this._play(this._click); }
    stopClick()     { this._click.pause(); this._click.currentTime = 0; }

    playMenuOpen()  { this._play(this._menuOpen); }
    playMenuClose() { this._play(this._menuClose); }

    /** Silencia o activa todos los sonidos globalmente */
    setMuted(muted) {
        this._muted = muted;
        [this._hover, this._click, this._menuOpen, this._menuClose].forEach(a => {
            a.muted = muted;
        });
    }

    isMuted() {
        return !!this._muted;
    }

    toggleMute() {
        const newMuted = !this.isMuted();
        this.setMuted(newMuted);
        return newMuted;
    }
}

// Exportamos la ÚNICA instancia global (Patrón Singleton)
export const SoundManager = new SoundManagerClass();
