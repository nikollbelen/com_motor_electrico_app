/**
 * PreloaderLight - Versión minimalista del Preloader
 * Fondo blanco, tipografía Material UI (Roboto), logo configurable.
 */
export class PreloaderLight {
    constructor(containerId, { labNameES, labNameEN, logoUrl }) {
        this.container  = document.getElementById(containerId);
        this.labNameES  = labNameES;
        this.labNameEN  = labNameEN;
        this.logoUrl    = logoUrl;
        if (this.container) this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="PLightScreen" id="preloader">
                <div class="ContainerScreen">
                    <div class="ContentScreen">
                        <div class="WelcomeBox PLightWelcomeBox">
                            <span class="es">Bienvenido a:</span>
                            <span class="en">Welcome to:</span>
                        </div>
                        <h1 class="PreloaderTitle PLightTitle">
                            <span class="es">${this.labNameES}</span>
                            <span class="en">${this.labNameEN}</span>
                        </h1>
                        <p class="PreloaderDescription PLightDescription es">Por favor espere</p>
                        <p class="PreloaderDescription PLightDescription en">Please wait</p>
                        <p class="LoadingPercentage PLightPercentage" id="loading_percentage">0%</p>
                        <div class="Loader PLightLoader"></div>
                    </div>
                </div>
                <div class="LogoScreen">
                    ${this.logoUrl ? `<img src="${this.logoUrl}" alt="Logo" />` : ''}
                </div>
            </div>
        `;
    }

    /** Actualiza el porcentaje y oculta cuando llega a 100% */
    setProgress(percent) {
        const el = document.getElementById('loading_percentage');
        if (el) el.textContent = `${Math.round(percent)}%`;
        if (percent >= 100) {
            setTimeout(() => this.hide(), 500);
        }
    }

    hide() {
        const screen = document.getElementById('preloader');
        if (!screen) return;
        screen.style.transition = 'opacity 0.7s ease';
        screen.style.opacity = '0';
        setTimeout(() => { screen.style.display = 'none'; }, 700);
    }
}
