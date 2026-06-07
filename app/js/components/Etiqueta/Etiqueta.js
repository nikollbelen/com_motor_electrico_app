/**
 * Etiqueta - Componente que representa un callout o etiqueta flotante en el espacio 3D.
 */
export class Etiqueta {
    constructor(containerId, data = {}) {
        this.container = document.getElementById(containerId);
        this.data = {
            title: data.title || 'Cylinder Head A-12',
            subtitle: data.subtitle || 'High-pressure combustion unit',
            status: data.status || 'Active • 450°C',
            top: data.top || '45%',
            left: data.left || '60%'
        };
        if (this.container) this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="Etiqueta-root dark bg-surface text-on-surface fixed inset-0 pointer-events-none z-30">
                <!-- Main 3D Canvas Mockup Background -->
                <div class="fixed inset-0 z-0">
                    <img alt="Industrial Engine" class="w-full h-full object-cover grayscale opacity-30 contrast-125"
                        src="/images/fondo_ejemplo.png" />
                </div>
                
                <!-- Central 3D Floating Label (Callout) -->
                <div class="fixed z-30 flex items-center pointer-events-auto" style="top: ${this.data.top}; left: ${this.data.left};">
                    <div class="relative">
                        <!-- Line to part -->
                        <div class="absolute -left-12 top-1/2 w-12 h-[1.5px] animate-pulse shadow-[0_0_15px_var(--glow-primary-strong)]" style="background-color: var(--color-primary); opacity: 0.85;"></div>
                        <!-- Pointer Container -->
                        <div class="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <!-- Background Glow Layer -->
                            <div class="absolute w-20 h-20 blur-2xl animate-pulse shadow-[0_0_50px_var(--glow-primary)] rounded-full" style="background-color: var(--color-primary); opacity: 0.2;"></div>
                            <!-- Small Core Circle -->
                            <div class="relative w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--glow-primary-strong)]"></div>
                        </div>
                        <!-- Label Card -->
                        <div style="border-color: var(--color-primary) !important;" class="Etiqueta-glass-panel p-2 md:p-5 rounded-full shadow-2xl border flex items-center gap-3 md:gap-6 min-w-0 md:min-w-[320px] pr-4 md:pr-5">
                            <button style="background-color: var(--color-primary) !important; box-shadow: 0 4px 15px var(--glow-primary);" class="w-8 h-8 md:w-14 md:h-14 shrink-0 rounded-full text-on-primary flex items-center justify-center hover:scale-105 transition-transform">
                                <span class="material-symbols-outlined text-xl md:text-3xl" data-icon="play_arrow"
                                    style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                            </button>
                            <div>
                                <h4 style="color: var(--color-primary) !important;" class="font-bold text-[10px] md:text-sm uppercase tracking-widest mb-0 md:mb-1">${this.data.title}</h4>
                                <p class="hidden md:block text-on-surface-variant text-xs font-medium">${this.data.subtitle}</p>
                                <div class="hidden md:flex gap-2 mt-2">
                                    <span style="color: var(--color-primary) !important; opacity: 0.7;" class="text-[10px] font-semibold uppercase">${this.data.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .Etiqueta-glass-panel {
                    backdrop-filter: blur(24px);
                    background: rgba(255, 255, 255, 0.03);
                    /* Border is handled by Tailwind classes for better theme integration */
                }

                .Etiqueta-root .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
                }
            </style>
        `;
    }
}
