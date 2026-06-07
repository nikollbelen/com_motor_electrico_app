import { CameraController } from './features/CameraController.js';
import { VisibilityManager } from './features/VisibilityManager.js';
import { HighlightManager } from './features/HighlightManager.js';
import { AnimationPlayer } from './features/AnimationPlayer.js';
import { AnnotationsManager } from './features/AnnotationsManager.js';
import { AudioManager } from './features/AudioManager.js';
import { ClippingManager } from './features/ClippingManager.js';

export class V3DEngine {
    constructor(iframeId, themeColor = '#00ffff', allMeshes = []) {
        this.iframeId = iframeId;
        this.iframe = document.getElementById(iframeId);
        this.themeColor = themeColor;
        this.allMeshes = allMeshes;
        this.ready = false;
        this._materialBackup = new Map(); // Backup de materiales originales para restaurar
        
        // Estado global interno del motor (selección manual de etiquetas)
        this.currentGlobalSelection = { obj: null };
        this.currentStepSelection = [];
    }

    async waitForReady() {
        return new Promise((resolve) => {
            let preloaderPatched = false;

            const check = () => {
                const iframeWin = this.iframe.contentWindow;
                
                if (iframeWin && iframeWin.v3d && iframeWin.v3d.apps && iframeWin.v3d.apps.length > 0) {
                    const appInstance = iframeWin.v3d.apps[0];
                    
                    // Interceptamos el preloader lo antes posible para actualizar el contador 0-100%
                    if (!preloaderPatched && appInstance.preloader) {
                        const originalUpdate = appInstance.preloader.onUpdate;
                        appInstance.preloader.onUpdate = function(percentage) {
                            if (originalUpdate) originalUpdate.call(appInstance.preloader, percentage);
                            const pctEl = document.getElementById('loading_percentage');
                            if (pctEl) pctEl.innerHTML = Math.round(percentage) + '%';
                        };
                        preloaderPatched = true;
                    }

                    // Verificamos que la app haya cargado completamente (escena y controles)
                    if (appInstance.scene && appInstance.controls) {
                        this._initFeatures(iframeWin);
                        resolve();
                        return;
                    }
                }
                setTimeout(check, 50); // Sondeo rápido para no perder eventos del preloader
            };
            check();
        });
    }

    _initFeatures(iframeWindow) {
        this.instance = iframeWindow.v3d.apps[0];
        
        this.camera = new CameraController(this.instance);
        this.visibility = new VisibilityManager(this.instance);
        this.highlights = new HighlightManager(this.instance, iframeWindow, this.themeColor);
        this.clipping = new ClippingManager(this.instance, iframeWindow);
        
        // Exponer herramientas de depuración
        window.enableCameraDebug = () => this.camera.enableDebug();
        window.disableCameraDebug = () => this.camera.disableDebug();
        window.debugHighlightUI = () => this._createHighlightDebugUI();
        window.debugClippingUI = () => this._createClippingDebugUI();
        window.enableGlassMode = (opts) => this._applyGlassEffect(opts);
        window.disableGlassMode = () => this._restoreOriginalMaterials();
        
        window.enableXRay = () => this._enableXRay();
        window.disableXRay = () => this.clipping.disable();
        this.animations = new AnimationPlayer(this.instance, iframeWindow);
        this.annotations = new AnnotationsManager(this.instance, iframeWindow, this.highlights, this.allMeshes);
        this.audio = new AudioManager();
        
        this.ready = true;
        console.log('[V3DEngine] Motor 3D modular inicializado.');
        console.log('%c[Debug Tip] %cEscribe %cenableCameraDebug()%c para cámara o %cdebugHighlightUI()%c para el color de resaltado.', 
            'color: #ff00ff; font-weight: bold;', 'color: white;', 'color: #00ff00; font-family: monospace;', 'color: white;', 'color: #00ff00; font-family: monospace;', 'color: white;');
    }

