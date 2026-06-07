/**
 * main.js — Orquestador Principal del Laboratorio
 */

import { SoundManager }   from './utils/SoundManager.js';
import { VistaPrincipal } from './components/VistaPrincipal/VistaPrincipal.js';
import { Preloader }      from './components/Preloader/Preloader.js';
import { BotonRetroceso } from './components/BotonRetroceso/BotonRetroceso.js';
import { PantallaMobile } from './components/PantallaMobile/PantallaMobile.js';
import { ModalAyuda }     from './components/ModalAyuda/ModalAyuda.js';
import { ModalObjetivos } from './components/ModalObjetivos/ModalObjetivos.js';
import { ModalEquipo }    from './components/ModalEquipo/ModalEquipo.js';
import { V3DEngine }      from './engine/V3DEngine.js';
import { RealtimeControls } from './components/RealtimeControls/RealtimeControls.js';

// ── Estado global del laboratorio ─────────────────────────────────────────────
const Lab = {
    config:     null,
    menu:       null,
    retroceso:  null,
    historial:  [],
    v3dReady:   false,
    engine:     null,
    lastHoveredBtn: null,
    components: {
        vistaPrincipal: null,
        modalAyuda:     null,
        modalObjetivos: null,
        modalEquipo:    null
    }
};

// ── Inicialización ────────────────────────────────────────────────────────────
async function init() {
    let config;
    try {
        const resp = await fetch('./info.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        config = await resp.json();
    } catch (e) {
        console.error('[Lab] No se pudo leer info.json:', e);
        return;
    }
    Lab.config = config;

    // Configuración dinámica del iframe (permite cambiar el modelo 3D sin tocar HTML)
    const iframe = document.getElementById('v3d-container');
    if (config.verge3dUrl) {
        iframe.src = config.verge3dUrl;
    } else {
        console.warn("[Lab] No se definió 'verge3dUrl' en info.json. El iframe no cargará.");
    }

    // Aplicar color de tema si está definido
    if (config.themeColor) {
        const hex = config.themeColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const rgb = `${r}, ${g}, ${b}`;

        // Variables legacy (compatibilidad con componentes anteriores)
        document.documentElement.style.setProperty('--theme-color',             config.themeColor);
        document.documentElement.style.setProperty('--theme-color-80',          `rgba(${r}, ${g}, ${b}, 0.8)`);
        document.documentElement.style.setProperty('--theme-color-transparent', `rgba(${r}, ${g}, ${b}, 0.6)`);
        document.documentElement.style.setProperty('--theme-color-shadow',      `rgba(${r}, ${g}, ${b}, 0.4)`);

        // Variables nuevas del sistema Blue Core (para Preloader y UI moderna)
        document.documentElement.style.setProperty('--color-primary',           config.themeColor);
        document.documentElement.style.setProperty('--color-primary-rgb',       rgb);
        document.documentElement.style.setProperty('--color-primary-light',     `rgb(${Math.min(255,r+60)}, ${Math.min(255,g+60)}, ${Math.min(255,b+60)})`);
        document.documentElement.style.setProperty('--color-primary-container', `rgb(${Math.max(0,r-60)}, ${Math.max(0,g-60)}, ${Math.max(0,b-60)})`);
        document.documentElement.style.setProperty('--color-on-primary-container', '#ffffff');
        
        // Colores de superficie (Fijos para modo claro sobre blanco)
        document.documentElement.style.setProperty('--color-surface',           '#ffffff');
        document.documentElement.style.setProperty('--color-on-surface',        '#1a1c1e');
        document.documentElement.style.setProperty('--color-surface-variant',   '#f0f1f4');
        document.documentElement.style.setProperty('--color-on-surface-variant','#44474e');
        document.documentElement.style.setProperty('--color-surface-container', '#f8f9fb');

        // Calcular un secundario complementario o derivado (en este caso un tono más suave)
        const sr = Math.min(255, r + 40);
        const sg = Math.min(255, g + 40);
        const sb = Math.min(255, b + 80);
        document.documentElement.style.setProperty('--color-secondary-container', `rgba(${sr}, ${sg}, ${sb}, 0.2)`);

        document.documentElement.style.setProperty('--glow-primary',            `rgba(${r}, ${g}, ${b}, 0.45)`);
        document.documentElement.style.setProperty('--glow-primary-strong',     `rgba(${r}, ${g}, ${b}, 0.75)`);
        document.documentElement.style.setProperty('--gradient-primary',        `linear-gradient(135deg, ${config.themeColor} 0%, rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)}) 100%)`);
    }

    // Inicializamos el nuevo Preloader
    const preloader = new Preloader('preloader-container', {
        labNameES: config.laboratorio,
        labNameEN: config.laboratorioEN || config.laboratorio,
        logoUrl:   config.logoUrl
    });

    // Conectar el botón "INICIAR EXPERIENCIA" con el arranque de la UI
    const preloaderEl = document.getElementById('preloader-container');
    preloaderEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preloader-btn]');
        if (btn && !btn.disabled) {
            preloader.hide();
            // En lugar de mostrar la vista principal, mostramos la guía de navegación
            setTimeout(() => {
                Lab.components.modalAyuda.open();
            }, 500);
        }
    });

    new PantallaMobile('mobile-container');
    
    // Inicializamos el modal con un callback para mostrar la UI principal al cerrar
    Lab.components.modalAyuda = new ModalAyuda('modal-ayuda-container', {
        onClose: () => {
            const container = document.getElementById('vista-principal-container');
            if (container && container.style.display !== 'block') {
                container.style.display = 'block';
                // Opcional: Sonido de entrada de UI
                SoundManager.playMenuOpen();
            }
        }
    });
    
    Lab.components.modalObjetivos = new ModalObjetivos('modal-objetivos-container', config.objetivos || []);
    Lab.components.modalEquipo = new ModalEquipo('modal-equipo-container', config.epp || []);
    
    Lab.components.vistaPrincipal = new VistaPrincipal('vista-principal-container', {
        ...(config.ayudas || {}),
        menuItems: config.menu || [],
        lang: config.defaultLang || 'es'
    });

    // Delegación de eventos para VistaPrincipal
    const vistaPrincipalEl = document.getElementById('vista-principal-container');
    vistaPrincipalEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id     = btn.getAttribute('data-id');

        if (action === 'paso' && id) {
            // Buscamos la configuración del paso en el JSON
            const paso = config.menu.find(m => m.id === id);
            if (paso) {
                window.dispatchEvent(new CustomEvent('menu:paso', { detail: { paso } }));
                
                // Actualizar estado visual de botones (HUD y Mobile Nav)
                vistaPrincipalEl.querySelectorAll('[data-action="paso"]').forEach(el => {
                    const isTarget = el.getAttribute('data-id') === id;
                    // HUD buttons
                    if (el.tagName === 'BUTTON') {
                        el.classList.toggle('VistaPrincipal-btn-active', isTarget);
                    }
                    // Bottom Nav links
                    if (el.tagName === 'A') {
                        el.classList.toggle('text-on-surface-dark', !isTarget);
                        el.style.color = isTarget ? 'var(--color-primary)' : '';
                        const icon = el.querySelector('.material-symbols-outlined');
                        if (icon) {
                            icon.style.color = isTarget ? 'var(--color-primary)' : '';
                            icon.style.fontVariationSettings = `'FILL' ${isTarget ? 1 : 0}`;
                        }
                        const line = el.querySelector('.VistaPrincipal-nav-indicator');
                        if (isTarget && !line) {
                            const lineDiv = document.createElement('div');
                            lineDiv.className = 'w-3 h-0.5 rounded-full mt-0.5 VistaPrincipal-nav-indicator';
                            lineDiv.style.backgroundColor = 'var(--color-primary)';
                            el.appendChild(lineDiv);
                        } else if (!isTarget && line) {
                            line.remove();
                        }
                    }
                });
            }
        }

        if (action === 'lang') {
            const currentLang = Lab.components.vistaPrincipal.options.lang;
            const newLang = currentLang === 'es' ? 'en' : 'es';
            Lab.components.vistaPrincipal.setLanguage(newLang);
            window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: newLang } }));
        }

        if (action === 'help') {
            const isVisible = Lab.components.vistaPrincipal.options.assistantVisible;
            Lab.components.vistaPrincipal.setAssistantVisible(!isVisible);
        }

        if (action === 'ayuda-guia') {
            Lab.components.modalAyuda.open();
        }
        
        if (action === 'objetivos') {
            window.dispatchEvent(new CustomEvent('modal:objetivos:open'));
        }
        
        if (action === 'equipo') {
            window.dispatchEvent(new CustomEvent('modal:equipo:open'));
        }

        if (action === 'tts-provider') {
            const provider = btn.getAttribute('data-provider');
            if (provider && Lab.engine?.audio) {
                Lab.engine.audio.setProvider(provider);
                Lab.components.vistaPrincipal.setTTSProvider(provider);
                // Cerrar el dropdown
                const toggle = vistaPrincipalEl.querySelector('#tts-provider-toggle');
                if (toggle) toggle.checked = false;
            }
        }

        if (action === 'tts-cycle') {
            if (Lab.engine?.audio) {
                const current = Lab.engine.audio.provider;
                const next = current === 'elevenlabs' ? 'puter' : 'elevenlabs';
                Lab.engine.audio.setProvider(next);
                Lab.components.vistaPrincipal.setTTSProvider(next);
                // Cerrar el menú móvil
                const menuToggle = vistaPrincipalEl.querySelector('#menu-toggle');
                if (menuToggle) menuToggle.checked = false;
            }
        }

        if (action === 'save') {
            // Por ahora solo un log o evento genérico
            console.log("[Lab] Guardar escenario...");
        }
        
        if (action === 'sound') {
            const isMuted = SoundManager.toggleMute();
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = isMuted ? 'volume_off' : 'volume_up';
        }
        
        // Reproducir sonido de click para cualquier botón con acción
        SoundManager.playClick();
    });

    // Delegación de sonido para Hover (Mouseover)
    vistaPrincipalEl.addEventListener('mouseover', (e) => {
        const btn = e.target.closest('button, [data-action], a');
        if (btn && btn !== Lab.lastHoveredBtn) {
            Lab.lastHoveredBtn = btn;
            SoundManager.playHover();
        }
    });

    vistaPrincipalEl.addEventListener('mouseout', (e) => {
        const btn = e.target.closest('button, [data-action], a');
        if (btn && !btn.contains(e.relatedTarget)) {
            Lab.lastHoveredBtn = null;
        }
    });
    
    Lab.retroceso = new BotonRetroceso('retroceso-container');

    window.addEventListener('menu:paso', onPasoSeleccionado);
    window.addEventListener('menu:reset', onMenuReset);
    window.addEventListener('retroceso:click', onRetroceso);
    window.addEventListener('modal:ayuda:open', () => Lab.components.modalAyuda.open());
    window.addEventListener('modal:objetivos:open', () => Lab.components.modalObjetivos.open());
    window.addEventListener('modal:equipo:open', () => Lab.components.modalEquipo.open());
    window.addEventListener('v3d:mostrar_retroceso', () => Lab.retroceso?.mostrar());
    window.addEventListener('v3d:ocultar_retroceso',  () => Lab.retroceso?.ocultar());
    window.addEventListener('v3d:navegar', (e) => onNavegacionInterna(e.detail?.id, e.detail?.skipAudio, e.detail?.useGlobalHighlight));
    window.addEventListener('v3d:playAudio', (e) => Lab.engine.playStepAudio(e.detail.id));

    // Sincronizar idioma con el iframe y los componentes
    window.addEventListener('lang:change', (e) => {
        const lang = e.detail?.lang || 'es';
        
        // 1. Actualizar clases en el body para componentes CSS-driven (como ModalAyuda)
        document.body.classList.remove('lang-es', 'lang-en');
        document.body.classList.add(`lang-${lang}`);

        // 2. Notificar a los componentes JS-driven
        Object.values(Lab.components).forEach(c => {
            if (c && typeof c.setLanguage === 'function') c.setLanguage(lang);
        });

        // 3b. Actualizar idioma en el AudioManager (para Puter TTS)
        if (Lab.engine?.audio) Lab.engine.audio.setLanguage(lang);

        // 3. Iframe (Verge3D)
        const iframe = document.getElementById('v3d-container');
        if (!iframe || !iframe.contentDocument) return;
        const iframeBody = iframe.contentDocument.body;
        if (!iframeBody) return;
        iframeBody.classList.remove('lang-es', 'lang-en');
        iframeBody.classList.add(`lang-${lang}`);
    });

    // Cargamos la base de datos de activos (meshes)
    let allMeshes = [];
    try {
        const assetsResp = await fetch('./assets_db.json');
        const assetsData = await assetsResp.json();
        allMeshes = assetsData.meshes || [];
    } catch (e) {
        console.warn('[Lab] No se pudo cargar assets_db.json, el resaltado global fallará.');
    }

    // Inicializamos el motor 3D
    Lab.engine = new V3DEngine('v3d-container', config.themeColor, allMeshes);
    
    // Esperamos a que el motor esté listo
    Lab.engine.waitForReady().then(() => {
        // Actualizar el elemento oculto que el MutationObserver del Preloader observa
        const pctEl = document.getElementById('loading_percentage');
        if (pctEl) pctEl.innerHTML = '100%';

        // Forzar habilitación del botón (por si el observer no lo detectó)
        preloader.setProgress(100);

        onVerge3DReady();
    });
}

