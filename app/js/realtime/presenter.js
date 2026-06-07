/**
 * presenter.js — Lógica del Presentador (v2 — Basado en Comandos)
 * 
 * En lugar de sincronizar mesh-por-mesh y frame-por-frame, el presentador
 * captura la CÁMARA en tiempo real y envía COMANDOS discretos cuando el
 * usuario ejecuta un paso, reset, o cualquier acción de escena.
 * 
 * El viewer recibe el comando y lo ejecuta localmente → animaciones
 * fluidas, clipping nativo, efectos glass perfectos.
 */

import { supabase } from './supabase-config.js';

export class PresenterSync {
    constructor(engine, roomId, options = {}) {
        this.engine = engine;
        this.roomId = roomId;
        this.intervalMs = options.intervalMs || 100;
        this.onError = options.onError || null;
        this.onPush = options.onPush || null;

        this.presenterId = crypto.randomUUID();
        this._prevStateJSON = '';
        this._intervalId = null;
        this._pushing = false;
        this._pendingState = null;

        // ── Acción actual (comando discreto) ──────────────────
        this._currentAction = null;
        this._actionSeq = 0;
        this._currentPasoId = null;
        this._currentPasoHighlight = false;

        // ── Métricas ──────────────────────────────────────────
        this._stats = { captures: 0, pushes: 0, skipped: 0, errors: 0, blocked: 0 };

        // ── Estado de voz (actualizado externamente por RealtimeControls) ──
        this.voiceActive = false;

        // ── Escuchar eventos del laboratorio ──────────────────
        this._setupEventListeners();
    }

    _setupEventListeners() {
        // Bind event handlers so they can be removed
        this._onPasoEjecutado = this._onPasoEjecutado.bind(this);
        this._onReset = this._onReset.bind(this);
        this._onLabelHover = this._onLabelHover.bind(this);
        this._onLabelUnhover = this._onLabelUnhover.bind(this);

        // Cuando main.js ejecuta un paso (menú, etiqueta, retroceso)
        window.addEventListener('lab:paso_ejecutado', this._onPasoEjecutado);
        // Cuando main.js hace reset
        window.addEventListener('lab:reset', this._onReset);
        // Cuando el presentador pasa el mouse por una etiqueta
        window.addEventListener('lab:label_hover', this._onLabelHover);
        // Cuando el presentador quita el mouse de la etiqueta
        window.addEventListener('lab:label_unhover', this._onLabelUnhover);
    }

    _onPasoEjecutado(e) {
        if (!this._intervalId) return;
            this._actionSeq++;
            this._currentPasoId = e.detail.pasoId;
            this._currentPasoHighlight = e.detail.useGlobalHighlight || false;
            this._currentAction = {
                type: 'paso',
                pasoId: e.detail.pasoId,
                useGlobalHighlight: this._currentPasoHighlight,
                seq: this._actionSeq
            };
            this._forcePush();
        console.log(`%c[Presenter] %c⚡ Acción: paso "${e.detail.pasoId}" (seq: ${this._actionSeq})`,
            'color: #ff6b6b; font-weight: bold;', 'color: #ffd93d;');
    }

    _onReset() {
        if (!this._intervalId) return;
        this._actionSeq++;
            this._currentPasoId = null;
            this._currentPasoHighlight = false;
            this._currentAction = {
                type: 'reset',
                seq: this._actionSeq
            };
            this._forcePush();
        console.log(`%c[Presenter] %c⚡ Acción: reset (seq: ${this._actionSeq})`,
            'color: #ff6b6b; font-weight: bold;', 'color: #ffd93d;');
    }

    _onLabelHover(e) {
        if (!this._intervalId) return;
        this._actionSeq++;
            this._currentAction = {
                type: 'hover',
                meshes: e.detail.meshes,
                labelId: e.detail.labelId,
                seq: this._actionSeq
            };
        this._forcePush();
    }

    _onLabelUnhover(e) {
        if (!this._intervalId) return;
        this._actionSeq++;
            this._currentAction = {
                type: 'unhover',
                meshes: e.detail.meshes,
                labelId: e.detail.labelId,
                seq: this._actionSeq
            };
        this._forcePush();
    }

    async start() {
        if (this._intervalId) return;
        if (!this.engine || !this.engine.ready) {
            throw new Error('[Presenter] Motor 3D no listo.');
        }

        // Leer el paso actual del laboratorio (si ya está en un paso)
        if (window.Lab && window.Lab.currentPasoId) {
            this._currentPasoId = window.Lab.currentPasoId;
            this._currentPasoHighlight = window.Lab.currentPasoHighlight || false;
            console.log(`%c[Presenter] %cPaso actual detectado: ${this._currentPasoId}`, 'color: #ff6b6b; font-weight: bold;', 'color: #ffd93d;');
        }

        const initialState = this._captureState();
        console.log('%c[Presenter] %cEstado inicial:', 'color: #ff6b6b; font-weight: bold;', 'color: white;', initialState);
        
        const ok = await this._pushState(initialState);
        if (ok) {
            this._prevStateJSON = JSON.stringify(initialState);
            console.log('%c[Presenter] %c✓ Conectado a Supabase', 'color: #ff6b6b; font-weight: bold;', 'color: #00ff00;');
        } else {
            console.error('[Presenter] ✗ Falló la conexión inicial.');
        }

        this._intervalId = setInterval(() => this._tick(), this.intervalMs);
        console.log(
            `%c[Presenter] %cSala: %c${this.roomId} %c| ${this.intervalMs}ms | ${this.presenterId.substring(0, 8)}...`,
            'color: #ff6b6b; font-weight: bold;', 'color: white;',
            'color: #ffd93d; font-weight: bold;', 'color: #aaa;'
        );
    }