    _createHighlightDebugUI() {
        const id = 'v3d-debug-highlight-ui';
        if (document.getElementById(id)) return;

        const panel = document.createElement('div');
        panel.id = id;
        panel.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
            color: white; font-family: sans-serif; display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 200px;
        `;

        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px; opacity: 0.7;">HIGHLIGHT DEBUGGER</div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Color de Resaltado</label>
                <input type="color" id="debug-color" value="${this.themeColor || '#00ffff'}" style="width: 100%; height: 30px; border: none; background: none; cursor: pointer;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Opacidad Base: <span id="opacity-val">0.8</span></label>
                <input type="range" id="debug-opacity" min="0" max="1" step="0.05" value="0.8" style="width: 100%;">
            </div>
            <button id="close-debug" style="margin-top: 5px; padding: 5px; font-size: 10px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; border-radius: 4px;">Cerrar Debugger</button>
        `;

        document.body.appendChild(panel);

        const colorInput = panel.querySelector('#debug-color');
        const opacityInput = panel.querySelector('#debug-opacity');
        const opacityVal = panel.querySelector('#opacity-val');

        const update = () => {
            const color = colorInput.value;
            const opacity = parseFloat(opacityInput.value);
            opacityVal.textContent = opacity;

            const colorHex = parseInt(color.replace('#', ''), 16);
            
            if (this.highlights.activeOutlines.size === 0) {
                this.highlights.enable(this.allMeshes, true, color);
            }

            this.highlights.updateStyle(colorHex, opacity);
            console.log('%c[Debug Highlight] %cColor: %c' + color + ' %c| Opacidad: %c' + opacity, 
                'color: #00ffff; font-weight: bold;', 'color: white;', 'color: ' + color + '; font-weight: bold;', 'color: white;', 'color: #ffff00; font-weight: bold;');
        };

        colorInput.addEventListener('input', update);
        opacityInput.addEventListener('input', update);
        panel.querySelector('#close-debug').addEventListener('click', () => panel.remove());
        
        update();
    }

