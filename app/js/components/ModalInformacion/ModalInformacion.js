/**
 * ModalInformacion - Componente que representa el panel lateral de información técnica.
 */
export class ModalInformacion {
    constructor(containerId, data = {}) {
        this.container = document.getElementById(containerId);
        this.data = {
            title: data.title || 'Inyector de Combustible de Alta Presión',
            content: data.content || 'El inyector de alta precisión gestiona la atomización del combustible en la cámara de combustión...',
            status: data.status || 'Estado de Mantenimiento: Óptimo'
        };
        if (this.container) this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="ModalInformacion-root dark bg-surface text-on-surface relative">
                <!-- Main 3D Canvas Mockup Background (Optional context) -->
                <div class="fixed inset-0 z-0 pointer-events-none">
                    <img alt="Industrial Engine" class="w-full h-full object-cover grayscale opacity-40 contrast-125"
                        src="/images/fondo_ejemplo.png" />
                </div>

                <!-- Information Pop-up -->
                <div class="fixed inset-0 md:right-8 md:left-auto md:top-1/2 md:-translate-y-1/2 md:inset-y-auto w-full h-full md:w-[400px] md:h-auto md:max-h-[600px] ModalInformacion-glass-panel p-8 md:p-6 rounded-none md:rounded-xl shadow-2xl pointer-events-auto transition-all flex flex-col z-50" style="border-left: 4px solid var(--color-primary) !important;">
                    
                    <!-- Close Button Row (Mobile Only) -->
                    <div class="flex md:hidden justify-end mb-2">
                        <button class="w-8 h-8 rounded-full bg-white text-on-primary flex items-center justify-center transition-all shadow-lg active:scale-90">
                            <span class="material-symbols-outlined text-[18px] font-bold" style="font-variation-settings: 'wght' 700; color: var(--color-surface);">close</span>
                        </button>
                    </div>

                    <!-- Title & Play Row -->
                    <div class="flex items-start gap-4 mb-6 shrink-0">
                        <button class="shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 transition-all" style="box-shadow: 0 4px 15px var(--glow-primary);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                        </button>
                        <h4 class="flex-1 text-primary font-bold text-sm md:text-base uppercase tracking-widest leading-tight break-words">
                            ${this.data.title}
                        </h4>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="flex-1 overflow-y-auto pr-2 mb-6 ModalInformacion-custom-scrollbar">
                        <p class="text-on-surface-variant text-sm leading-relaxed">
                            ${this.data.content}
                        </p>
                    </div>

                    <!-- Fixed Footer -->
                    <div class="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold shrink-0 pt-4 border-t border-white/5" style="color: var(--color-primary); opacity: 0.85;">
                        <span class="material-symbols-outlined text-sm">settings_suggest</span>
                        ${this.data.status}
                    </div>
                </div>
            </div>
            
            <style>
                .ModalInformacion-glass-panel {
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-left: none !important;
                }

                .ModalInformacion-root .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }

                .ModalInformacion-custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }

                .ModalInformacion-custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }

                .ModalInformacion-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 85, 255, 0.3);
                    border-radius: 10px;
                }

                .ModalInformacion-custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 85, 255, 0.5);
                }
            </style>
        `;
    }
}
