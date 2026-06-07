/**
 * ModalEquipo - Componente que representa el modal de información técnica del equipo.
 */
export class ModalEquipo {
    constructor(containerId, data = {}) {
        this.container = document.getElementById(containerId);
        this.data = {
            name: data.name || 'AeroCore Turbofan A-12',
            type: data.type || 'Alta Presión',
            manufacturer: data.manufacturer || 'AeroCore Ind.',
            fuel: data.fuel || '15,000 lbs',
            status: data.status || 'ACTIVO',
            lastInspection: data.lastInspection || '12/2026',
            nextService: data.nextService || '12/2027',
            wear: data.wear || '14%'
        };
        this.options = { lang: 'es' };
        if (this.container) this.render();
    }

    setLanguage(lang) {
        this.options.lang = lang;
        if (this.container) {
            const isVisible = this.container.querySelector('.ModalEquipo-root')?.classList.contains('visible');
            this.render();
            if (isVisible) this.container.querySelector('.ModalEquipo-root').classList.add('visible');
        }
    }

    open() {
        if (this.container) {
            this.container.style.display = 'block';
            requestAnimationFrame(() => {
                const modal = this.container.querySelector('.ModalEquipo-root');
                if (modal) modal.classList.add('visible');
            });
        }
    }

    close() {
        const modal = this.container.querySelector('.ModalEquipo-root');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (this.container) this.container.style.display = 'none';
            }, 300);
        }
    }

    render() {
        const lang = this.options.lang;
        const t = {
            es: { 
                title: 'Información del Equipo', 
                subtitle: 'Especificaciones Técnicas y Estado Operativo',
                motor: 'Motor', tipo: 'Tipo', fabricante: 'Fabricante', combustible: 'Combustible', estado: 'Estado',
                mantenimiento: 'Mantenimiento e Historial', ultima: 'Última Inspección', proxima: 'Próximo Servicio', 
                componentes: 'Estado de Componentes', ok: 'Todo en rango', desgaste: 'Desgaste', ficha: 'Ver Ficha Técnica Completa'
            },
            en: { 
                title: 'Equipment Information', 
                subtitle: 'Technical Specifications and Operational Status',
                motor: 'Engine', tipo: 'Type', fabricante: 'Manufacturer', combustible: 'Fuel', estado: 'Status',
                mantenimiento: 'Maintenance & History', ultima: 'Last Inspection', proxima: 'Next Service', 
                componentes: 'Component Status', ok: 'All in range', desgaste: 'Wear', ficha: 'View Full Data Sheet'
            }
        }[lang] || {};

        this.container.innerHTML = `
            <div class="ModalEquipo-root dark fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 opacity-0 pointer-events-none transition-opacity duration-300">
                <!-- Backdrop Blur -->
                <div class="absolute inset-0 bg-white/10 backdrop-blur-md"></div>

                <div class="ModalEquipo-glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500 z-10"
                     style="background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(255, 255, 255, 0.5); backdrop-filter: blur(25px);">
                    
                    <!-- Close Button -->
                    <button class="ModalEquipo-close absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-[#1a1c1e] hover:text-black transition-colors z-20">
                        <span class="material-symbols-outlined text-2xl">close</span>
                    </button>

                    <!-- Header -->
                    <div class="p-8 pb-4">
                        <h2 class="text-primary font-display text-2xl md:text-3xl font-bold tracking-[0.15em] mb-1 uppercase">${t.title}</h2>
                        <p class="text-xs md:text-sm text-[#1a1c1e]/70 font-normal tracking-wide">${t.subtitle}</p>
                    </div>

                    <!-- Content -->
                    <div class="p-6 md:p-8 pt-2 md:pt-4 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 overflow-y-auto ModalEquipo-custom-scrollbar transition-all">
                        <!-- Left Section -->
                        <div class="space-y-6">
                            ${this.renderDataField(t.motor, this.data.name)}
                            ${this.renderDataField(t.tipo, this.data.type)}
                            ${this.renderDataField(t.fabricante, this.data.manufacturer)}
                            ${this.renderDataField(t.combustible, this.data.fuel)}
                            
                            <div class="flex items-center gap-3 pt-2">
                                <span class="text-[10px] uppercase tracking-[0.2em] font-bold" style="color: var(--color-primary); opacity: 0.65;">${t.estado}</span>
                                <span class="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold border border-green-500/20">
                                    <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    ${this.data.status}
                                </span>
                            </div>
                        </div>
                        <!-- Right Section (Maintenance/History) -->
                        <div class="bg-black/5 rounded-2xl p-5 md:p-6 border border-black/5 space-y-6">
                            <h3 class="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-4 border-b border-black/5 pb-2">
                                ${t.mantenimiento}</h3>
                            <div class="space-y-4">
                                ${this.renderHistoryItem(t.ultima, this.data.lastInspection)}
                                ${this.renderHistoryItem(t.proxima, this.data.nextService)}
                                ${this.renderHistoryItem(t.componentes, t.ok, 'text-green-600')}
                            </div>
                            <!-- Symbolic Bar Chart -->
                            <div class="pt-4">
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-[10px] uppercase tracking-wider text-[#1a1c1e]/50 font-bold">${t.desgaste}</span>
                                    <span class="text-xs text-[#1a1c1e]/80 font-bold">${this.data.wear}</span>
                                </div>
                                <div class="flex items-end gap-1.5 h-16">
                                    <div class="w-full h-[20%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[35%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[25%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[45%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[30%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[15%] rounded-t-sm" style="background-color: var(--color-primary); box-shadow: 0 0 10px var(--glow-primary);"></div>
                                    <div class="w-full h-[20%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                    <div class="w-full h-[40%] rounded-t-sm" style="background-color: rgba(var(--color-primary-rgb), 0.3);"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Footer / Bottom Section -->
                    <div class="p-4 md:p-8 pt-0 md:pt-4 flex justify-center flex-shrink-0">
                        <button class="w-full px-6 py-3 md:py-4 bg-primary text-on-primary font-bold rounded-full hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg text-sm md:text-base uppercase tracking-wider group">
                            <span class="text-center">${t.ficha}</span>
                            <span class="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
            <style>
                .ModalEquipo-root.visible {
                    opacity: 1;
                    pointer-events: auto;
                }
                .ModalEquipo-custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .ModalEquipo-custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .ModalEquipo-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--color-primary-rgb), 0.2);
                    border-radius: 10px;
                }
            </style>
        `;

        // Event Listeners
        const closeBtn = this.container.querySelector('.ModalEquipo-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        const root = this.container.querySelector('.ModalEquipo-root');
        if (root) {
            root.addEventListener('click', (e) => {
                if (e.target === root) this.close();
            });
        }
    }

    renderDataField(label, value) {
        return `
            <div class="space-y-1">
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold" style="color: var(--color-primary); opacity: 0.65;">${label}</span>
                <p class="text-[#1a1c1e] text-lg font-medium">${value}</p>
            </div>
        `;
    }

    renderHistoryItem(label, value, colorClass = 'text-[#1a1c1e]') {
        return `
            <div class="flex justify-between items-center text-sm">
                <span class="text-[#1a1c1e]/60 font-medium">${label}</span>
                <span class="${colorClass} font-bold">${value}</span>
            </div>
        `;
    }
}
