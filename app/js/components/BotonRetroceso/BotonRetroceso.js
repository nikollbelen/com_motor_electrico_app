import { SoundManager } from '../../utils/SoundManager.js';

/**
 * BotonRetroceso - Botón circular de retroceso (abajo-derecha)
 */
export class BotonRetroceso {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="RetrocesoWrapper" id="retroceso-wrapper" style="display:none;">
                <span class="Ayuda Description">
                    <span class="es">Retroceso</span>
                    <span class="en">Back</span>
                </span>
                <button class="CircularButton" id="retroceso1">
                    <img src="./images/back.png" alt="Retroceso" />
                </button>
            </div>
        `;
        this._asociarEventos();
    }

    _asociarEventos() {
        const btn = this.container.querySelector('#retroceso1');

        btn.addEventListener('mouseenter', () => {
            SoundManager.stopHover();
            SoundManager.stopClick();
            SoundManager.playHover();
        });

        btn.addEventListener('click', () => {
            SoundManager.stopHover();
            SoundManager.stopClick();
            SoundManager.playClick();
            // Notificar a main.js para que gestione el historial
            window.dispatchEvent(new CustomEvent('retroceso:click'));
        });
    }

    /** Muestra el wrapper completo (label + botón) con animación */
    mostrar() {
        const wrapper = document.getElementById('retroceso-wrapper');
        if (!wrapper) return;
        wrapper.style.display = 'flex';
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateY(100%)';
        setTimeout(() => {
            wrapper.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
            wrapper.style.transform  = 'translateY(0)';
            wrapper.style.opacity    = '1';
        }, 10);
    }

    ocultar() {
        const wrapper = document.getElementById('retroceso-wrapper');
        if (!wrapper) return;
        wrapper.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        wrapper.style.transform  = 'translateY(100%)';
        wrapper.style.opacity    = '0';
        setTimeout(() => { wrapper.style.display = 'none'; }, 500);
    }
}
