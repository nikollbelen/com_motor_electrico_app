/**
 * Preloader - Componente de pantalla de carga con diseño refinado y centrado en UX.
 * Compatible con el formato del app (labNameES, labNameEN, logoUrl)
 * y con el formato de Storybook (title, subtitle, progress).
 */
export class Preloader {
    constructor(containerId, data = {}) {
        this.container = document.getElementById(containerId);

        // Soporte dual: formato app { labNameES, labNameEN, logoUrl } y formato Storybook { title, progress }
        const isAppFormat = 'labNameES' in data;
        this._isAppMode   = isAppFormat;
        this._ready       = !isAppFormat; // En modo app, el botón empieza deshabilitado

        this.data = {
            progress: isAppFormat ? 0 : (data.progress || 84),
            title:    data.labNameES || data.title || 'AetherLab',
            titleEN:  data.labNameEN || data.title || 'AetherLab',
            subtitle: data.subtitle  || 'ADVANCED SIMULATION SYSTEM',
            logoUrl:  data.logoUrl   || null,
        };

        if (this.container) {
            this.render();
            if (isAppFormat) this._watchLoadingPercentage();
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="Preloader-root dark font-body-md text-on-surface overflow-hidden fixed inset-0 z-[9999] w-full h-full">
                
                <!-- DESKTOP DESIGN -->
                <div id="desktop-preloader" class="hidden md:flex flex-col items-center justify-center h-screen w-screen relative bg-surface overflow-hidden">
                    <div class="absolute inset-0 opacity-20">
                        <img class="w-full h-full object-cover grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrJLtDestle6j7gQABSOrfrLsLD4Iteormner_v79jqXIyJo3vu1uoTb9AI0i6AqObu96PKiLhAgo9QsVKpdGVj418_GA5hZMqm_rIi9QShiDqT_tA7XLIHc6jpjF0a9DQ4-9GYHC5atZRRvpvEPcdNT3aRK7XcgkRAAMT5nymf1OmTYj4RmlRDgDdlQxdtLYcs_G33wHCuxBltK5evochnTjp0Lv9tn7dMRkORquKjY_E5VtubcI5h4W5P1pHcN_Rd7sReWgY9LLG"/>
                    </div>

                    <div class="absolute inset-0 pointer-events-none">
                        <div class="Preloader-background-blobs absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full" style="background-color: rgba(var(--color-primary-rgb), 0.1);"></div>
                        <div class="Preloader-background-blobs absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary-container/20"></div>
                        <div class="Preloader-background-blobs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-primary-container/5"></div>
                    </div>

                    <header class="absolute top-0 w-full px-margin-lg py-6 flex justify-between items-center opacity-30 z-20">
                        <div class="font-headline-lg text-primary-light tracking-tighter">${this.data.title}</div>
                        <div class="flex gap-4">
                            <div class="w-8 h-8 rounded-full Preloader-glass-panel"></div>
                            <div class="w-8 h-8 rounded-full Preloader-glass-panel"></div>
                        </div>
                    </header>

                    <main class="relative z-10 flex flex-col items-center max-w-md w-full px-container-padding">
                        <div class="mb-12 flex flex-col items-center text-center">
                            <div class="Preloader-glass-panel w-20 h-20 rounded-full flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-primary-light text-[40px]" style="font-variation-settings: 'FILL' 1;">science</span>
                            </div>
                            <h1 class="font-headline-lg text-headline-lg text-primary-light tracking-tighter mb-2">${this.data.title}</h1>
                            <p class="text-on-surface-variant font-label-sm text-label-sm tracking-widest">${this.data.subtitle}</p>
                        </div>
                        <div class="w-full flex flex-col items-center">
                            <!-- Contenedor de altura fija: crossfade sin layout shift -->
                            <div class="Preloader-swap-container w-full" style="position: relative; min-height: 80px;">
                                <!-- Botón (absoluto, centrado, oculto en app mode) -->
                                <div data-preloader-btn-wrap class="Preloader-swap-layer" style="opacity: ${this._isAppMode ? '0' : '1'}; pointer-events: ${this._isAppMode ? 'none' : 'auto'};">
                                    <button data-preloader-btn
                                        class="Preloader-royal-gradient text-white font-headline-lg-mobile text-headline-lg-mobile px-12 py-5 rounded-full Preloader-primary-glow Preloader-inner-glow transition-all active:scale-95 hover:brightness-110">
                                        INICIAR EXPERIENCIA
                                    </button>
                                </div>
                                <!-- Barra de progreso (absoluta, centrada, visible en app mode) -->
                                <div data-preloader-loading class="Preloader-swap-layer" style="opacity: ${this._isAppMode ? '1' : '0'}; pointer-events: ${this._isAppMode ? 'auto' : 'none'};">
                                    <div class="w-full max-w-sm space-y-4">
                                        <div class="flex justify-between items-end">
                                            <span class="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest text-[11px]">Iniciando Núcleo...</span>
                                            <span data-preloader-pct class="text-primary-light font-headline-lg-mobile text-headline-lg-mobile font-bold">${this.data.progress}%</span>
                                        </div>
                                        <div class="h-1 w-full bg-on-surface/5 rounded-full overflow-hidden">
                                            <div data-preloader-bar class="h-full bg-primary rounded-full shadow-[0_0_15px_var(--glow-primary-strong)]" style="width: ${this.data.progress}%; transition: width 0.4s ease;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-20 grid grid-cols-3 gap-6 w-full">
                            ${this.renderCard('3d_rotation', '3D Engine')}
                            ${this.renderCard('memory', 'Neural Link', true)}
                            ${this.renderCard('security', 'Secure')}
                        </div>
                    </main>
                </div>

                <!-- MOBILE DESIGN -->
                <div id="mobile-preloader" class="flex md:hidden flex-col items-center justify-between h-full w-full relative overflow-hidden Preloader-mesh-gradient">
                    <div class="absolute inset-0 z-0 pointer-events-none">
                        <div class="absolute top-[-10%] right-[-20%] w-[150%] h-[150%] opacity-40">
                            <img alt="" class="w-full h-full object-cover mix-blend-screen rotate-12" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXukgie107Xo1akjIuLFldQG8AFC164G7OcDwlLU506PHRV2vOjvJ_CQV92PWRx31iCVouatMkLS8j-JG4SbPXBJ-gbNnyNgYoFidvFiB2bvFUPM2lSOlfsR-heu1F1RqSBFNnx0_yvvmLUh6SydVR5T8zvl9Jhx145SX-A0KEErWfWjMw3Po9TS97IvLeY3IOJzzrzWQ8plxUM-huNTzqywgXaiEyieN-4gLO5f-vYZN4MyGfY17xesRLtyFr3PwNPOaMNwL30cnm"/>
                        </div>
                    </div>

                    <main class="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-6 gap-8 pt-10">
                        <div class="flex flex-col items-center text-center space-y-5">
                            <div class="Preloader-glass-panel w-20 h-20 rounded-full flex items-center justify-center Preloader-inner-glow">
                                <span class="material-symbols-outlined text-primary-light text-4xl" style="font-variation-settings: 'FILL' 1;">science</span>
                            </div>
                            <div class="space-y-1">
                                <h1 class="font-display text-4xl text-primary-light tracking-tighter">${this.data.title}</h1>
                                <p class="text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">${this.data.subtitle}</p>
                            </div>
                            <div class="w-full pt-6 flex flex-col items-center">
                                <!-- Contenedor de altura fija: crossfade sin layout shift -->
                                <div class="Preloader-swap-container w-full max-w-[280px]" style="position: relative; min-height: 60px;">
                                    <!-- Botón (absoluto, centrado, oculto en app mode) -->
                                    <div data-preloader-btn-wrap class="Preloader-swap-layer" style="opacity: ${this._isAppMode ? '0' : '1'}; pointer-events: ${this._isAppMode ? 'none' : 'auto'};">
                                        <button data-preloader-btn
                                            class="w-full py-4 rounded-full Preloader-royal-gradient text-white font-bold tracking-widest Preloader-primary-glow flex items-center justify-center Preloader-inner-glow active:scale-95 transition-all text-sm uppercase">
                                            INICIAR EXPERIENCIA
                                        </button>
                                    </div>
                                    <!-- Barra de progreso (absoluta, centrada, visible en app mode) -->
                                    <div data-preloader-loading class="Preloader-swap-layer" style="opacity: ${this._isAppMode ? '1' : '0'}; pointer-events: ${this._isAppMode ? 'auto' : 'none'};">
                                        <div class="w-full space-y-3">
                                            <div class="flex justify-between items-end">
                                                <span class="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">INICIANDO NÚCLEO...</span>
                                                <span data-preloader-pct class="text-primary-light font-bold text-sm">${this.data.progress}%</span>
                                            </div>
                                            <div class="h-1.5 w-full bg-on-surface/5 rounded-full overflow-hidden border border-on-surface/10">
                                                <div data-preloader-bar class="h-full bg-primary rounded-full Preloader-progress-shimmer shadow-[0_0_20px_var(--color-primary)]" style="width: ${this.data.progress}%; transition: width 0.4s ease;"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer class="relative z-10 w-full px-6 pb-10">
                        <div class="grid grid-cols-3 gap-3">
                            ${this.renderCard('3d_rotation', '3D Engine')}
                            ${this.renderCard('memory', 'Neural Link', true)}
                            ${this.renderCard('security', 'Secure')}
                        </div>
                    </footer>

                    <div class="absolute top-1/4 -left-20 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style="background-color: var(--color-primary); opacity: 0.2;"></div>
                    <div class="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style="background-color: var(--color-primary-container); opacity: 0.15;"></div>
                </div>
            </div>
            
            <style>
                /* Crossfade layer: ambos hijos ocupan el mismo espacio */
                .Preloader-swap-layer {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.6s ease;
                }
                .Preloader-glass-panel {
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }
                .Preloader-inner-glow {
                    box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
                }
                .Preloader-royal-gradient {
                    background: var(--gradient-primary);
                }
                .Preloader-background-blobs {
                    filter: blur(80px);
                    z-index: -1;
                }
                .Preloader-primary-glow {
                    box-shadow:
                        0 0 0 1px rgba(var(--color-primary-rgb), 0.3),
                        0 8px 20px rgba(var(--color-primary-rgb), 0.5),
                        0 20px 50px rgba(var(--color-primary-rgb), 0.35),
                        0 0 60px rgba(var(--color-primary-rgb), 0.2);
                    animation: Preloader-pulse-glow 2.5s ease-in-out infinite;
                }
                @keyframes Preloader-pulse-glow {
                    0%, 100% {
                        box-shadow:
                            0 0 0 1px rgba(var(--color-primary-rgb), 0.3),
                            0 8px 20px rgba(var(--color-primary-rgb), 0.5),
                            0 20px 50px rgba(var(--color-primary-rgb), 0.35),
                            0 0 60px rgba(var(--color-primary-rgb), 0.2);
                    }
                    50% {
                        box-shadow:
                            0 0 0 1px rgba(var(--color-primary-rgb), 0.5),
                            0 8px 30px rgba(var(--color-primary-rgb), 0.7),
                            0 20px 70px rgba(var(--color-primary-rgb), 0.5),
                            0 0 90px rgba(var(--color-primary-rgb), 0.35);
                    }
                }
                .Preloader-mesh-gradient {
                    background: radial-gradient(at 0% 0%, var(--color-primary-container) 0%, transparent 50%),
                                radial-gradient(at 100% 100%, var(--color-primary-container) 0%, transparent 50%),
                                radial-gradient(at 50% 50%, var(--color-surface) 0%, #0b1326 100%);
                }
                .Preloader-progress-shimmer {
                    background: linear-gradient(90deg, var(--color-primary), #ffffff, var(--color-primary));
                    background-size: 200% 100%;
                    animation: Preloader-shimmer 2s infinite linear;
                }
                @keyframes Preloader-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
        `;
    }

    renderCard(icon, label, isFill = false) {
        const fillStyle = isFill ? "font-variation-settings: 'FILL' 1;" : "";
        return `
            <div class="Preloader-glass-panel rounded-2xl p-3 flex flex-col items-center justify-center gap-2 Preloader-inner-glow text-center">
                <span class="material-symbols-outlined text-primary-light text-xl" style="${fillStyle}">${icon}</span>
                <span class="text-[9px] md:text-[10px] font-bold text-primary-light uppercase tracking-tighter leading-tight">
                    ${label}
                </span>
            </div>
        `;
    }

    /* ===== API pública para el modo app ===== */

    /** Actualiza la barra de progreso. Cuando llega a 100, habilita el botón. */
    setProgress(percent) {
        const val = Math.round(Math.min(100, Math.max(0, percent)));
        this.data.progress = val;

        // Actualizar barras en ambas vistas
        this.container.querySelectorAll('[data-preloader-bar]').forEach(bar => {
            bar.style.width = `${val}%`;
        });
        // Actualizar contadores
        this.container.querySelectorAll('[data-preloader-pct]').forEach(el => {
            el.textContent = `${val}%`;
        });

        if (val >= 100) this.enable();
    }

    /** Habilita el botón "INICIAR EXPERIENCIA" cuando V3D está listo.
     *  Crossfade simultáneo: la barra se desvanece mientras el botón aparece.
     *  Ambos están en position:absolute → cero layout shift. */
    enable() {
        if (this._ready) return;
        this._ready = true;

        // Crossfade simultáneo: barra sale, botón entra
        this.container.querySelectorAll('[data-preloader-loading]').forEach(el => {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        });
        this.container.querySelectorAll('[data-preloader-btn-wrap]').forEach(wrap => {
            wrap.style.opacity = '1';
            wrap.style.pointerEvents = 'auto';
        });
    }

    /** Oculta el preloader con una transición suave. */
    hide() {
        const root = this.container.querySelector('.Preloader-root');
        if (!root) {
            this.container.style.transition = 'opacity 0.7s ease';
            this.container.style.opacity    = '0';
            setTimeout(() => { this.container.style.display = 'none'; }, 750);
            return;
        }
        root.style.transition = 'opacity 0.7s ease';
        root.style.opacity    = '0';
        setTimeout(() => { this.container.style.display = 'none'; }, 750);
    }

    /**
     * Observa el elemento oculto #loading_percentage que Verge3D actualiza
     * durante la carga del modelo 3D, y sincroniza la barra de progreso.
     */
    _watchLoadingPercentage() {
        const el = document.getElementById('loading_percentage');
        if (!el) return;

        const parse = (text) => parseFloat(text) || 0;
        this.setProgress(parse(el.textContent));

        const observer = new MutationObserver(() => {
            const val = parse(el.textContent);
            this.setProgress(val);
        });
        observer.observe(el, { childList: true, characterData: true, subtree: true });
    }
}
