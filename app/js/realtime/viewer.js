/**
 * viewer.js — Viewer con Ejecución Local de Comandos (v2)
 * 
 * El viewer recibe COMANDOS del presentador (paso, reset) y los ejecuta
 * localmente usando V3DEngine. Las animaciones corren nativas (fluidas),
 * el clipping y glass se aplican correctamente, y las etiquetas son visibles.
 * 
 * La cámara se interpola con lerp en el render loop.
 */

import { supabase } from './supabase-config.js';

export class ViewerSync {
    /**
     * @param {object} engine — V3DEngine ya inicializado
     * @param {string} roomId — ID de la sala
     * @param {object} config — info.json completo (con menu, inicioEstado, etc.)
     * @param {object} [options]
     */
    constructor(engine, roomId, config, options = {}) {
        this.engine = engine;
        this.roomId = roomId;
        this.config = config;
        this.lerpFactor = options.lerpFactor || 0.08;
        this.onStateReceived = options.onStateReceived || null;
        this.onError = options.onError || null;

        this._targetCameraPos = null;
        this._targetCameraTarget = null;
        this._channel = null;
        this._rafId = null;
        this._running = false;
        this._lastUpdatedAt = null;
        this._lastActionSeq = -1;
        this._THREE = null;
        this._lastState = null;
        this._stats = { statesReceived: 0, actionsExecuted: 0, reconnections: 0 };
    }

    async start() {
        if (this._running) return;
        if (!this.engine || !this.engine.ready) throw new Error('[Viewer] Motor no listo.');

        this._THREE = this.engine.iframe.contentWindow.v3d || this.engine.iframe.contentWindow.THREE;

        await this._fetchCurrentState();
        this._subscribe();
        this._startRenderLoop();
        this._running = true;

        console.log(`%c[Viewer] %cConectado → Sala: %c${this.roomId}`,
            'color: #4ecdc4; font-weight: bold;', 'color: white;', 'color: #ffd93d; font-weight: bold;');
    }

    stop() {
        this._running = false;
        if (this._channel) { supabase.removeChannel(this._channel); this._channel = null; }
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    }

    async loadSnapshot(snapshotId) {
        const { data, error } = await supabase.from('snapshots').select('state, room_id').eq('id', snapshotId).single();
        if (error || !data) throw new Error(`Snapshot "${snapshotId}" no encontrado.`);
        this.roomId = data.room_id;

        // Aplicar cámara INMEDIATAMENTE (no lerp, el render loop no corre en snapshot)
        if (!this._THREE) {
            this._THREE = this.engine.iframe.contentWindow.v3d || this.engine.iframe.contentWindow.THREE;
        }
        const state = data.state;
        if (state?.camera) {
            const cam = this.engine.instance.camera;
            const controls = this.engine.instance.controls;
            const t = controls.targetObj ? controls.targetObj.position : controls.target;

            if (state.camera.position) {
                cam.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
            }
            if (state.camera.target) {
                t.set(state.camera.target.x, state.camera.target.y, state.camera.target.z);
            }
            if (controls.update) controls.update();
        }
        if (state?.ui) this._applyUI(state.ui);

        // Ejecutar el paso actual (con etiquetas, glass effect, etc) si existe en el snapshot
        if (state.currentPaso) {
            this._executePaso(state.currentPaso, state.currentPasoHighlight || false);
        }

        // Si la última acción fue una animación que no depende del paso
        if (state.action?.type === 'paso' || state.action?.type === 'hover' || state.action?.type === 'unhover' || state.action?.type === 'reset') {
            // Ignorar para snapshots, la recarga del paso ya aplicó el estado base
        } else if (state.action) {
            // Animaciones directas u otros actions
            this._applyAction(state.action);
        }

        console.log(`%c[Viewer] %cSnapshot %c${snapshotId}%c cargado`,
            'color: #4ecdc4; font-weight: bold;', 'color: white;', 'color: #ff6b6b; font-weight: bold;', 'color: white;');
        return state;
    }

    getStats() { return { ...this._stats }; }
    get lastState() { return this._lastState; }

    // ─── Realtime ─────────────────────────────────────────────

