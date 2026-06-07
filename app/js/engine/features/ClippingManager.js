/**
 * ClippingManager.js
 * Gestiona el efecto de rayos X / corte de sección.
 * Intenta usar ClippingPlaneObject de Verge3D (con tapas/caps),
 * y cae a v3d.Plane (clipping estándar) si no está disponible.
 */

export class ClippingManager {
    constructor(appInstance, iframeWindow) {
        this.appInstance = appInstance;
        this.iframeWindow = iframeWindow;
        this.clippingPlane = null; // Para ClippingPlaneObject (Verge3D)
        this.fallbackPlane = null; // Para v3d.Plane (Standard Three.js)
        this.active = false;
        this.clippedObjects = new Set();
        this.useFallback = false;
    }

    /**
     * Activa el efecto de corte.
     */
    enable(meshNames, position = { x: 0, y: 0, z: 0 }, normal = { x: -1, y: 0, z: 0 }) {
        const v3d = this.iframeWindow.v3d;
        if (!v3d) return;

        this.disable(); // Limpiar previo

        // 1. Intentar usar ClippingPlaneObject (Verge3D)
        let ClippingPlaneClass = v3d.ClippingPlaneObject;
        if (!ClippingPlaneClass) {
            const keys = Object.keys(v3d);
            const found = keys.find(k => k.toLowerCase() === 'clippingplaneobject');
            if (found) ClippingPlaneClass = v3d[found];
        }

        if (ClippingPlaneClass) {
            this._enableVerge3DClipping(ClippingPlaneClass, meshNames, position, normal);
        } else {
            console.warn('[Clipping] ClippingPlaneObject no encontrado. Usando fallback de v3d.Plane.');
            this._enableStandardClipping(meshNames, position, normal);
        }
    }

    _enableVerge3DClipping(Class, meshNames, position, normal) {
        const v3d = this.iframeWindow.v3d;
        try {
            this.clippingPlane = new Class();
            this.clippingPlane.position.set(position.x, position.y, position.z);
            
            const norm = new v3d.Vector3(normal.x, normal.y, normal.z).normalize();
            this.clippingPlane.lookAt(this.clippingPlane.position.clone().add(norm));
            
            this.appInstance.scene.add(this.clippingPlane);

            const items = Array.isArray(meshNames) ? meshNames : [meshNames];
            items.forEach(name => {
                const obj = this.appInstance.scene.getObjectByName(name);
                if (obj) {
                    obj.traverse(child => {
                        if (child.isMesh) {
                            this.clippingPlane.assignToObject(child);
                            this.clippedObjects.add(child);
                        }
                    });
                }
            });

            if (this.clippingPlane.createCrossSectionPlane) {
                this.clippingPlane.createCrossSectionPlane([this.clippingPlane], 500);
            }

            this.active = true;
            this.useFallback = false;
            console.log(`[Clipping] Verge3D Clipping activado para ${this.clippedObjects.size} mallas.`);
        } catch (e) {
            console.error('[Clipping] Error en Verge3D Clipping:', e);
            this._enableStandardClipping(meshNames, position, normal);
        }
    }

    _enableStandardClipping(meshNames, position, normal) {
        const v3d = this.iframeWindow.v3d;
        try {
            // Activar clipping en el renderizador
            this.appInstance.renderer.localClippingEnabled = true;

            // Crear el plano matemático
            const norm = new v3d.Vector3(normal.x, normal.y, normal.z).normalize();
            // v3d.Plane usa la forma (normal, constante). 
            // La constante es la distancia al origen: -(normal . punto)
            const point = new v3d.Vector3(position.x, position.y, position.z);
            const constant = -norm.dot(point);
            this.fallbackPlane = new v3d.Plane(norm, constant);

            const items = Array.isArray(meshNames) ? meshNames : [meshNames];
            items.forEach(name => {
                const obj = this.appInstance.scene.getObjectByName(name);
                if (obj) {
                    obj.traverse(child => {
                        if (child.isMesh && child.material) {
                            const materials = Array.isArray(child.material) ? child.material : [child.material];
                            materials.forEach(mat => {
                                mat.clippingPlanes = mat.clippingPlanes || [];
                                if (!mat.clippingPlanes.includes(this.fallbackPlane)) {
                                    mat.clippingPlanes.push(this.fallbackPlane);
                                }
                                mat.needsUpdate = true;
                            });
                            this.clippedObjects.add(child);
                        }
                    });
                }
            });

            this.active = true;
            this.useFallback = true;
            console.log(`[Clipping] Fallback Clipping activado para ${this.clippedObjects.size} mallas.`);
        } catch (e) {
            console.error('[Clipping] Fallback failed:', e);
        }
    }

    disable() {
        const v3d = this.iframeWindow.v3d;
        
        if (this.clippingPlane) {
            this.clippedObjects.forEach(obj => {
                if (this.clippingPlane.cleanupAuxMeshes) this.clippingPlane.cleanupAuxMeshes(obj);
            });
            this.appInstance.scene.remove(this.clippingPlane);
            if (this.clippingPlane.dispose) this.clippingPlane.dispose();
            this.clippingPlane = null;
        }

        if (this.fallbackPlane) {
            this.clippedObjects.forEach(obj => {
                obj.traverse(child => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat.clippingPlanes) {
                                mat.clippingPlanes = mat.clippingPlanes.filter(p => p !== this.fallbackPlane);
                            }
                        });
                    }
                });
            });
            this.fallbackPlane = null;
        }

        this.clippedObjects.clear();
        this.active = false;
    }

    updatePlane(pos, norm) {
        const v3d = this.iframeWindow.v3d;
        if (!this.active) return;

        if (this.clippingPlane) {
            if (pos) this.clippingPlane.position.set(pos.x, pos.y, pos.z);
            if (norm) {
                this.clippingPlane.lookAt(
                    this.clippingPlane.position.x + norm.x,
                    this.clippingPlane.position.y + norm.y,
                    this.clippingPlane.position.z + norm.z
                );
            }
            this.clippingPlane.updateMatrixWorld(true);
        }

        if (this.fallbackPlane) {
            if (norm) this.fallbackPlane.normal.set(norm.x, norm.y, norm.z).normalize();
            if (pos) {
                const point = new v3d.Vector3(pos.x, pos.y, pos.z);
                this.fallbackPlane.constant = -this.fallbackPlane.normal.dot(point);
            }
        }

        if (this.appInstance.render) this.appInstance.render();
    }
}
