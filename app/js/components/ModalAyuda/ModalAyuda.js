/**
 * ModalAyuda - Componente de instrucciones de navegación (Desktop & Mobile)
 * Siguiendo la línea gráfica Blue Core Reactor.
 */
export class ModalAyuda {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' 
            ? document.getElementById(containerId) 
            : containerId;
        this.options = { 
            lang: 'es',
            onClose: null,
            ...options 
        };
        if (this.container) this.render();
    }

    setLanguage(lang) {
        this.options.lang = lang;
        this.render();
    }

    render() {
        // Preservar el estado de visibilidad si ya existe
        const isVisible = this.container.querySelector('.ModalAyuda-root')?.classList.contains('visible');

        const lang = this.options.lang;
        const t = {
            es: {
                title: 'GUÍA DE NAVEGACIÓN',
                subtitle: 'Instrucciones para explorar el laboratorio',
                desktop: 'Escritorio (Mouse)',
                mobile: 'Móvil (Táctil)',
                close: 'Cerrar',
                navItems: {
                    desktop: [
                        { icon: 'mouse', text: 'Para rotar y desplazarse por las vistas del laboratorio utilice el botón izquierdo del mouse.' },
                        { icon: 'open_with', text: 'Para desplazarse hacia la derecha o arriba presione el botón derecho del mouse o las flechas.' },
                        { icon: 'zoom_in', text: 'Para acercar o alejar las vistas del laboratorio utilice la rueda del mouse.' }
                    ],
                    mobile: [
                        { icon: 'touch_app', text: 'Para rotar la vista del modelo y explorar los ángulos, arrastre un solo dedo en cualquier dirección sobre la pantalla.' },
                        { icon: 'drag_pan', text: 'Para desplazarse lateralmente o hacia arriba y abajo (paneo), arrastre dos dedos simultáneamente de forma paralela.' },
                        { icon: 'pinch', text: 'Para acercar o alejar la vista del objeto (zoom), realice el gesto de pellizcar con dos dedos (abriendo o cerrando la pinza).' }
                    ]
                }
            },
            en: {
                title: 'NAVIGATION GUIDE',
                subtitle: 'Instructions for exploring the laboratory',
                desktop: 'Desktop (Mouse)',
                mobile: 'Mobile (Touch)',
                close: 'Close',
                navItems: {
                    desktop: [
                        { icon: 'mouse', text: 'To rotate and move through the laboratory views, use the left mouse button.' },
                        { icon: 'open_with', text: 'To move right or up, press the right mouse button or the physical arrow keys.' },
                        { icon: 'zoom_in', text: 'To zoom in or out on the laboratory views, use the mouse wheel.' }
                    ],
                    mobile: [
                        { icon: 'touch_app', text: 'To rotate the model view and explore angles, drag a single finger in any direction on the screen.' },
                        { icon: 'drag_pan', text: 'To pan horizontally or vertically, drag two fingers simultaneously in parallel.' },
                        { icon: 'pinch', text: 'To zoom in or out on the object (zoom), perform the pinch gesture with two fingers.' }
                    ]
                }
            }
        }[lang] || {};

        const renderItems = (items) => items.map(item => `
            <div class="ModalAyuda-card flex flex-row md:flex-col items-center gap-4 md:gap-5 p-5 md:p-6 rounded-2xl bg-white/20 border border-white/40 transition-all hover:bg-white/40 hover:border-primary/40 group text-left md:text-center h-full">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300" 
                     style="background-color: rgba(var(--color-primary-rgb), 0.15); color: var(--color-primary); box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.2);">
                    <span class="material-symbols-outlined text-3xl font-bold" style="filter: drop-shadow(0 0 5px rgba(var(--color-primary-rgb), 0.4));">${item.icon}</span>
                </div>
                <p class="text-xs md:text-sm text-[#1a1c1e]/80 leading-relaxed transition-colors">${item.text}</p>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div id="modal-ayuda-root" class="ModalAyuda-root dark bg-surface/40 text-on-surface fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                <!-- Backdrop Blur -->
                <div class="absolute inset-0 bg-surface/20 backdrop-blur-md"></div>

                <div class="ModalAyuda-glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500 z-10" 
                     style="background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.5); backdrop-filter: blur(20px);">
                    
                    <!-- Close Button -->
                    <button class="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-[#1a1c1e] hover:text-black transition-colors z-20">
                        <span class="material-symbols-outlined text-2xl">close</span>
                    </button>

                    <!-- Header -->
                    <div class="p-8 pb-4">
                        <h2 class="text-primary font-display text-2xl md:text-3xl font-bold tracking-[0.15em] mb-1 uppercase">${t.title}</h2>
                        <p class="font-bold text-xs md:text-sm text-[#1a1c1e]/80">${t.subtitle}</p>
                    </div>

                    <!-- Content -->
                    <div class="px-8 pb-8 pt-2 overflow-y-auto ModalAyuda-custom-scrollbar">
                        <div class="max-w-5xl mx-auto">
                            <!-- Desktop Section (3 Columnas) -->
                            <div class="hidden md:grid grid-cols-3 gap-6">
                                ${renderItems(t.navItems.desktop)}
                            </div>

                            <!-- Mobile Section (1 Columna) -->
                            <div class="grid md:hidden grid-cols-1 gap-4">
                                ${renderItems(t.navItems.mobile)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .ModalAyuda-root {
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }

                .ModalAyuda-root.visible {
                    opacity: 1;
                    pointer-events: auto;
                }

                .ModalAyuda-glass-panel {
                    backdrop-filter: blur(30px);
                    -webkit-backdrop-filter: blur(30px);
                    background: rgba(15, 23, 42, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .ModalAyuda-root .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }

                .ModalAyuda-custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }

                .ModalAyuda-custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }

                .ModalAyuda-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--color-primary);
                    border-radius: 10px;
                    box-shadow: 0 0 10px var(--color-primary);
                }

                .ModalAyuda-root.visible .ModalAyuda-glass-panel {
                    animation: ModalAyuda-zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }

                @keyframes ModalAyuda-zoomIn {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            </style>
        `;

        // Añadir listener para cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // Añadir listener al botón de cerrar
        const closeBtn = this.container.querySelector('button.absolute');
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }

        if (isVisible) {
            this.container.querySelector('.ModalAyuda-root')?.classList.add('visible');
        }
    }

    open() {
        if (this.container) {
            this.container.style.display = 'block';
            // Pequeño delay para que el navegador registre el display antes de la transición
            requestAnimationFrame(() => {
                const modal = this.container.querySelector('.ModalAyuda-root');
                if (modal) modal.classList.add('visible');
            });
        }
    }

    close() {
        const modal = this.container.querySelector('.ModalAyuda-root');
        if (modal) {
            modal.classList.remove('visible');
            
            // Esperar a que termine la transición para ocultar el contenedor
            setTimeout(() => {
                if (this.container) this.container.style.display = 'none';
                
                // Ejecutar callback si existe
                if (typeof this.options.onClose === 'function') {
                    this.options.onClose();
                }
            }, 300); // Mismo tiempo que transition-opacity duration-300
        }
    }
}