    _applyGlassEffect(options = {}, showUI = true, excludeNames = []) {
        const iframeWin = this.iframe.contentWindow;
        const THREE = iframeWin.v3d || iframeWin.THREE;
        const scene = this.instance.scene;

        // Forzamos el fondo a blanco
        scene.background = new THREE.Color(0xffffff);

        const settings = {
            transmission: 1.0,
            thickness: 2.0,
            roughness: 0.05,
            envMapIntensity: 1.5,
            ior: 1.5,
            color: '#ffffff',
            opacity: 1.0,
            ...options
        };

        // Aplicar efecto cristal a todos los meshes (excepto fondos y objetos excluidos)
        const glassMeshes = [];
        const skipNames = ['fondo01', 'aiSkyDomeLight2'];
        scene.traverse(obj => {
            if (obj.isMesh && !obj.userData.isOutline && !skipNames.includes(obj.name) && !excludeNames.includes(obj.name)) {
                const oldMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                
                // Guardar material original si no lo tenemos ya
                if (!this._materialBackup.has(obj.uuid)) {
                    this._materialBackup.set(obj.uuid, { mesh: obj, material: obj.material });
                }
                
                const glassMat = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color(settings.color),
                    transmission: settings.transmission,
                    thickness: settings.thickness,
                    roughness: settings.roughness,
                    envMapIntensity: settings.envMapIntensity,
                    ior: settings.ior,
                    envMap: scene.environment || scene.background || null,
                    transparent: true,
                    opacity: settings.opacity,
                    side: THREE.DoubleSide
                });
                obj.material = glassMat;
                glassMeshes.push(obj);
            }
        });

        console.log('%c[Lab] Modo Cristal Activado: %c' + glassMeshes.length + ' objetos transformados.', 
            'color: #00ffff; font-weight: bold;', 'color: white;');

        // Solo mostrar el panel de control si se solicita (desde consola)
        if (!showUI) return;

        // --- Panel de Control ---
        const panelId = 'v3d-glass-debug-ui';
        const existing = document.getElementById(panelId);
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = panelId;
        panel.style.cssText = 
            'position: fixed; bottom: 20px; right: 20px; z-index: 9999;' +
            'background: rgba(0,0,0,0.88); backdrop-filter: blur(12px);' +
            'padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12);' +
            'color: white; font-family: Inter, sans-serif; display: flex; flex-direction: column; gap: 12px;' +
            'box-shadow: 0 12px 40px rgba(0,0,0,0.6); width: 220px;';

        var html = '';
        html += '<div style="font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6;">Glass Mode</div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px"><label style="font-size:11px">Color del Vidrio</label>';
        html += '<input type="color" id="glass-color" value="' + settings.color + '" style="width:100%;height:32px;border:none;background:none;cursor:pointer;border-radius:6px"></div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px"><label style="font-size:11px">Opacidad: <span id="glass-opacity-val">' + settings.opacity + '</span></label>';
        html += '<input type="range" id="glass-opacity" min="0" max="1" step="0.05" value="' + settings.opacity + '" style="width:100%"></div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px"><label style="font-size:11px">Rugosidad: <span id="glass-rough-val">' + settings.roughness + '</span></label>';
        html += '<input type="range" id="glass-roughness" min="0" max="1" step="0.01" value="' + settings.roughness + '" style="width:100%"></div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px"><label style="font-size:11px">Grosor: <span id="glass-thick-val">' + settings.thickness + '</span></label>';
        html += '<input type="range" id="glass-thickness" min="0" max="5" step="0.1" value="' + settings.thickness + '" style="width:100%"></div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px"><label style="font-size:11px">Transmisión: <span id="glass-trans-val">' + settings.transmission + '</span></label>';
        html += '<input type="range" id="glass-transmission" min="0" max="1" step="0.05" value="' + settings.transmission + '" style="width:100%"></div>';
        html += '<button id="glass-close" style="margin-top:4px;padding:6px;font-size:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:white;cursor:pointer;border-radius:6px">Cerrar Panel</button>';
        panel.innerHTML = html;
        document.body.appendChild(panel);

        var colorIn = panel.querySelector('#glass-color');
        var opacityIn = panel.querySelector('#glass-opacity');
        var roughIn = panel.querySelector('#glass-roughness');
        var thickIn = panel.querySelector('#glass-thickness');
        var transIn = panel.querySelector('#glass-transmission');

        var update = function() {
            var c = colorIn.value;
            var o = parseFloat(opacityIn.value);
            var r = parseFloat(roughIn.value);
            var t = parseFloat(thickIn.value);
            var tr = parseFloat(transIn.value);
            panel.querySelector('#glass-opacity-val').textContent = o;
            panel.querySelector('#glass-rough-val').textContent = r;
            panel.querySelector('#glass-thick-val').textContent = t;
            panel.querySelector('#glass-trans-val').textContent = tr;

            glassMeshes.forEach(function(mesh) {
                mesh.material.color.set(c);
                mesh.material.opacity = o;
                mesh.material.roughness = r;
                mesh.material.thickness = t;
                mesh.material.transmission = tr;
                mesh.material.needsUpdate = true;
            });

            console.log('%c[Glass] %cColor: ' + c + ' | Opacidad: ' + o + ' | Rugosidad: ' + r + ' | Grosor: ' + t + ' | Transmisión: ' + tr,
                'color: #00ffff; font-weight: bold;', 'color: white;');
        };

        colorIn.addEventListener('input', update);
        opacityIn.addEventListener('input', update);
        roughIn.addEventListener('input', update);
        thickIn.addEventListener('input', update);
        transIn.addEventListener('input', update);
        panel.querySelector('#glass-close').addEventListener('click', function() { panel.remove(); });
    }

    _restoreOriginalMaterials() {
        if (this._materialBackup.size === 0) return;
        
        const iframeWin = this.iframe.contentWindow;
        const THREE = iframeWin.v3d || iframeWin.THREE;
        
        this._materialBackup.forEach(entry => {
            entry.mesh.material = entry.material;
        });
        this._materialBackup.clear();
        
        // Restaurar el fondo original (blanco que ya tenía tu escena)
        this.instance.scene.background = new THREE.Color(0xffffff);
        
        // Cerrar panel de glass si está abierto
        const panel = document.getElementById('v3d-glass-debug-ui');
        if (panel) panel.remove();
        
        console.log('%c[Lab] Materiales originales restaurados.', 'color: #00ff00; font-weight: bold;');
    }

    resetScene(inicioConfig) {
        if (!this.ready) return;
        
        this.currentGlobalSelection.obj = null;
        this.currentStepSelection = [];
        
        this.annotations.removeAll();
        this.highlights.disable();
        
        if (inicioConfig) {
            this.visibility.showEverything();
            this.visibility.hideAll(inicioConfig.ocultarObjetos || []);
        }
    }

    ejecutarInicioEstado(inicioConfig, duration = 0.005) {
        if (!inicioConfig || !this.ready) return;

        this.animations.stop('ALL_OBJECTS');
        if (inicioConfig.animacionInicio) {
            this.animations.setFrame(inicioConfig.animacionInicio.nombre, inicioConfig.animacionInicio.frame);
        }
        
        this.visibility.showEverything();
        this.visibility.hideAll(inicioConfig.ocultarObjetos || []);
        
        if (inicioConfig.camara && inicioConfig.camaraDireccion) {
            this.camera.tween(inicioConfig.camara, inicioConfig.camaraDireccion, duration);
        }
    }

    playStepAudio(paso) {
        if (this.audio) this.audio.playStepAudio(paso);
    }

    _enableXRay(customPos = null, customNorm = null) {
        const molinoMeshes = this.allMeshes.filter(name => {
            const n = name.toLowerCase();
            return n.includes('shell') || 
                   n.includes('tapa') || 
                   n.includes('liner') || 
                   n.includes('revestimiento') || 
                   n.includes('trunion') ||
                   n.includes('material') ||
                   n.includes('ball') ||
                   n.includes('bola') ||
                   n.includes('chute') ||
                   n.includes('tromel') ||
                   n.includes('cojinete');
        });

        console.log(`%c[X-Ray] %cActivando para ${molinoMeshes.length} mallas encontradas.`, 'color: #00ffff; font-weight: bold;', 'color: white;');
        
        // Usar parámetros personalizados o los por defecto
        const pos = customPos || { x: 0, y: 0, z: 0 };
        const norm = customNorm || { x: -1, y: 0, z: 0 };

        this.clipping.enable(molinoMeshes, pos, norm);
        
        // Si no se pasaron parámetros personalizados, asumimos que es modo manual y abrimos UI
        if (!customPos) {
            this._createClippingDebugUI();
        }
    }

    _createClippingDebugUI() {
        const id = 'v3d-debug-clipping-ui';
        if (document.getElementById(id)) return;

        const panel = document.createElement('div');
        panel.id = id;
        panel.style.cssText = `
            position: fixed; bottom: 20px; left: 20px; z-index: 9999;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
            color: white; font-family: sans-serif; display: flex; flex-direction: column; gap: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 220px;
        `;

        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px; opacity: 0.7;">CLIPPING DEBUGGER</div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Posición X: <span id="clip-x-val">0</span></label>
                <input type="range" id="clip-x" min="-6000" max="6000" step="10" value="0" style="width: 100%;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Posición Y: <span id="clip-y-val">0</span></label>
                <input type="range" id="clip-y" min="-6000" max="6000" step="10" value="0" style="width: 100%;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Normal X: <span id="clip-nx-val">-1</span></label>
                <input type="range" id="clip-nx" min="-1" max="1" step="0.1" value="-1" style="width: 100%;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 11px;">Normal Z: <span id="clip-nz-val">0</span></label>
                <input type="range" id="clip-nz" min="-1" max="1" step="0.1" value="0" style="width: 100%;">
            </div>
            <div style="display: flex; gap: 5px;">
                <button id="clip-toggle" style="flex: 1; padding: 5px; font-size: 10px; background: #00ffff; border: none; color: black; cursor: pointer; border-radius: 4px; font-weight: bold;">Activar/Desactivar</button>
                <button id="close-clip-debug" style="padding: 5px; font-size: 10px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; border-radius: 4px;">Cerrar</button>
            </div>
        `;

        document.body.appendChild(panel);

        const xInput = panel.querySelector('#clip-x');
        const yInput = panel.querySelector('#clip-y');
        const nxInput = panel.querySelector('#clip-nx');
        const nzInput = panel.querySelector('#clip-nz');
        
        const xVal = panel.querySelector('#clip-x-val');
        const yVal = panel.querySelector('#clip-y-val');
        const nxVal = panel.querySelector('#clip-nx-val');
        const nzVal = panel.querySelector('#clip-nz-val');

        const update = () => {
            const x = parseFloat(xInput.value);
            const y = parseFloat(yInput.value);
            const nx = parseFloat(nxInput.value);
            const nz = parseFloat(nzInput.value);
            
            xVal.textContent = x;
            yVal.textContent = y;
            nxVal.textContent = nx;
            nzVal.textContent = nz;

            if (this.clipping.active) {
                this.clipping.updatePlane({ x, y, z: 0 }, { x: nx, y: 0, z: nz });
            }
        };

        xInput.addEventListener('input', update);
        yInput.addEventListener('input', update);
        nxInput.addEventListener('input', update);
        nzInput.addEventListener('input', update);
        
        panel.querySelector('#clip-toggle').addEventListener('click', () => {
            if (this.clipping.active) {
                this.clipping.disable();
            } else {
                this._enableXRay();
                update();
            }
        });

        panel.querySelector('#close-clip-debug').addEventListener('click', () => panel.remove());
    }
}