function onVerge3DReady() {
    Lab.v3dReady = true;
    if (Lab.config.camaraZoomMax !== undefined) {
        Lab.engine.camera.setCameraLimits({ maxDistance: Lab.config.camaraZoomMax });
    }
    Lab.engine.ejecutarInicioEstado(Lab.config.inicioEstado);
    SoundManager.playMenuOpen();

    // Inicializar controles de Sala y Snapshot en el topbar
    Lab.realtimeControls = new RealtimeControls({ lang: Lab.config.defaultLang || 'es' });

    // Exponer el laboratorio para uso desde consola (presentador, debugging)
    window.Lab = Lab;
}

/**
 * Busca un nodo en el árbol del menú y aplica Auto-Forward si solo tiene un hijo
 */
function obtenerNodoFinal(id) {
    // Desactivamos el Auto-Forward para que se ejecuten los pasos intermedios
    // y sus configuraciones de audio/visibilidad.
    return id;
}

function buscarNodoRecursivo(menu, id) {
    if (!menu || !id) return null;
    for (const item of menu) {
        if (item.id === id) return item;
        if (item.children) {
            const found = buscarNodoRecursivo(item.children, id);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Ejecuta un paso utilizando la nueva arquitectura modular
 * @param {string} pasoId
 * @param {boolean} skipAudio - Si es true, no reproducirá la locución (útil en retroceso)
 */
function ejecutarPaso(pasoId, skipAudio = false, useGlobalHighlight = false) {
    console.log(`[Lab] → Ejecutando paso: ${pasoId}`, useGlobalHighlight ? '(Global Highlight)' : '');
    const pasoConfig = buscarNodoRecursivo(Lab.config.menu, pasoId);
    if (!pasoConfig) {
        console.error(`[Lab] No se encontró configuración para el paso: ${pasoId}`);
        return;
    }
    console.log(`[Lab] Configuración cargada:`, pasoConfig);

    Lab.engine.resetScene(Lab.config.inicioEstado);
    
    // Reproducir audio del paso si no se indica lo contrario
    if (!skipAudio) {
        Lab.engine.playStepAudio(pasoConfig);
    } else {
        if (Lab.engine.audio) Lab.engine.audio.stop();
    }

    // 1. Visibilidad y Resaltado
    // Empezamos con todo visible para que cada paso sea independiente
    Lab.engine.visibility.showEverything();
    
    // Aplicamos los ocultos específicos de este paso
    if (pasoConfig.objetos_ocultar && Array.isArray(pasoConfig.objetos_ocultar)) {
        Lab.engine.visibility.hideAll(pasoConfig.objetos_ocultar);
    }
    
    // Si el paso explícitamente pide mostrar algo (por si acaso)
    if (pasoConfig.objetos_mostrar && Array.isArray(pasoConfig.objetos_mostrar)) {
        Lab.engine.visibility.showAll(pasoConfig.objetos_mostrar);
    }
    
    // 1. Efecto Visual
    Lab.engine._restoreOriginalMaterials(); // Limpiamos efecto glass previo
    Lab.engine.highlights.disable(); // Limpiamos resaltados previos
    
    if (useGlobalHighlight) {
        // Efecto Cristal para navegación desde etiquetas (sin panel de debug)
        // Los objetos a resaltar de la etiqueta mantienen su material original
        // objetos_cristal (config global) siempre quedan excluidos del efecto
        const objetosProtegidos = [
            ...(pasoConfig.objeto_resaltar || []),
            ...(Lab.config.objetos_cristal || [])
        ];
        Lab.engine._applyGlassEffect({
            color: '#949494',
            opacity: 0.55,
            roughness: 0.05,
            thickness: 2,
            transmission: 1
        }, false, objetosProtegidos);
        Lab.engine.currentStepSelection = Lab.engine.allMeshes;
    } else {
        Lab.engine.currentStepSelection = pasoConfig.objeto_resaltar || [];
        if (Lab.engine.currentStepSelection.length) {
            Lab.engine.highlights.enable(Lab.engine.currentStepSelection, true, '#cccccc');
        }
    }

    // 2. Cámara
    if (pasoConfig.camara) {
        Lab.engine.camera.tween(pasoConfig.camara, pasoConfig.camaraDireccion, 1.2);
    }

    // 3. Animaciones
    if (pasoConfig.detener_animaciones) {
        Lab.engine.animations.stop('ALL_OBJECTS');
    }

    if (pasoConfig.animaciones && Array.isArray(pasoConfig.animaciones)) {
        pasoConfig.animaciones.forEach(anim => {
            const start = Array.isArray(anim.frame) ? anim.frame[0] : (anim.frame || 0);
            const end   = Array.isArray(anim.frame) ? anim.frame[1] : (anim.frame || 0);
            const mode  = anim.modo || 'LoopOnce';
            
            Lab.engine.animations.play(anim.nombre, start, end, mode);
        });
    }

    // 4. Clipping / Rayos X
    if (pasoId === 'paso5' || pasoId === 'paso4') {
        // Parámetros solicitados por el usuario (según imagen)
        const pos = { x: 0, y: -6000, z: 0 };
        const norm = { x: 0, y: 0, z: -1 };
        Lab.engine._enableXRay(pos, norm);
    } else {
        // Desactivar clipping para los demás pasos
        if (Lab.engine.clipping) Lab.engine.clipping.disable();
    }

    // 5. Navegación Jerárquica y Etiquetas
    const hijos = pasoConfig.children && pasoConfig.children.length > 0;
    if (hijos) {
        pasoConfig.children.forEach(child => {
            if (child.etiqueta && child.flecha) {
                Lab.engine.annotations.createLabel(child, true, Lab.engine.currentStepSelection, Lab.engine.currentGlobalSelection);
            }
        });
    } else if (pasoConfig.etiqueta && pasoConfig.flecha) {
        Lab.engine.annotations.createLabel(pasoConfig, false, Lab.engine.currentStepSelection, Lab.engine.currentGlobalSelection);
    }

    // Guardar paso actual para el sistema de colaboración
    window.Lab.currentPasoId = pasoId;
    window.Lab.currentPasoHighlight = useGlobalHighlight;

    // Notificar al sistema de sincronización (presenter)
    window.dispatchEvent(new CustomEvent('lab:paso_ejecutado', {
        detail: { pasoId, useGlobalHighlight }
    }));
}

function onNavegacionInterna(id, skipAudio = false, useGlobalHighlight = false) {
    if (!id || !Lab.v3dReady) return;
    
    const idFinal = obtenerNodoFinal(id);
    
    if (Lab.historial[Lab.historial.length - 1] !== idFinal) {
        Lab.historial.push(idFinal);
    }
    
    ejecutarPaso(idFinal, skipAudio, useGlobalHighlight);
    if (Lab.historial.length > 0) Lab.retroceso?.mostrar();
}

function onPasoSeleccionado(e) {
    const paso = e.detail?.paso;
    if (!paso || !Lab.v3dReady) return;

    const idFinal = obtenerNodoFinal(paso.id);
    Lab.historial = [idFinal];
    
    ejecutarPaso(idFinal);
    Lab.retroceso?.ocultar(); 
}

function onMenuReset() {
    if (!Lab.v3dReady) return;
    
    Lab.historial = [];
    Lab.retroceso?.ocultar();
    
    Lab.engine._restoreOriginalMaterials(); // Restaurar materiales originales
    Lab.engine.resetScene(Lab.config.inicioEstado);
    Lab.engine.ejecutarInicioEstado(Lab.config.inicioEstado, 1.2);
    
    if (Lab.engine.audio) Lab.engine.audio.stop();
    
    // Limpiar paso actual
    window.Lab.currentPasoId = null;
    window.Lab.currentPasoHighlight = false;

    // Notificar al sistema de sincronización (presenter)
    window.dispatchEvent(new CustomEvent('lab:reset'));
    
    console.log('[Lab] → Reset: Cámara a Inicio');
}

function onRetroceso() {
    if (Lab.historial.length <= 1) {
        onMenuReset();
        return;
    }
    
    Lab.historial.pop();
    const idAnterior = Lab.historial[Lab.historial.length - 1];
    
    if (Lab.engine.audio) Lab.engine.audio.stop();
    Lab.engine._restoreOriginalMaterials(); // Restaurar materiales al retroceder
    
    ejecutarPaso(idAnterior, true);
    
    if (Lab.historial.length <= 1) {
        Lab.retroceso?.ocultar();
    }
}

init();
