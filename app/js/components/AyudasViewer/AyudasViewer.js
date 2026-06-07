import { SoundManager } from '../../utils/SoundManager.js';

/**
 * AyudasViewer - Botones flotantes de acción con comportamientos específicos
 */
export class AyudasViewer {
    constructor(containerId, config = {}) {
        this.container      = document.getElementById(containerId);
        this.config         = config;
        this.activeModals   = {};
        this.labelsVisible  = false;
        this.audioMuted     = false;
        this.currentLang    = 'es';

        if (this.container) {
            this.render();
            this._initLang();
        }
    }

    render() {
        const buttons = [
            { id: 'btn_ayuda',     img: 'ayuda.png',       label: 'Ayuda',     enLabel: 'Help',       visible: this.config.tieneBotonAyuda !== false },
            { id: 'btn_objetivos', img: 'objetivo.png',    label: 'Objetivos', enLabel: 'Objectives', visible: this.config.tieneBotonObjetivos !== false },
            { id: 'btn_equipo',    img: 'equipo.png',      label: 'Equipo',    enLabel: 'Equipment',  visible: this.config.tieneBotonEquipo !== false },
            { id: 'btn_sonido',    img: 'audio.png',       label: 'Audio',     enLabel: 'Audio',      visible: this.config.tieneBotonSonido !== false },
            { id: 'btn_lang',      img: 'translation.png', label: 'Idioma',    enLabel: 'Language',   visible: this.config.tieneBotonLang !== false }
        ];

        let html = '<div class="ButtonContainer" id="ayudas">';
        buttons.forEach(btn => {
            if (btn.visible) {
                html += `
                <div class="ButtonWrapper">
                    <span class="Description" id="label_${btn.id.split('_')[1]}" style="display:none;">
                        <p class="es">${btn.label}</p><p class="en">${btn.enLabel}</p>
                    </span>
                    <div class="IconButton" id="${btn.id}">
                        <img src="./images/${btn.img}" id="${btn.id}_img" alt="${btn.label}" />
                    </div>
                </div>`;
            }
        });
        html += '</div>';
        this.container.innerHTML = html;
        this._asociarEventos();
    }

    _initLang() {
        document.body.classList.remove('lang-en');
        document.body.classList.add('lang-es');
        // Notificar el idioma inicial
        window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: 'es' } }));
    }

    _asociarEventos() {
        const btns = this.container.querySelectorAll('.IconButton');
        btns.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                SoundManager.stopHover();
                SoundManager.playHover();
            });
        });

        const btnAyuda = this.container.querySelector('#btn_ayuda');
        if (btnAyuda) {
            btnAyuda.addEventListener('click', () => {
                SoundManager.playClick();
                this.labelsVisible = !this.labelsVisible;
                document.body.classList.toggle('show-labels', this.labelsVisible);
                this._toggleActive('btn_ayuda', this.labelsVisible);
            });
        }

        const btnObj = this.container.querySelector('#btn_objetivos');
        if (btnObj) {
            btnObj.addEventListener('click', () => {
                SoundManager.playClick();
                this._toggleModal('content2', 'btn_objetivos');
            });
        }

        const btnEq = this.container.querySelector('#btn_equipo');
        if (btnEq) {
            btnEq.addEventListener('click', () => {
                SoundManager.playClick();
                this._toggleModal('content3', 'btn_equipo');
            });
        }

        const btnSon = this.container.querySelector('#btn_sonido');
        if (btnSon) {
            btnSon.addEventListener('click', () => {
                this.audioMuted = !this.audioMuted;
                SoundManager.setMuted(this.audioMuted);
                const img = document.getElementById('btn_sonido_img');
                if (img) img.src = this.audioMuted ? './images/audiono.png' : './images/audio.png';
                this._toggleActive('btn_sonido', this.audioMuted);
            });
        }

        const btnL = this.container.querySelector('#btn_lang');
        if (btnL) {
            btnL.addEventListener('click', () => {
                SoundManager.playClick();
                this.currentLang = this.currentLang === 'es' ? 'en' : 'es';
                document.body.classList.toggle('lang-es', this.currentLang === 'es');
                document.body.classList.toggle('lang-en', this.currentLang === 'en');
                // Notificar cambio de idioma para que el iframe lo sincronice
                window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: this.currentLang } }));
            });
        }
    }

    _toggleModal(contentClass, btnId) {
        const FADE = 400;
        const estabaEsteAbierto = this.activeModals[contentClass] === true;

        document.querySelectorAll('.content').forEach(el => {
            el.style.transition = 'opacity 0.4s ease';
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, FADE);
        });
        this._toggleActive('btn_objetivos', false);
        this._toggleActive('btn_equipo', false);
        this.activeModals = {};

        if (!estabaEsteAbierto) {
            setTimeout(() => {
                SoundManager.playMenuOpen();
                document.querySelectorAll(`.${contentClass}`).forEach(el => {
                    el.style.display = 'flex';
                    setTimeout(() => { el.style.opacity = '1'; }, 0);
                });
                this.activeModals[contentClass] = true;
                this._toggleActive(btnId, true);
            }, FADE);
        }
    }

    _toggleActive(btnId, isActive) {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.toggle('active', isActive);
    }
}
