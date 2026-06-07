export class HighlightManager {
    constructor(appInstance, iframeWindow, primaryColor = 'cyan') {
        this.appInstance = appInstance;
        this.iframeWindow = iframeWindow;
        this.primaryColor = primaryColor;
        this.activeOutlines = new Map();
        this._injectHighlightLogic();
    }

    _injectHighlightLogic() {
        if (!this.iframeWindow || this.iframeWindow.resaltar) return;

        const self = this;
        const THREE = this.iframeWindow.v3d || this.iframeWindow.THREE;
        if (!THREE) return;
        const paletaColores = {
            "rojo": 0xFF0000,
            "azul": 0x0044FF,
            "verde": 0x00FF00,
            "amarillo": 0xFFFF00,
            "blanco": 0xFFFFFF,
            "naranja": 0xFFA500,
            "cyan": 0x00FFFF,
            "magenta": 0xFF00FF,
            "gris": 0x444444,
            "negro": 0x000000
        };

        const getApp = () => this.iframeWindow.v3d?.apps?.[0] || this.iframeWindow.THREE?.apps?.[0];
        const getObj = (name, app) => app?.scene?.getObjectByName(name);
        const parseColor = (color) => {
            if (!color) return paletaColores.cyan;
            const c = color.toLowerCase().trim();
            if (paletaColores[c]) return paletaColores[c];
            if (/^#?[0-9A-Fa-f]{6}$/.test(c)) return parseInt(c.replace('#', ''), 16);
            return paletaColores.cyan;
        };

        const expandGeometryAlongNormals = (geometry, distanceLocal = 0.02) => {
            const geom = geometry.clone();
            const posAttr = geom.attributes.position;
            let normAttr = geom.attributes.normal;
            if (!normAttr) {
                geom.computeVertexNormals();
                normAttr = geom.attributes.normal;
            }

            // Usamos el constructor del array original para evitar problemas de cross-origin/iframe
            // y usamos getX/setXYZ para manejar correctamente buffers entrelazados (interleaved)
            const count = posAttr.count;
            const newPos = new posAttr.array.constructor(count * 3);

            for (let i = 0; i < count; i++) {
                newPos[i * 3]     = posAttr.getX(i) + normAttr.getX(i) * distanceLocal;
                newPos[i * 3 + 1] = posAttr.getY(i) + normAttr.getY(i) * distanceLocal;
                newPos[i * 3 + 2] = posAttr.getZ(i) + normAttr.getZ(i) * distanceLocal;
            }

            geom.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
            return geom;
        };

        const crearCapaResplandor = (geometry, colorHex, opacidad, depthFunc, renderOrder) => {
            const material = new THREE.MeshBasicMaterial({
                color: colorHex,
                side: THREE.BackSide,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: true,
                depthFunc: depthFunc
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.targetOpacity = opacidad;
            mesh.userData.animTime = 0;
            mesh.userData.animSpeed = 2.5;
            mesh.matrixAutoUpdate = false;
            mesh.userData.isOutline = true;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.raycast = () => {};
            mesh.renderOrder = (typeof renderOrder === 'number') ? renderOrder : 0;
            return mesh;
        };

        const animarContorno = (capa, delta) => {
            capa.userData.animTime += delta * capa.userData.animSpeed;
            const t = (Math.sin(capa.userData.animTime) + 1) / 2;
            capa.material.opacity = THREE.MathUtils.lerp(0.15, capa.userData.targetOpacity, t);
        };

        const limpiarContornosDeObjeto = (child) => {
            if (self.activeOutlines.has(child)) {
                const capas = self.activeOutlines.get(child);
                capas.forEach(capa => {
                    if (capa.parent) capa.parent.remove(capa);
                    else getApp()?.scene?.remove(capa);
                    capa.geometry?.dispose();
                    capa.material?.dispose();
                });
                self.activeOutlines.delete(child);
            }
        };

        this.iframeWindow.resaltar = (id, color = "cyan", xray = false, xrayColor = "gris", isStatic = false) => {
            const app = getApp();
            if (!app) return;
            const items = Array.isArray(id) ? id : [id];
            const colorHexVisible = parseColor(color);
            const colorHexOculto = parseColor(xrayColor);

            items.forEach(name => {
                const obj = getObj(name, app);
                if (!obj) return;
                const meshesParaResaltar = [];
                obj.traverse(child => {
                    if (child.userData.isOutline) return;
                    if (child.isMesh) meshesParaResaltar.push(child);
                });
                meshesParaResaltar.forEach(child => {
                    limpiarContornosDeObjeto(child);
                    const glowGroup = [];
                    child.updateMatrixWorld(true);
                    const baseLocalDistance = 0.02;
                    const originalGeometry = child.geometry;
                    if (!originalGeometry) return;

                    const inflatedGeom1 = expandGeometryAlongNormals(originalGeometry, baseLocalDistance);
                    const inflatedGeom2 = expandGeometryAlongNormals(originalGeometry, baseLocalDistance * 1.6);
                    
                    const capa1 = crearCapaResplandor(inflatedGeom1, colorHexVisible, 0.8, THREE.LessEqualDepth, child.renderOrder - 1);
                    capa1.matrix.copy(child.matrixWorld);
                    app.scene.add(capa1);
                    glowGroup.push(capa1);

                    const capa2 = crearCapaResplandor(inflatedGeom2, colorHexVisible, 0.4, THREE.LessEqualDepth, child.renderOrder - 2);
                    capa2.matrix.copy(child.matrixWorld);
                    app.scene.add(capa2);
                    glowGroup.push(capa2);

                    if (xray) {
                        const inflatedGeomX = expandGeometryAlongNormals(originalGeometry, baseLocalDistance * 1.1);
                        const capaXray = crearCapaResplandor(inflatedGeomX, colorHexOculto, 0.6, THREE.GreaterDepth, child.renderOrder - 3);
                        capaXray.matrix.copy(child.matrixWorld);
                        app.scene.add(capaXray);
                        glowGroup.push(capaXray);
                    }
                    glowGroup.forEach(capa => capa.userData.isStatic = isStatic);
                    self.activeOutlines.set(child, glowGroup);
                });
            });
        };

        this.iframeWindow.quitarResaltado = () => {
            self.activeOutlines.forEach((capas, originalMesh) => {
                capas.forEach(capa => {
                    if (capa.parent) capa.parent.remove(capa);
                    else getApp()?.scene?.remove(capa);
                    capa.geometry?.dispose();
                    capa.material?.dispose();
                });
            });
            self.activeOutlines.clear();
        };

        let last = performance.now();
        const loop = (now) => {
            const delta = (now - last) / 1000;
            last = now;
            self.activeOutlines.forEach((capas, originalMesh) => {
                if (!originalMesh.parent) {
                    limpiarContornosDeObjeto(originalMesh);
                    return;
                }
                originalMesh.updateMatrixWorld(true);
                const world = originalMesh.matrixWorld;
                capas.forEach(capa => {
                    capa.matrix.copy(world);
                    if (capa.userData.isStatic) {
                        capa.material.opacity = capa.userData.targetOpacity;
                    } else {
                        animarContorno(capa, delta);
                    }
                });
            });
            this.iframeWindow.requestAnimationFrame(loop);
        };
        this.iframeWindow.requestAnimationFrame(loop);
    }

    updateStyle(colorHex, opacityBase) {
        const THREE = this.iframeWindow.v3d || this.iframeWindow.THREE;
        this.activeOutlines.forEach((capas, originalMesh) => {
            capas.forEach((capa, index) => {
                if (colorHex !== null) {
                    capa.material.color.setHex(colorHex);
                }
                if (opacityBase !== null) {
                    // Mantenemos la relación 100% / 50% entre capas
                    const ratio = (index === 0) ? 1 : 0.5;
                    capa.userData.targetOpacity = opacityBase * ratio;
                }
            });
        });
    }

    enable(namesArray, isStatic = false, customColor = null) {
        if (!namesArray || namesArray.length === 0) return;
        if (this.iframeWindow && typeof this.iframeWindow.resaltar === 'function') {
            const color = customColor || this.primaryColor;
            this.iframeWindow.resaltar(namesArray, color, true, color, isStatic);
        } else {
            console.warn('[Highlight] window.resaltar no está disponible en el iframe.');
        }
    }

    disable(namesArray = null) {
        if (this.iframeWindow && typeof this.iframeWindow.quitarResaltado === 'function') {
            this.iframeWindow.quitarResaltado();
        }
    }
}