    async _fetchCurrentState() {
        const { data, error } = await supabase.from('room_states').select('state, updated_at').eq('room_id', this.roomId).single();
        if (error) { console.warn('[Viewer] Sala no encontrada, esperando...'); return; }
        if (!data?.state) return;

        this._lastUpdatedAt = data.updated_at;
        const state = data.state;
        this._lastState = state;

        // Aplicar cámara INMEDIATA (sin lerp, primera conexión)
        if (state.camera) {
            const cam = this.engine.instance.camera;
            const controls = this.engine.instance.controls;
            const t = controls.targetObj ? controls.targetObj.position : controls.target;
            if (state.camera.position) cam.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
            if (state.camera.target) t.set(state.camera.target.x, state.camera.target.y, state.camera.target.z);
            if (controls.update) controls.update();
            // Setear target de lerp para que no salte después
            this._applyCameraTarget(state.camera);
        }

        // Ejecutar el paso actual (con etiquetas) si existe
        if (state.currentPaso) {
            console.log(`%c[Viewer] %c🏷️ Paso actual: ${state.currentPaso} (highlight: ${state.currentPasoHighlight})`, 'color: #4ecdc4; font-weight: bold;', 'color: #ffd93d;');
            this._executePaso(state.currentPaso, state.currentPasoHighlight || false);
        }

        // Guardar último action seq para no re-ejecutar
        if (state.action?.seq) this._lastActionSeq = state.action.seq;

        console.log('%c[Viewer] %cEstado inicial cargado.', 'color: #4ecdc4; font-weight: bold;', 'color: white;');
    }

