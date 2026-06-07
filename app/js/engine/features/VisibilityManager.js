export class VisibilityManager {
    constructor(appInstance) {
        this.appInstance = appInstance;
    }

    getObjectByName(name) {
        if (!name || !this.appInstance) return null;
        // La mayoría de las veces el nombre es único, usamos el método nativo por velocidad
        return this.appInstance.scene.getObjectByName(name);
    }

    change(names, bool) {
        if (!names || !this.appInstance) return;
        const namesArray = (typeof names === 'string') ? [names] : names;
        if (namesArray.length === 0) return;

        console.log(`[Visibility] Cambiando visibilidad a ${bool} para:`, namesArray);

        let count = 0;
        this.appInstance.scene.traverse((o) => {
            if (namesArray.includes(o.name)) {
                o.visible = bool;
                count++;
            }
        });

        if (count === 0) {
            console.warn(`[Visibility] No se encontraron objetos en la escena con los nombres proporcionados.`);
        } else {
            console.log(`[Visibility] Se actualizaron ${count} objetos.`);
        }
    }

    hideAll(namesArray) {
        this.change(namesArray, false);
    }

    showAll(namesArray) {
        this.change(namesArray, true);
    }

    hideEverything() {
        if (!this.appInstance) return;
        this.appInstance.scene.traverse((o) => {
            if (o.type === 'Mesh' || o.isMesh) {
                o.visible = false;
            }
        });
    }

    showEverything() {
        if (!this.appInstance) return;
        this.appInstance.scene.traverse((o) => {
            if (o.type === 'Mesh' || o.isMesh) {
                o.visible = true;
            }
        });
    }
}
