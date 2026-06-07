/**
 * RayosX - Componente que representa los controles del modo Rayos X (deslizador de opacidad).
 */
export class RayosX {
    constructor(containerId, data = {}) {
        this.container = document.getElementById(containerId);
        this.data = {
            opacity: data.opacity || 50
        };
        if (this.container) {
            this.render();
            this.initEvents();
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="RayosX-root dark bg-surface text-on-surface fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px]">
                <div class="RayosX-glass-panel px-6 md:px-8 py-5 rounded-full flex items-center gap-4 md:gap-6 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full">
                    <span class="font-label-sm text-white/60 tracking-[0.2em] uppercase text-[10px]">Opacidad</span>
                    <div class="flex-1 relative flex items-center group">
                        <!-- Track background -->
                        <div class="h-1 w-full bg-white/10 rounded-full absolute"></div>
                        <!-- Progress bar -->
                        <div id="rx-slider-progress" class="h-1 bg-primary rounded-full absolute shadow-[0_0_10px_var(--glow-primary)] transition-all duration-75"
                            style="width: ${this.data.opacity}%;"></div>
                        <!-- Slider Thumb (Visual) -->
                        <div id="rx-slider-thumb"
                            class="w-5 h-5 rounded-full absolute -translate-x-1/2 pointer-events-none transition-all duration-75 group-hover:scale-110"
                            style="left: ${this.data.opacity}%; background-color: var(--color-primary); box-shadow: 0 0 12px var(--glow-primary-strong), 0 0 25px var(--glow-primary);"
                        >
                        </div>
                        <!-- Real Input (Invisible) -->
                        <input type="range" id="rx-opacity-slider" min="0" max="100" value="${this.data.opacity}" 
                            class="absolute w-full h-full opacity-0 cursor-pointer z-10">
                    </div>
                    <span id="rx-opacity-value" class="font-label-sm text-primary font-bold min-w-[40px]">${this.data.opacity}%</span>
                </div>
            </div>
            
            <style>
                .RayosX-glass-panel {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .RayosX-root .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
            </style>
        `;
    }

    initEvents() {
        const slider = this.container.querySelector('#rx-opacity-slider');
        const progress = this.container.querySelector('#rx-slider-progress');
        const thumb = this.container.querySelector('#rx-slider-thumb');
        const valueLabel = this.container.querySelector('#rx-opacity-value');

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                progress.style.width = `${val}%`;
                thumb.style.left = `${val}%`;
                thumb.style.backgroundColor = 'var(--color-primary)';
                thumb.style.boxShadow = '0 0 12px var(--glow-primary-strong), 0 0 25px var(--glow-primary)';
                valueLabel.textContent = `${val}%`;
                this.data.opacity = val;
            });
        }
    }
}
