export class AnnotationsManager {
    constructor(appInstance, iframeWindow, highlightManager, allMeshes = []) {
        this.appInstance = appInstance;
        this.iframeWindow = iframeWindow;
        this.v3d = iframeWindow ? iframeWindow.v3d : null;
        this.highlightManager = highlightManager;
        this.allMeshes = allMeshes;
        this.activeAnnotations = [];
        this.annotationConfigs = new Map();
        this.activeDots = new Map();         // pointId   -> flechaName
        this.activeLabelFlechas = new Map(); // labelId   -> flechaName
        this.dotPositions = new Map();       // pointId   -> {x, y} (frame actual)
        this._injectPremiumStyles();
        this._startSmartLoop();
        this._setupEvents();
    }

    _setupEvents() {
        // Sincronización de Play/Pause
        window.addEventListener('v3d:audioStarted', (e) => this._updateBtnIcon(e.detail.id, 'pause'));
        window.addEventListener('v3d:audioEnded', (e) => this._updateBtnIcon(e.detail.id, 'play_arrow'));
        
        // Sincronización de Idioma
        window.addEventListener('lang:change', (e) => this._updateLanguage(e.detail.lang));
    }

    _updateLanguage(lang) {
        const isEn = lang === 'en';
        const doc = this.iframeWindow.document;
        
        // 1. Sincronizar clase en el iframe
        doc.body.classList.toggle('lang-en', isEn);
        
        // 2. Actualizar textos de etiquetas activas
        this.activeAnnotations.forEach(id => {
            const config = this.annotationConfigs.get(id);
            if (config) {
                const panel = doc.getElementById(id + '_panel');
                if (panel) {
                    const titleEl = panel.querySelector('.Etiqueta-v3d-title');
                    const subtitleEl = panel.querySelector('.Etiqueta-v3d-subtitle');
                    const statusEl = panel.querySelector('.Etiqueta-v3d-status');

                    if (titleEl) titleEl.textContent = (isEn ? config.ENdescription : config.ESdescription) || config.name;
                    if (subtitleEl) subtitleEl.textContent = (isEn ? config.subtitleEN : config.subtitle) || (isEn ? 'Component detail' : 'Detalle del componente');
                    if (statusEl) statusEl.textContent = (isEn ? config.statusEN : config.status) || (isEn ? 'ACTIVE' : 'ACTIVO');
                }
            }
        });
    }

    _updateBtnIcon(id, iconName) {
        const doc = this.iframeWindow.document;
        // Buscamos el span dentro del botón del panel específico
        const iconSpan = doc.querySelector(`#ant_${id}_panel .Etiqueta-v3d-btn span`);
        if (iconSpan) {
            iconSpan.textContent = iconName;
        }
    }

    _startSmartLoop() {
        const update = () => {
            this._updateDotPositions();    // 1. Proyectar puntos 3D→2D
            this._updateLabelPositions();  // 2. Colocar etiquetas en el círculo

            if (this.activeAnnotations.length > 0) {
                const doc = this.iframeWindow.document;
                const camPos = this.appInstance.camera.position;

                // Depth sorting: etiquetas más cercanas encima
                const items = this.activeAnnotations.map(id => {
                    const flechaName = this.activeLabelFlechas.get(id);
                    const obj = flechaName ? this.getObjectByName(flechaName) : null;
                    return { id, dist: obj ? camPos.distanceTo(obj.position) : 9999 };
                }).sort((a, b) => b.dist - a.dist);

                items.forEach(({ id }, i) => {
                    const el = doc.getElementById(id);
                    if (el) el.style.zIndex = 100 + i;
                });
            }

            requestAnimationFrame(update);
        };
        update();
    }

