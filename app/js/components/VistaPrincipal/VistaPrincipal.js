/**
 * VistaPrincipal - Componente que representa la interfaz principal del laboratorio.
 * Incluye controles de HUD, navegación móvil y el asistente virtual.
 */
export class VistaPrincipal {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            tieneBotonLang:      options.tieneBotonLang !== false,
            tieneBotonSonido:    options.tieneBotonSonido !== false,
            tieneBotonGuardar:   options.tieneBotonGuardar !== false,
            tieneBotonAyuda:     options.tieneBotonAyuda !== false,
            tieneBotonObjetivos: options.tieneBotonObjetivos === true,
            tieneBotonEquipo:    options.tieneBotonEquipo === true,
            menuItems:           options.menuItems || [],
            lang:                options.lang || 'es',
            assistantVisible:    options.assistantVisible === true
        };

        this.translations = {
            es: {
                lang: 'Idioma',
                sound: 'Sonido',
                save: 'Guardar',
                objetivos: 'Objetivos',
                equipo: 'Equipo',
                help: 'Ayuda',
                assistant: '"Hola! ¿Necesitas ayuda para navegar por la vista de explosión? Puedo guiarte por cada componente."'
            },
            en: {
                lang: 'Language',
                sound: 'Sound',
                save: 'Save',
                objetivos: 'Objectives',
                equipo: 'Team',
                help: 'Help',
                assistant: '"Hi! Do you need help navigating the explosion view? I can guide you through each component."'
            }
        };

        if (this.container) {
            this.render();
        }
    }

    setLanguage(lang) {
        this.options.lang = lang;
        this.render();
    }

    setAssistantVisible(visible) {
        this.options.assistantVisible = visible;
        this.render();
    }

    render() {
        const { menuItems, lang } = this.options;
        const t = this.translations[lang] || this.translations.es;

        this.container.innerHTML = `
            <div class="VistaPrincipal-root dark bg-transparent text-on-surface-dark font-body-md overflow-hidden h-screen w-screen relative pointer-events-none">
                <!-- DESKTOP: TOP-RIGHT Controls -->
                <div class="fixed top-8 right-8 z-50 hidden md:flex items-center gap-3 pointer-events-auto">
                    ${this.options.tieneBotonLang ? this.renderLanguageButton(lang) : ''}
                    ${this.options.tieneBotonSonido ? this.renderTopButton('volume_up', t.sound, 'sound') : ''}
                    ${this.options.tieneBotonGuardar ? this.renderTopButton('save', t.save, 'save') : ''}
                    ${this.options.tieneBotonObjetivos ? this.renderTopButton('track_changes', t.objetivos, 'objetivos') : ''}
                    ${this.options.tieneBotonEquipo ? this.renderTopButton('engineering', t.equipo, 'equipo') : ''}
                    ${this.options.tieneBotonAyuda ? this.renderTopButton('help', t.help, 'help', this.options.assistantVisible) : ''}
                </div>

                <!-- MOBILE: TOP-RIGHT Options Dropdown -->
                <header class="fixed top-6 right-6 z-50 md:hidden pointer-events-auto">
                    <div class="relative">
                        <input type="checkbox" id="menu-toggle" class="hidden peer">
                        <label for="menu-toggle" class="fixed inset-0 hidden peer-checked:block z-[-1] cursor-default"></label>
                        <label for="menu-toggle" class="flex size-12 items-center justify-center rounded-full VistaPrincipal-glass-panel text-on-surface-dark shadow-lg cursor-pointer transition-all active:scale-90" style="color: var(--color-text-dark);">
                            <span class="material-symbols-outlined pointer-events-none">more_vert</span>
                        </label>
                        <div class="absolute top-full right-0 mt-3 p-2 VistaPrincipal-glass-panel rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[150px] opacity-0 translate-y-[-10px] scale-90 pointer-events-none peer-checked:opacity-100 peer-checked:translate-y-0 peer-checked:scale-100 peer-checked:pointer-events-auto VistaPrincipal-menu-transition origin-top-right">
                            ${this.options.tieneBotonLang ? this.renderMobileLanguageButton(lang) : ''}
                            ${this.options.tieneBotonSonido ? this.renderMobileMenuButton('volume_up', t.sound, 'sound') : ''}
                            ${this.options.tieneBotonGuardar ? this.renderMobileMenuButton('save', t.save, 'save') : ''}
                            ${this.options.tieneBotonObjetivos ? this.renderMobileMenuButton('track_changes', t.objetivos, 'objetivos') : ''}
                            ${this.options.tieneBotonEquipo ? this.renderMobileMenuButton('engineering', t.equipo, 'equipo') : ''}
                            <div class="h-px bg-white/10 mx-2 my-1"></div>
                            ${this.options.tieneBotonAyuda ? this.renderMobileMenuButton('help', t.help, 'help') : ''}
                        </div>
                    </div>
                </header>

                <!-- DESKTOP: Left HUD Controls -->
                <aside class="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4 items-start pointer-events-auto">
                    ${menuItems.map((item, idx) => this.renderHudButton(item.icon, lang === 'es' ? item.ESdescription : item.ENdescription, item.id, idx === 0)).join('')}
                </aside>

                <!-- MOBILE: Bottom Navigation (Compact) -->
                <nav class="fixed bottom-0 left-0 right-0 border-t border-outline-variant/30 VistaPrincipal-glass-panel px-1 pb-4 pt-2 z-40 md:hidden pointer-events-auto">
                    <div class="flex justify-around items-center max-w-md mx-auto">
                        ${menuItems.map((item, idx) => this.renderBottomNavButton(item.icon, lang === 'es' ? (item.ESdescription || '').toUpperCase() : (item.ENdescription || '').toUpperCase(), item.id, idx === 0)).join('')}
                    </div>
                </nav>

                <!-- SHARED: Assistant Area -->
                <div class="fixed z-50 flex items-end gap-4 transition-all duration-500 
                    bottom-10 right-8 md:flex md:bottom-8 md:right-8 
                    bottom-[140px] right-6 md:right-8 flex-row-reverse md:flex-row pointer-events-auto
                    ${this.options.assistantVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}">
                    
                    <!-- Dialogue Bubble (Desktop Only) -->
                    <div class="VistaPrincipal-glass-panel p-4 rounded-lg shadow-xl border border-white/10 max-w-xs VistaPrincipal-animate-assistant hidden md:block">
                        <p class="text-xs text-on-surface-dark leading-relaxed mb-3">
                            ${t.assistant}
                        </p>
                        <button data-action="ayuda-guia" class="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary-light transition-colors flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">info</span>
                            ${lang === 'es' ? 'Ver Guía de Navegación' : 'View Navigation Guide'}
                        </button>
                    </div>

                    <!-- Avatar Button -->
                    <div class="relative group">
                        <button class="w-14 h-14 md:w-16 md:h-16 rounded-full VistaPrincipal-glass-panel VistaPrincipal-inner-glow flex items-center justify-center overflow-hidden border-2 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.2)] hover:scale-110 transition-transform" style="border-color: rgba(var(--color-primary-rgb), 0.3);">
                            <img alt="AI Assistant" class="w-full h-full object-cover" src="./images/avatar.png" />
                        </button>
                        <div class="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full animate-pulse shadow-[0_0_10px_var(--glow-primary)]" style="background-color: var(--color-primary);"></div>
                    </div>
                </div>

                <style>
                    .VistaPrincipal-root {
                        --glow-primary: rgba(var(--color-primary-rgb), 0.5);
                    }
                    .VistaPrincipal-glass-panel {
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        background: rgba(255, 255, 255, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .VistaPrincipal-inner-glow {
                        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
                    }

                    .VistaPrincipal-hover-active:hover, .VistaPrincipal-btn-active, .VistaPrincipal-menu-item-hover:hover {
                        background: rgba(var(--color-primary-rgb), 0.2) !important;
                        color: var(--color-primary) !important;
                        border-color: rgba(var(--color-primary-rgb), 0.3) !important;
                        box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
                    }

                    .VistaPrincipal-hover-active:hover .material-symbols-outlined, 
                    .VistaPrincipal-btn-active .material-symbols-outlined,
                    .VistaPrincipal-menu-item-hover:hover .material-symbols-outlined {
                        color: var(--color-primary) !important;
                        font-variation-settings: 'FILL' 1 !important;
                    }

                    .VistaPrincipal-menu-transition {
                        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }

                    @keyframes VistaPrincipal-fadeInSlideRight {
                        from { opacity: 0; transform: translateX(20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    .VistaPrincipal-animate-assistant {
                        animation: VistaPrincipal-fadeInSlideRight 0.5s ease-out forwards;
                    }
                </style>
            </div>
        `;
    }

    renderTopButton(icon, label, action, active = false) {
        return `
            <div class="relative group">
                <button data-action="${action}" class="w-12 h-12 flex items-center justify-center rounded-full VistaPrincipal-glass-panel VistaPrincipal-hover-active transition-all shadow-xl ${active ? 'VistaPrincipal-btn-active' : ''}">
                    <span class="material-symbols-outlined ${active ? 'text-primary' : 'text-on-surface-dark'}" style="${active ? 'font-variation-settings: \'FILL\' 1' : ''}">${icon}</span>
                </button>
                <span class="absolute top-full mt-2 right-0 px-3 py-1 VistaPrincipal-glass-panel text-xs font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap rounded-md shadow-lg" style="color: var(--color-primary); border-color: rgba(var(--color-primary-rgb), 0.2);">${label}</span>
            </div>
        `;
    }

    renderMobileMenuButton(icon, label, action) {
        return `
            <button data-action="${action}" class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all VistaPrincipal-menu-item-hover text-sm w-full">
                <span class="material-symbols-outlined text-xl text-on-surface-dark">${icon}</span>
                <span class="font-medium">${label}</span>
            </button>
        `;
    }

    renderLanguageButton(lang) {
        const isEs = lang === 'es';
        return `
            <button data-action="lang" class="flex items-center gap-2 px-4 py-2 rounded-full VistaPrincipal-glass-panel text-on-surface-dark hover:VistaPrincipal-hover-active transition-all group pointer-events-auto shadow-lg" style="color: var(--color-text-dark);">
                <span class="flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-[10px] font-bold tracking-tighter border border-white/20 group-hover:border-primary/50 transition-colors">
                    ${isEs ? 'ES' : 'EN'}
                </span>
                <span class="text-sm font-medium">${isEs ? 'Español' : 'English'}</span>
            </button>
        `;
    }

    renderMobileLanguageButton(lang) {
        const isEs = lang === 'es';
        return `
            <button data-action="lang" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors w-full text-left">
                <span class="flex items-center justify-center w-6 h-6 rounded bg-white/10 text-[9px] font-bold border border-white/20">
                    ${isEs ? 'ES' : 'EN'}
                </span>
                <span class="text-sm font-medium">${isEs ? 'Español' : 'English'}</span>
            </button>
        `;
    }

    renderHudButton(icon, label, id, active = false) {
        return `
            <button data-id="${id}" data-action="paso" class="VistaPrincipal-glass-panel flex items-center p-3 text-on-surface-dark VistaPrincipal-hover-active rounded-full group shadow-xl ${active ? 'VistaPrincipal-btn-active' : ''}">
                <span class="material-symbols-outlined shrink-0 w-6 h-6 flex items-center justify-center">${icon}</span>
                <span class="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-4 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500 whitespace-nowrap font-label-sm">${label}</span>
            </button>
        `;
    }

    renderBottomNavButton(icon, label, id, active = false) {
        const activeColor = active ? 'style="color: var(--color-primary);"' : '';
        const activeBg = active ? 'style="background-color: var(--color-primary);"' : '';
        return `
            <a data-id="${id}" data-action="paso" class="flex flex-col items-center gap-0.5 p-1 ${active ? '' : 'text-on-surface-dark'}" ${activeColor} href="#">
                <div class="h-7 flex items-center justify-center">
                    <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' ${active ? 1 : 0};">${icon}</span>
                </div>
                <span class="text-[9px] font-bold tracking-tight">${label}</span>
                ${active ? `<div class="w-3 h-0.5 rounded-full mt-0.5 VistaPrincipal-nav-indicator" ${activeBg}></div>` : ''}
            </a>
        `;
    }

}