    stop() {
        if (this._intervalId) { clearInterval(this._intervalId); this._intervalId = null; }
        
        window.removeEventListener('lab:paso_ejecutado', this._onPasoEjecutado);
        window.removeEventListener('lab:reset', this._onReset);
        window.removeEventListener('lab:label_hover', this._onLabelHover);
        window.removeEventListener('lab:label_unhover', this._onLabelUnhover);

        console.log(`%c[Presenter] %cDetenido. ${JSON.stringify(this._stats)}`, 'color: #ff6b6b; font-weight: bold;', 'color: white;');
    }

    async saveSnapshot() {
        const state = this._captureState();
        const id = crypto.randomUUID().replace(/-/g, '').substring(0, 6);
        const { error } = await supabase.from('snapshots').insert({ id, room_id: this.roomId, state });
        if (error) { console.error('[Presenter] Error snapshot:', error); throw error; }
        console.log(`%c[Presenter] %cSnapshot → %c${id}`, 'color: #ff6b6b; font-weight: bold;', 'color: white;', 'color: #4ecdc4; font-weight: bold; font-size: 14px;');
        return id;
    }

    getStats() { return { ...this._stats }; }

    // ─── Internos ─────────────────────────────────────────────

    _tick() {
        this._stats.captures++;
        const state = this._captureState();
        const json = JSON.stringify(state);

        if (json === this._prevStateJSON) { this._stats.skipped++; return; }

        if (this._pushing) {
            this._stats.blocked++;
            this._prevStateJSON = json;
            this._pendingState = state;
            return;
        }

        this._prevStateJSON = json;
        this._pendingState = null;
        this._pushState(state);
    }

    /** Fuerza un push inmediato (usado para comandos de acción) */
    _forcePush() {
        if (!this._intervalId) return; // No push si está detenido
        const state = this._captureState();
        this._prevStateJSON = JSON.stringify(state);
        if (!this._pushing) {
            this._pushState(state);
        } else {
            this._pendingState = state;
        }
    }

    _captureState() {
        const instance = this.engine.instance;
        return {
            active: true,
            currentPaso: this._currentPasoId,
            currentPasoHighlight: this._currentPasoHighlight,
            camera: this._captureCamera(instance),
            action: this._currentAction,
            ui: this._captureUI(),
            voiceActive: this.voiceActive,
        };
    }

    _captureCamera(instance) {
        const cam = instance.camera;
        const controls = instance.controls;
        const t = controls.targetObj ? controls.targetObj.position : controls.target;
        return {
            position: { x: +(cam.position.x.toFixed(2)), y: +(cam.position.y.toFixed(2)), z: +(cam.position.z.toFixed(2)) },
            target:   { x: +(t.x.toFixed(2)), y: +(t.y.toFixed(2)), z: +(t.z.toFixed(2)) }
        };
    }

    _captureUI() {
        return {
            lang: document.body.classList.contains('lang-en') ? 'en' : 'es',
            soundEnabled: true
        };
    }

    async _pushState(state) {
        if (this._pushing) return false;
        this._pushing = true;
        try {
            const { error } = await supabase
                .from('room_states')
                .upsert({ room_id: this.roomId, state, presenter_id: this.presenterId }, { onConflict: 'room_id' })
                .select();

            if (error) {
                this._stats.errors++;
                console.error('%c[Presenter] %c✗ Upsert error:', 'color: #ff6b6b; font-weight: bold;', 'color: #ff0000;', error);
                return false;
            }
            this._stats.pushes++;
            if (this._stats.pushes <= 3 || this._stats.pushes % 20 === 0) {
                console.log(`%c[Presenter] %c↑ #${this._stats.pushes} cam:[${state.camera.position.x.toFixed(0)},${state.camera.position.y.toFixed(0)},${state.camera.position.z.toFixed(0)}] action:${state.action?.type || 'none'}`,
                    'color: #ff6b6b; font-weight: bold;', 'color: #00ff00;');
            }
            return true;
        } catch (e) {
            this._stats.errors++;
            console.error('[Presenter] Error red:', e);
            return false;
        } finally {
            this._pushing = false;
            if (this._pendingState) {
                const p = this._pendingState; this._pendingState = null;
                setTimeout(() => this._pushState(p), 0);
            }
        }
    }
}
