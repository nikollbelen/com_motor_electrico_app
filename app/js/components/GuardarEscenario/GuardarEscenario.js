/**
 * GuardarEscenario - Componente que representa el modal para guardar la configuración actual de la escena.
 */
export class GuardarEscenario {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="GuardarEscenario-root dark bg-surface text-on-surface fixed inset-0 z-[60] flex items-center justify-center bg-surface/20 p-4">
                <!-- Background Context Mockup -->
                <div class="fixed inset-0 z-0 pointer-events-none">
                    <img alt="Industrial Engine" class="w-full h-full object-cover grayscale opacity-30 contrast-125"
                        src="/images/fondo_ejemplo.png" />
                </div>

                <div class="GuardarEscenario-glass-panel w-full max-w-[400px] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500 z-10">
                    
                    <!-- Close Button -->
                    <button class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>

                    <!-- Header -->
                    <div class="p-6 pb-2">
                        <h2 class="text-primary font-display text-xl md:text-2xl font-bold tracking-tight mb-1 uppercase">Guardar Vista</h2>
                        <p class="font-medium text-xs" style="color: var(--color-on-surface-variant); opacity: 0.7;">Configuración de Escena y Cámara</p>
                    </div>

                    <!-- Content -->
                    <div class="p-6 pt-2 space-y-5">
                        <p class="text-on-surface-variant text-sm leading-relaxed">
                            ¿Deseas guardar la configuración actual? Se registrará la <span class="text-primary font-medium">posición de la cámara</span> y el <span class="text-primary font-medium">zoom</span>.
                        </p>

                        <div class="space-y-2">
                            <label for="ge-view-name" class="text-[10px] uppercase tracking-[0.2em] font-bold ml-1" style="color: var(--color-primary); opacity: 0.75;">
                                Nombre de la vista
                            </label>
                            <input 
                                type="text" 
                                id="ge-view-name" 
                                placeholder="Ej: Inspección de Turbina" 
                                class="GuardarEscenario-input-glass w-full px-5 py-3 rounded-xl text-white placeholder:text-on-surface-variant/40 focus:ring-0 text-sm"
                            />
                        </div>

                        <div class="rounded-xl p-3 flex items-start gap-3 relative" style="background-color: rgba(var(--color-primary-rgb), 0.08); border: 1px solid rgba(var(--color-primary-rgb), 0.18);">
                            <span class="material-symbols-outlined text-lg mt-0.5" style="color: var(--color-primary);">info</span>
                            <p class="text-[11px] text-on-surface-variant leading-snug">
                                Podrás acceder a esta vista posteriormente desde el panel de navegación rápida.
                            </p>
                        </div>
                    </div>

                    <!-- Footer / Actions -->
                    <div class="p-6 pt-2 pb-6 flex flex-col gap-2">
                        <button class="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg text-sm uppercase tracking-wider">
                            <span>Guardar Escenario</span>
                            <span class="material-symbols-outlined text-lg">save</span>
                        </button>
                        <button class="w-full py-2 hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em] font-bold" style="color: var(--color-on-surface-variant); opacity: 0.6;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                .GuardarEscenario-glass-panel {
                    backdrop-filter: blur(25px);
                    -webkit-backdrop-filter: blur(25px);
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .GuardarEscenario-root .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }

                .GuardarEscenario-input-glass {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: white !important;
                    transition: all 0.3s ease;
                }

                .GuardarEscenario-input-glass:focus {
                    background: var(--glow-primary) !important;
                    color: var(--color-primary) !important;
                    border-color: var(--glow-primary) !important;
                    box-shadow: 0 0 15px var(--glow-primary) !important;
                    outline: none !important;
                }

                .GuardarEscenario-input-glass::placeholder {
                    color: rgba(199, 196, 215, 0.4) !important;
                }
            </style>
        `;
    }
}