    _updateDotPositions() {
        this.dotPositions.clear();
        if (!this.appInstance || this.activeDots.size === 0) return;
        const doc = this.iframeWindow.document;
        const canvas = this.appInstance.renderer.domElement;
        const camera = this.appInstance.camera;
        const canvasRect = canvas.getBoundingClientRect();

        this.activeDots.forEach((flechaName, pointId) => {
            const obj = this.getObjectByName(flechaName);
            const wrapper = doc.getElementById(pointId);
            if (!obj || !wrapper) return;

            const pos = new this.v3d.Vector3();
            pos.setFromMatrixPosition(obj.matrixWorld);
            pos.project(camera);

            if (pos.z > 1) {
                wrapper.style.display = 'none';
                return;
            }

            const x = (pos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
            const y = (-pos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;
            wrapper.style.display = 'block';
            wrapper.style.left = x + 'px';
            wrapper.style.top = y + 'px';
            this.dotPositions.set(pointId, { x, y });
        });
    }

    _updateLabelPositions() {
        if (this.activeLabelFlechas.size === 0) return;
        const doc = this.iframeWindow.document;

        // 1. Recopilar posiciones 2D de cada punto ya proyectado
        const entries = [];
        this.activeLabelFlechas.forEach((flechaName, labelId) => {
            const pos = this.dotPositions.get(labelId + '_punto');
            if (pos) entries.push({ labelId, x: pos.x, y: pos.y });
        });
        if (entries.length === 0) return;

        // 2. Centroide del grupo de puntos (centro del modelado en pantalla)
        const cx = entries.reduce((s, e) => s + e.x, 0) / entries.length;
        const cy = entries.reduce((s, e) => s + e.y, 0) / entries.length;

        // 3. Radio del círculo: mayor distancia punto-centroide + margen fijo
        const maxR = Math.max(...entries.map(e => Math.hypot(e.x - cx, e.y - cy)), 60);
        const circleR = maxR + 170;

        // 4. Primera pasada: posicionar en el círculo y asignar lado
        const sideGroups = { left: [], right: [] };

        entries.forEach(({ labelId, x: dotX, y: dotY }) => {
            const labelEl = doc.getElementById(labelId);
            if (!labelEl) return;

            const angle = Math.atan2(dotY - cy, dotX - cx);
            const lx = cx + circleR * Math.cos(angle);
            const ly = cy + circleR * Math.sin(angle);

            labelEl.style.left = lx + 'px';
            labelEl.style.top  = ly + 'px';

            const panel = labelEl.querySelector('.Etiqueta-v3d-panel');
            const onRight = Math.cos(angle) >= 0;
            if (panel) {
                panel.classList.toggle('is-right', onRight);
                panel.classList.toggle('is-left', !onRight);
            }

            const panelH = (panel && panel.getBoundingClientRect().height) || 72;
            sideGroups[onRight ? 'right' : 'left'].push({ labelEl, y: ly, panelH });
        });

        // 5. Segunda pasada: separar verticalmente las etiquetas de cada lado
        const GAP = 10;
        ['left', 'right'].forEach(side => {
            const items = sideGroups[side].sort((a, b) => a.y - b.y);
            for (let i = 1; i < items.length; i++) {
                const prev = items[i - 1];
                const curr = items[i];
                const prevBottom = prev.y + prev.panelH / 2 + GAP;
                if (curr.y - curr.panelH / 2 < prevBottom) {
                    curr.y = prevBottom + curr.panelH / 2;
                    curr.labelEl.style.top = curr.y + 'px';
                }
            }
        });
    }

    _injectPremiumStyles() {
        const doc = this.iframeWindow.document;
        if (doc.getElementById('v3d-premium-styles')) return;

        // 1. Sincronizar variables de diseño (Esencial para el diseño anterior)
        const parentRoot = window.document.documentElement;
        const iframeRoot = doc.documentElement;
        const themeVars = [
            '--color-primary', 
            '--color-primary-rgb', 
            '--glow-primary', 
            '--glow-primary-strong'
        ];
        
        themeVars.forEach(v => {
            const value = getComputedStyle(parentRoot).getPropertyValue(v).trim();
            if (value) iframeRoot.style.setProperty(v, value);
        });

        // 2. Fuentes — igualar al proyecto principal (Rubik + Material Symbols)
        const fonts = doc.createElement('link');
        fonts.rel = 'stylesheet';
        fonts.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';
        doc.head.appendChild(fonts);

        // Google Fonts solo provee @font-face.
        // La clase .material-symbols-outlined y el hover del panel se definen aquí.
        const iconStyle = doc.createElement('style');
        iconStyle.textContent = [
            // Icono: font-family !important para sobrevivir al selector wildcard *
            '.material-symbols-outlined{',
            'font-family:"Material Symbols Outlined" !important;',
            'font-weight:normal !important;font-style:normal;font-size:30px;line-height:1;',
            'letter-spacing:normal;text-transform:none;',
            'display:inline-block;white-space:nowrap !important;direction:ltr;',
            '-webkit-font-feature-settings:"liga";font-feature-settings:"liga";',
            'font-variation-settings:"FILL" 1,"wght" 400,"GRAD" 0,"opsz" 48;',
            'user-select:none;color:#fff;',
            '}',
            // Hover del panel: !important para sobrescribir el inline style="background:..."
            '.Etiqueta-v3d-panel:hover{',
            'background:rgba(255,255,255,0.12) !important;',
            'transform:translateY(-50%) scale(1.05);',
            'box-shadow:0 25px 30px -5px rgba(0,0,0,0.4),0 0 40px var(--glow-primary);',
            'border-color:#fff;',
            '}',
        ].join('');
        doc.head.appendChild(iconStyle);

        // Sincronizar font-family desde la página padre
        const parentFont = getComputedStyle(window.document.body).fontFamily;
        if (parentFont) doc.body.style.fontFamily = parentFont;

        // 3. CSS de Etiquetas (Ajustamos ruta relativa)
        const link = doc.createElement('link');
        link.id = 'v3d-premium-styles';
        link.rel = 'stylesheet';
        link.href = '../css/components/Etiqueta.css';
        doc.head.appendChild(link);
    }

    getObjectByName(name) {
        if (!name || !this.appInstance) return null;
        return this.appInstance.scene.getObjectByName(name);
    }

    handleAnnot(add, sel, id, customHTML = null) {
        if (!this.appInstance || !this.v3d) return;
        
        if (sel === 'ALL_OBJECTS') {
            this.appInstance.scene.traverse((o) => {
                for (let j = o.children.length - 1; j >= 0; j--) {
                    const child = o.children[j];
                    if (child.type === 'Annotation' || child.isAnnotation) {
                        if (child.dispose) child.dispose();
                        o.remove(child);
                    }
                }
            });
            return;
        }

        const names = (typeof sel === 'string') ? [sel] : sel;
        names.forEach((n) => {
            const o = this.getObjectByName(n);
            if (!o) return;

            for (let j = o.children.length - 1; j >= 0; j--) {
                const child = o.children[j];
                if (child.type === 'Annotation' || child.isAnnotation) {
                    if (child.dispose) child.dispose();
                    o.remove(child);
                }
            }

            if (add) {
                const container = this.iframeWindow.document.body;
                const a = new this.v3d.Annotation(container, '', '');
                a.fadeObscured = false;
                
                if (id) {
                    a.annotation.id = id;
                    if (customHTML && customHTML.includes('Etiqueta-v3d-panel')) {
                        this.activeAnnotations.push(id);
                    }
                }
                if (customHTML) {
                    a.annotation.innerHTML = customHTML;
                    const isLabel = customHTML.includes('Etiqueta-v3d-panel');
                    a.annotation.className = (isLabel ? 'Etiqueta-v3d-label-root' : 'Etiqueta-v3d-point-root') + ' v3d-annotation';
                }
                
                o.add(a);
            }
        });
    }

    operateLineObjectHTML(sel, id, op) {
        if (!this.appInstance || !this.v3d) return;

        if (sel === 'ALL_OBJECTS') {
            this.appInstance.scene.traverse((o) => {
                for (let j = o.children.length - 1; j >= 0; j--) {
                    if (o.children[j].isLineHTML) {
                        const l = o.children[j];
                        o.remove(l);
                        if (l.geometry) l.geometry.dispose();
                        if (l.material) l.material.dispose();
                    }
                }
            });
            return;
        }

        const names = (typeof sel === 'string') ? [sel] : sel;
        names.forEach((n) => {
            const o = this.getObjectByName(n);
            if (!o) return;
            for (let j = o.children.length - 1; j >= 0; j--) {
                if (o.children[j].isLineHTML) o.remove(o.children[j]);
            }
            if (op === 'DRAW') {
                const el = this.iframeWindow.document.getElementById(id);
                if (el) {
                    const themeColor = getComputedStyle(this.iframeWindow.document.documentElement).getPropertyValue('--color-primary').trim();
                    const line = new this.v3d.LineHTML(new this.v3d.Color(themeColor || '#0066ff'), 2);
                    line.offset = 0;
                    line.elemHTML = el;
                    o.add(line);
                }
            }
        });
    }

    createLabelDiv(id, customHTML) {
        const doc = this.iframeWindow.document;
        if (doc.getElementById(id)) return;
        const div = doc.createElement('div');
        div.id = id;
        div.className = 'Etiqueta-v3d-label-root';
        div.innerHTML = customHTML;
        div.style.cssText = 'position:absolute;pointer-events:none;z-index:100;width:0;height:0;';
        doc.body.appendChild(div);
        this.activeAnnotations.push(id);
    }

    createPoint(flechaName, pointId) {
        const doc = this.iframeWindow.document;
        if (doc.getElementById(pointId)) return;

        // Wrapper posicionado por _updateDotPositions (proyección 3D→2D manual)
        const wrapper = doc.createElement('div');
        wrapper.id = pointId;
        wrapper.className = 'Etiqueta-v3d-point-wrapper';
        wrapper.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;z-index:90;display:none;';

        const dot = doc.createElement('div');
        dot.className = 'Etiqueta-v3d-point';
        wrapper.appendChild(dot);
        doc.body.appendChild(wrapper);

        this.activeDots.set(pointId, flechaName);
    }

    _getHTMLContent(nodeConfig) {
        const isEn = window.document.body.classList.contains('lang-en');
        const title = (isEn ? nodeConfig.ENdescription : nodeConfig.ESdescription) || nodeConfig.name || 'Componente';
        const subtitle = (isEn ? nodeConfig.subtitleEN : nodeConfig.subtitle) || (isEn ? 'Component detail' : 'Detalle del componente');
        const status = (isEn ? nodeConfig.statusEN : nodeConfig.status) || (isEn ? 'ACTIVE' : 'ACTIVO');
        const panelId = 'ant_' + nodeConfig.id + '_panel';
        const anchorId = 'ant_' + nodeConfig.id + '_anchor';

        // Estilos inline solo donde el selector CSS podría interferir.
        // El panel usa la clase Etiqueta-v3d-panel para layout/hover/is-left|right.
        // Solo sobreescribimos el background para igualar al storybook (0.03).

        const btnStyle = [
            'width:56px', 'height:56px', 'border-radius:50%',
            'background-color:var(--color-primary)',
            'box-shadow:0 4px 15px var(--glow-primary)',
            'border:none', 'cursor:pointer',
            'display:flex', 'align-items:center', 'justify-content:center',
            'flex-shrink:0', 'overflow:hidden',
            'transition:transform 0.2s ease',
        ].join(';');

        // font-family literal + white-space:nowrap son CRÍTICOS:
        // sin font-family el icono no se renderiza; sin nowrap "play_arrow" hace wrap.
        const iconStyle = [
            'font-family:"Material Symbols Outlined"',
            'font-variation-settings:\'FILL\' 1,\'wght\' 400,\'GRAD\' 0,\'opsz\' 48',
            'font-feature-settings:"liga"',
            'font-size:30px', 'line-height:1',
            'white-space:nowrap', 'display:inline-block',
            'letter-spacing:normal', 'text-transform:none',
            'color:#fff', 'user-select:none',
        ].join(';');

        const RR = "'Rubik','Roboto',sans-serif";

        return `
            <div class="Etiqueta-v3d-panel" id="${panelId}" style="background:rgba(255,255,255,0.03);">
                <div class="Etiqueta-v3d-anchor" id="${anchorId}"></div>

                <button style="${btnStyle}">
                    <span class="material-symbols-outlined" style="${iconStyle}">play_arrow</span>
                </button>

                <div style="min-width:0;flex:1;">
                    <h4 style="font-family:${RR};color:var(--color-primary);font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</h4>
                    <p style="font-family:${RR};color:rgba(26,28,30,0.7);font-size:12px;font-weight:500;margin:0;white-space:normal;line-height:1.4;">${subtitle}</p>
                    <span style="font-family:${RR};color:var(--color-primary);font-size:10px;font-weight:600;text-transform:uppercase;opacity:0.7;margin-top:4px;display:block;">${status}</span>
                </div>
            </div>
        `;
    }

    createLabel(nodeConfig, isNavigable, currentStepSelection = [], currentGlobalSelection = { obj: null }) {
        const id = 'ant_' + nodeConfig.id;
        this.annotationConfigs.set(id, nodeConfig); // Guardamos la config para el cambio de idioma
        const customHTML = this._getHTMLContent(nodeConfig);

        // 1. Punto en el modelo (proyección 3D→2D)
        this.createPoint(nodeConfig.flecha, id + '_punto');

        // 2. Etiqueta en círculo (div normal, posicionado por _updateLabelPositions)
        this.createLabelDiv(id, customHTML);
        this.activeLabelFlechas.set(id, nodeConfig.flecha);

        // 3. Línea del modelo al ancla del panel
        this.operateLineObjectHTML([nodeConfig.flecha], id + '_anchor', 'DRAW');

        const res = nodeConfig.objeto_resaltar || [];

        // 4. Configurar eventos en el documento del IFRAME
        setTimeout(() => {
            const container = this.iframeWindow.document.getElementById(id);
            if (!container) return;

            // Si estamos en modo read-only (viewer), no adjuntar eventos
            if (this.readOnly) {
                container.style.pointerEvents = 'none';
                return;
            }

            // Bloquear eventos del root pero permitir los del panel
            container.style.pointerEvents = 'none';
            const panel = container.querySelector('.Etiqueta-v3d-panel');
            if (panel) panel.style.pointerEvents = 'auto';

            // Highlights al pasar el mouse (Solo si no está ya seleccionado)
            container.addEventListener('mouseenter', () => {
                let isProtected = false;
                res.forEach((n) => {
                    if (n === currentGlobalSelection.obj) isProtected = true;
                    if (currentStepSelection.indexOf(n) !== -1) isProtected = true;
                });
                if (!isProtected && res.length) {
                    this.highlightManager.enable(res);
                    // Notificar al presenter para sincronizar con viewers
                    window.dispatchEvent(new CustomEvent('lab:label_hover', {
                        detail: { meshes: res, labelId: nodeConfig.id }
                    }));
                }
            });

            container.addEventListener('mouseleave', () => {
                let isProtected = false;
                res.forEach((n) => {
                    if (n === currentGlobalSelection.obj) isProtected = true;
                    if (currentStepSelection.indexOf(n) !== -1) isProtected = true;
                });
                if (!isProtected && res.length) {
                    this.highlightManager.disable(res);
                    // Notificar al presenter
                    window.dispatchEvent(new CustomEvent('lab:label_unhover', {
                        detail: { meshes: res, labelId: nodeConfig.id }
                    }));
                }
            });

            // Click en el botón de PLAY: Solo AUDIO
            const playBtn = panel.querySelector('.Etiqueta-v3d-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evitamos disparar la navegación del panel
                    window.dispatchEvent(new CustomEvent('v3d:playAudio', { detail: { id: nodeConfig.id } }));
                });
            }

            // Click en el PANEL: NAVEGACIÓN + RESALTADO
            container.addEventListener('click', () => {
                // 1. Resaltado Global (Todos los meshes del modelado)
                if (this.allMeshes.length) {
                    this.highlightManager.disable(); // Limpiar previos
                    this.highlightManager.enable(this.allMeshes);
                    currentGlobalSelection.obj = "GLOBAL_HIGHLIGHT"; // Marca especial
                }

                // 2. Navegación Silenciosa (Cámara, visibilidad, etc.)
                window.dispatchEvent(new CustomEvent('v3d:navegar', { 
                    detail: { 
                        id: nodeConfig.id, 
                        skipAudio: true,
                        useGlobalHighlight: true 
                    } 
                }));
            });
        }, 100);
    }

    removeAll() {
        this.handleAnnot(false, 'ALL_OBJECTS');
        this.operateLineObjectHTML('ALL_OBJECTS', '', 'REMOVE');
        this.activeAnnotations = [];
        this.annotationConfigs.clear();
        this.activeDots.clear();
        this.activeLabelFlechas.clear();
        this.dotPositions.clear();
        const annots = this.iframeWindow.document.querySelectorAll('[class*="Etiqueta-v3d-"]');
        annots.forEach(el => el.remove());
    }
}