    _subscribe() {
        const ch = `room-${this.roomId}`;
        this._channel = supabase.channel(ch)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_states', filter: `room_id=eq.${this.roomId}` },
                (payload) => this._onRealtimeUpdate(payload))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_states', filter: `room_id=eq.${this.roomId}` },
                (payload) => this._onRealtimeUpdate(payload))
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log(`%c[Viewer] %cCanal conectado ✓`, 'color: #4ecdc4; font-weight: bold;', 'color: #00ff00;');
                if (status === 'TIMED_OUT') { this._stats.reconnections++; this._fetchCurrentState(); }
                if (status === 'CHANNEL_ERROR') { this._stats.reconnections++; }
            });
    }

    _onRealtimeUpdate(payload) {
        const rec = payload.new;
        if (!rec?.state) return;

        // Detectar cierre de sala en tiempo real
        if (rec.state.active === false) {
            console.log('%c[Viewer] %c⛔ Sala cerrada por el presentador.', 'color: #4ecdc4; font-weight: bold;', 'color: #ef4444;');
            this.stop();
            if (this.onRoomClosed) this.onRoomClosed();
            return;
        }

        if (this._lastUpdatedAt && rec.updated_at && new Date(rec.updated_at) < new Date(this._lastUpdatedAt)) return;
        this._lastUpdatedAt = rec.updated_at;
        this._stats.statesReceived++;
        this._applyState(rec.state);
        if (this.onStateReceived) this.onStateReceived(rec.state);
    }

    // ─── Aplicar Estado ───────────────────────────────────────

    _applyState(state) {
        if (!state) return;
        this._lastState = state;
        if (state.camera) this._applyCameraTarget(state.camera);
        if (state.action) this._applyAction(state.action);
        if (state.ui) this._applyUI(state.ui);
    }

    _applyCameraTarget(camera) {
        if (!this._THREE) return;
        if (camera.position) {
            if (!this._targetCameraPos) this._targetCameraPos = new this._THREE.Vector3();
            this._targetCameraPos.set(camera.position.x, camera.position.y, camera.position.z);
        }
        if (camera.target) {
            if (!this._targetCameraTarget) this._targetCameraTarget = new this._THREE.Vector3();
            this._targetCameraTarget.set(camera.target.x, camera.target.y, camera.target.z);
        }
    }

    _applyUI(ui) {
        if (ui.lang) {
            const cur = document.body.classList.contains('lang-en') ? 'en' : 'es';
            if (cur !== ui.lang) {
                document.body.classList.remove('lang-es', 'lang-en');
                document.body.classList.add(`lang-${ui.lang}`);
                try {
                    const ib = this.engine.iframe.contentDocument.body;
                    if (ib) { ib.classList.remove('lang-es', 'lang-en'); ib.classList.add(`lang-${ui.lang}`); }
                } catch (e) {}
            }
        }
    }

    // ─── Ejecución Local de Comandos ──────────────────────────

    _applyAction(action) {
        if (!action || !action.seq) return;
        // Solo ejecutar si es una acción nueva
        if (action.seq <= this._lastActionSeq) return;
        this._lastActionSeq = action.seq;
        this._stats.actionsExecuted++;

        console.log(`%c[Viewer] %c⚡ Ejecutando: %c${action.type} ${action.pasoId || ''}`,
            'color: #4ecdc4; font-weight: bold;', 'color: white;', 'color: #ffd93d; font-weight: bold;');

        if (action.type === 'paso') {
            this._executePaso(action.pasoId, action.useGlobalHighlight);
        } else if (action.type === 'reset') {
            this._executeReset();
        } else if (action.type === 'hover') {
            this._executeHover(action.meshes);
        } else if (action.type === 'unhover') {
            this._executeUnhover(action.meshes);
        }
    }

    /**
     * Ejecuta un paso localmente — replica la lógica de ejecutarPaso() de main.js
     * pero SIN audio y SIN tween de cámara (la cámara la maneja el lerp).
     */
    _executePaso(pasoId, useGlobalHighlight = false) {
        const pasoConfig = this._findPaso(pasoId);
        if (!pasoConfig) return;

        const engine = this.engine;

        // Reset base
        engine.resetScene(this.config.inicioEstado);

        // 1. Visibilidad
        engine.visibility.showEverything();
        if (pasoConfig.objetos_ocultar?.length) engine.visibility.hideAll(pasoConfig.objetos_ocultar);
        if (pasoConfig.objetos_mostrar?.length) engine.visibility.showAll(pasoConfig.objetos_mostrar);

        // 2. Efectos visuales
        engine._restoreOriginalMaterials();
        engine.highlights.disable();

        if (useGlobalHighlight) {
            const protegidos = [
                ...(pasoConfig.objeto_resaltar || []),
                ...(this.config.objetos_cristal || [])
            ];
            engine._applyGlassEffect({
                color: '#949494', opacity: 0.55, roughness: 0.05, thickness: 2, transmission: 1
            }, false, protegidos);
            engine.currentStepSelection = engine.allMeshes;
        } else {
            engine.currentStepSelection = pasoConfig.objeto_resaltar || [];
            if (engine.currentStepSelection.length) {
                engine.highlights.enable(engine.currentStepSelection, true, '#cccccc');
            }
        }

        // 3. NO hacer camera.tween — la cámara viene del lerp del presentador

        // 4. Animaciones (corren localmente → fluidas)
        if (pasoConfig.detener_animaciones) engine.animations.stop('ALL_OBJECTS');

        if (pasoConfig.animaciones?.length) {
            pasoConfig.animaciones.forEach(anim => {
                const start = Array.isArray(anim.frame) ? anim.frame[0] : (anim.frame || 0);
                const end   = Array.isArray(anim.frame) ? anim.frame[1] : (anim.frame || 0);
                engine.animations.play(anim.nombre, start, end, anim.modo || 'LoopOnce');
            });
        }

        // 5. Clipping / Rayos X
        if (pasoId === 'paso5' || pasoId === 'paso4') {
            engine._enableXRay({ x: 0, y: -6000, z: 0 }, { x: 0, y: 0, z: -1 });
        } else {
            if (engine.clipping) engine.clipping.disable();
        }

        // 6. Etiquetas (visibles pero no interactivas en el viewer)
        const hijos = pasoConfig.children && pasoConfig.children.length > 0;
        if (hijos) {
            pasoConfig.children.forEach(child => {
                if (child.etiqueta && child.flecha) {
                    engine.annotations.createLabel(child, true, engine.currentStepSelection, engine.currentGlobalSelection);
                }
            });
        } else if (pasoConfig.etiqueta && pasoConfig.flecha) {
            engine.annotations.createLabel(pasoConfig, false, engine.currentStepSelection, engine.currentGlobalSelection);
        }

        // 7. Verificar que las etiquetas existen en el DOM del iframe
        setTimeout(() => {
            try {
                const iDoc = engine.iframe.contentDocument || engine.iframe.contentWindow.document;
                const panels = iDoc.querySelectorAll('.Etiqueta-v3d-panel');
                const subtitles = iDoc.querySelectorAll('.Etiqueta-v3d-subtitle');
                const cssLink = iDoc.getElementById('v3d-premium-styles');
                console.log(`[Viewer DEBUG] 📋 Post-check (500ms):`);
                console.log(`[Viewer DEBUG]   .Etiqueta-v3d-panel encontrados: ${panels.length}`);
                console.log(`[Viewer DEBUG]   .Etiqueta-v3d-subtitle encontrados: ${subtitles.length}`);
                console.log(`[Viewer DEBUG]   CSS link existe: ${!!cssLink}, href: ${cssLink?.href}`);
                console.log(`[Viewer DEBUG]   --color-primary en iframe: "${getComputedStyle(iDoc.documentElement).getPropertyValue('--color-primary')}"`);
                subtitles.forEach((el, i) => {
                    console.log(`[Viewer DEBUG]   subtitle[${i}] text: "${el.textContent}", computedColor: ${getComputedStyle(el).color}`);
                });
            } catch (e) { console.warn('[Viewer DEBUG] Error en post-check:', e); }
        }, 500);

        // 8. Forzar colores correctos en etiquetas del viewer
        this._fixLabelColors();
    }

    /** Inyecta colores del tema en el iframe y corrige texto de etiquetas */
    _fixLabelColors() {
        setTimeout(() => {
            try {
                const iDoc = this.engine.iframe.contentDocument || this.engine.iframe.contentWindow.document;
                const iRoot = iDoc.documentElement;
                const parentRoot = document.documentElement;

                // Sincronizar CSS variables al iframe
                ['--color-primary', '--color-primary-rgb', '--glow-primary', '--glow-primary-strong'].forEach(v => {
                    const val = getComputedStyle(parentRoot).getPropertyValue(v).trim();
                    if (val) iRoot.style.setProperty(v, val);
                });

                // Forzar color oscuro en subtitles
                iDoc.querySelectorAll('.Etiqueta-v3d-subtitle').forEach(el => {
                    el.style.color = '#1a1c1e';
                });
                // Forzar color primario en titles
                const primaryColor = getComputedStyle(parentRoot).getPropertyValue('--color-primary').trim();
                iDoc.querySelectorAll('.Etiqueta-v3d-title').forEach(el => {
                    el.style.color = primaryColor || '#0066ff';
                });
            } catch (e) { /* cross-origin */ }
        }, 300);
    }

    _executeReset() {
        const engine = this.engine;
        engine._restoreOriginalMaterials();
        engine.resetScene(this.config.inicioEstado);
        engine.ejecutarInicioEstado(this.config.inicioEstado, 0.005);
        if (engine.clipping) engine.clipping.disable();
    }

    /** Aplica el resaltado de hover en los meshes indicados */
    _executeHover(meshNames) {
        if (!meshNames || !meshNames.length) return;
        this.engine.highlights.enable(meshNames);
    }

    /** Quita el resaltado de hover */
    _executeUnhover(meshNames) {
        if (!meshNames || !meshNames.length) return;
        this.engine.highlights.disable(meshNames);
    }

    /** Busca un paso recursivamente en el árbol del menú */
    _findPaso(id) {
        const search = (items) => {
            if (!items) return null;
            for (const item of items) {
                if (item.id === id) return item;
                if (item.children) {
                    const found = search(item.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return search(this.config.menu);
    }

    // ─── Render Loop (interpolación de cámara) ────────────────

    _startRenderLoop() {
        const loop = () => {
            if (!this._running) return;
            this._interpolateCamera();
            this._rafId = requestAnimationFrame(loop);
        };
        this._rafId = requestAnimationFrame(loop);
    }

    _interpolateCamera() {
        if (!this._targetCameraPos || !this._targetCameraTarget) return;
        const instance = this.engine.instance;
        if (!instance?.camera || !instance?.controls) return;

        instance.camera.position.lerp(this._targetCameraPos, this.lerpFactor);

        const t = instance.controls.targetObj ? instance.controls.targetObj.position : instance.controls.target;
        if (t) t.lerp(this._targetCameraTarget, this.lerpFactor);

        instance.controls.update();
    }
}
