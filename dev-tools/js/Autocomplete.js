/**
 * Componente modular para funcionalidad de autocompletado.
 * Implementa un dropdown con sugerencias basado en un input y un origen de datos.
 */
export class Autocomplete {
    /**
     * @param {HTMLInputElement} inputElement - El input DOM al que se asocia.
     * @param {Array<string>} dataSource - Arreglo de strings para sugerencias.
     * @param {Function} onSelect - Callback opcional al seleccionar un valor.
     */
    constructor(inputElement, dataSource = [], onSelect = null) {
        this.input = inputElement;
        this.dataSource = dataSource;
        this.onSelect = onSelect;
        this.currentFocus = -1;
        this.listElement = null;

        // Limpiar para evitar duplicidad si se instancia múltiples veces
        this.destroy();

        // Envolver el input si no lo está (para posicionamiento relativo)
        if (!this.input.parentNode.classList.contains('autocomplete-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'autocomplete-wrapper';
            this.input.parentNode.insertBefore(wrapper, this.input);
            wrapper.appendChild(this.input);
        }

        // Bindeo de eventos
        this.handleInput = this.onInput.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleClickOutside = this.onClickOutside.bind(this);

        this.input.addEventListener('input', this.handleInput);
        this.input.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('click', this.handleClickOutside);
    }

    onInput(e) {
        const val = this.input.value;
        this.closeAllLists();
        if (!val) return false;

        this.currentFocus = -1;
        this.listElement = document.createElement('div');
        this.listElement.setAttribute('id', this.input.id + 'autocomplete-list');
        this.listElement.setAttribute('class', 'autocomplete-items');
        this.input.parentNode.appendChild(this.listElement);

        let matches = 0;
        for (let i = 0; i < this.dataSource.length; i++) {
            const item = this.dataSource[i];
            // Verifica si el ítem contiene el texto (insensible a mayúsculas)
            if (item.toLowerCase().includes(val.toLowerCase())) {
                const itemDiv = document.createElement('div');
                // Resaltar la coincidencia
                const matchIndex = item.toLowerCase().indexOf(val.toLowerCase());
                const preMatch = item.substring(0, matchIndex);
                const matchText = item.substring(matchIndex, matchIndex + val.length);
                const postMatch = item.substring(matchIndex + val.length);

                itemDiv.innerHTML = `${preMatch}<strong>${matchText}</strong>${postMatch}`;
                itemDiv.innerHTML += `<input type='hidden' value='${item}'>`;

                itemDiv.addEventListener('click', (e) => {
                    this.input.value = itemDiv.getElementsByTagName('input')[0].value;
                    // Disparar evento de input original para otras validaciones (ej. tag addition)
                    this.input.dispatchEvent(new Event('input', { bubbles: true }));
                    if (this.onSelect) this.onSelect(this.input.value);
                    this.closeAllLists();
                });
                
                this.listElement.appendChild(itemDiv);
                matches++;
                if(matches >= 50) break; // Límite de sugerencias para no saturar el DOM
            }
        }
        
        if (matches === 0) {
            this.closeAllLists();
        }
    }

    onKeyDown(e) {
        if (!this.listElement) return;
        const items = this.listElement.getElementsByTagName('div');
        if (e.keyCode === 40) { // Arrow Down
            this.currentFocus++;
            this.addActive(items);
            e.preventDefault();
        } else if (e.keyCode === 38) { // Arrow Up
            this.currentFocus--;
            this.addActive(items);
            e.preventDefault();
        } else if (e.keyCode === 13) { // Enter
            e.preventDefault();
            if (this.currentFocus > -1) {
                if (items[this.currentFocus]) items[this.currentFocus].click();
            } else if (items.length > 0) {
                items[0].click(); // Si no hay focus, autoseleccionar el primero
            }
        }
    }

    addActive(items) {
        if (!items) return false;
        this.removeActive(items);
        if (this.currentFocus >= items.length) this.currentFocus = 0;
        if (this.currentFocus < 0) this.currentFocus = (items.length - 1);
        items[this.currentFocus].classList.add('autocomplete-active');
        
        // Auto scroll
        items[this.currentFocus].scrollIntoView({ block: 'nearest' });
    }

    removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('autocomplete-active');
        }
    }

    closeAllLists(elmnt) {
        const items = document.getElementsByClassName('autocomplete-items');
        for (let i = 0; i < items.length; i++) {
            if (elmnt != items[i] && elmnt != this.input) {
                items[i].parentNode.removeChild(items[i]);
            }
        }
        this.listElement = null;
    }

    onClickOutside(e) {
        this.closeAllLists(e.target);
    }

    updateDataSource(newData) {
        this.dataSource = newData;
    }

    destroy() {
        this.input.removeEventListener('input', this.handleInput);
        this.input.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('click', this.handleClickOutside);
        this.closeAllLists();
    }
}
