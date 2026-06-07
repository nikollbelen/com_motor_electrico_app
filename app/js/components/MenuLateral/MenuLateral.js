import { SoundManager }   from '../../utils/SoundManager.js';

export class MenuLateral {
    constructor(containerId, items, menuIconImage, labNameES = 'Laboratorio', labNameEN = 'Laboratory') {
        this.container    = document.getElementById(containerId);
        this.items        = items || [];
        this.menuIconImage = menuIconImage;
        this.labNameES    = labNameES;
        this.labNameEN    = labNameEN;

        this.open            = false;
        this.activeId        = null; 

        if (this.container) this.render();
    }

    render() {
        const htmlItems = this.items.map((item, i) => `
            <div class="MenuItem" data-id="${item.id}">
                <img src="${item.icon}" alt="Icon ${i}" />
                <span class="es">${item.ESdescription || 'Sin descripción'}</span>
                <span class="en">${item.ENdescription || item.ESdescription || 'No description'}</span>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="MenuContainer" id="menu">
                <div class="MenuIcon" id="menu-icon-btn">
                    <img src="${this.menuIconImage}" alt="Menu" style="width:2.5rem;height:2.5rem;" />
                    <div class="MenuDescription" id="menu-desc">
                        <p class="es">${this.labNameES}</p>
                        <p class="en">${this.labNameEN}</p>
                    </div>
                </div>
                <div class="MenuItems" id="menu-items-list">
                    ${htmlItems}
                </div>
            </div>
        `;

        this._asociarEventos();
    }

    _asociarEventos() {
        const icon     = this.container.querySelector('#menu-icon-btn');
        const desc     = this.container.querySelector('#menu-desc');
        const list     = this.container.querySelector('#menu-items-list');
        const menuItems = this.container.querySelectorAll('.MenuItem');

        icon.addEventListener('mouseenter', () => desc.classList.add('show'));
        icon.addEventListener('mouseleave', () => desc.classList.remove('show'));

        icon.addEventListener('click', () => {
            SoundManager.playClick();
            this.open = !this.open;
            if (this.open) {
                list.classList.add('open');
                SoundManager.playMenuOpen();
            } else {
                list.classList.remove('open');
                SoundManager.playMenuClose();
            }
        });

        menuItems.forEach(btn => {
            btn.addEventListener('mouseenter', () => SoundManager.playHover());
            btn.addEventListener('click', (e) => {
                const idPaso = e.currentTarget.getAttribute('data-id');
                console.log('[Menu] Click en:', idPaso); // Para debug
                this._onPasoSeleccionado(idPaso);
            });
        });
    }

    _onPasoSeleccionado(idPaso) {
        if (!idPaso) return;

        // Si ya está activo y presionamos de nuevo: Deseleccionar
        if (this.activeId === idPaso) {
            console.log('[Menu] Deseleccionando:', idPaso);
            this.activeId = null;
            this.container.querySelectorAll('.MenuItem').forEach(el => el.classList.remove('active'));
            SoundManager.playClick();
            window.dispatchEvent(new CustomEvent('menu:reset'));
            return;
        }

        // Si es un paso nuevo:
        const paso = this._buscarPaso(idPaso, this.items);
        if (!paso) {
            console.warn('[Menu] Paso no encontrado:', idPaso);
            return;
        }

        console.log('[Menu] Activando:', idPaso);
        this.activeId = idPaso;
        this.container.querySelectorAll('.MenuItem').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-id') === idPaso);
        });

        SoundManager.playClick();
        window.dispatchEvent(new CustomEvent('menu:paso', { detail: { paso } }));
    }

    _buscarPaso(id, pasos) {
        for (const p of pasos) {
            if (p.id === id) return p;
            if (p.children?.length) {
                const found = this._buscarPaso(id, p.children);
                if (found) return found;
            }
        }
        return null;
    }
}
