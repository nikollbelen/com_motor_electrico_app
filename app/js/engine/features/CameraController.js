export class CameraController {
    constructor(appInstance) {
        this.appInstance = appInstance;
        // v3d vive en el window del iframe
        this.iframeWin = appInstance.container.ownerDocument.defaultView;
        this.v3d = this.iframeWin.v3d;

        // Configurar límites de zoom y visibilidad solicitados
        this.setCameraLimits({
            maxDistance: 15000,
            far: 100000
        });
    }

    /**
     * Ajusta los límites de la cámara y controles.
     */
    setCameraLimits({ maxDistance, far }) {
        if (!this.appInstance) return;

        if (this.appInstance.controls && maxDistance !== undefined) {
            this.appInstance.controls.maxDistance = maxDistance;
        }

        if (this.appInstance.camera && far !== undefined) {
            this.appInstance.camera.far = far;
            this.appInstance.camera.updateProjectionMatrix();
        }
    }

    getObjectByName(name) {
        if (!name || !this.appInstance) return null;
        let objTarget = null;
        this.appInstance.scene.traverse((obj) => {
            if (obj.name === name) objTarget = obj;
        });
        return objTarget;
    }

    _parseCoord(val, vec3) {
        if (!val || !this.v3d) return null;
        // Si es una coordenada manual tipo [x, y, z]
        if (typeof val === 'string' && val.startsWith('[') && val.includes(']')) {
            try {
                const parts = val.replace(/[\[\]\s]/g, '').split(',').map(Number);
                if (parts.length === 3) return vec3.set(parts[0], parts[1], parts[2]);
            } catch(e) {
                console.error(`[Camera] Error parseando coordenada: ${val}`, e);
            }
        }
        // Si es un objeto de la escena
        const obj = this.getObjectByName(val);
        if (obj) return obj.getWorldPosition(vec3);
        return null;
    }

    tween(posName, dirName, duration = 1.2) {
        if (!this.appInstance || !this.appInstance.controls || !this.v3d) return;

        const vec3Tmp = new this.v3d.Vector3();
        const vec3Tmp2 = new this.v3d.Vector3();

        const pW = this._parseCoord(posName, vec3Tmp);
        const dW = this._parseCoord(dirName, vec3Tmp2);
        
        if (!pW || !dW) {
            console.warn(`[Camera] No se pudieron resolver las posiciones: pos=${posName}, dir=${dirName}`);
            return;
        }

        this.appInstance.controls.tween(pW, dW, duration);
    }

    enableLogging() {
        if (!this.appInstance || !this.appInstance.controls) return;
        if (this._loggingEnabled) return;
        this._loggingEnabled = true;

        this._logFn = () => {
            if (!this._loggingEnabled) return;
            const pos = this.appInstance.camera.position;
            const controls = this.appInstance.controls;
            const tar = controls.targetObj ? controls.targetObj.position : controls.target;
            
            if (tar) {
                console.log(`%c[Camera Log] %cPos: [${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] %cTarget: [${tar.x.toFixed(3)}, ${tar.y.toFixed(3)}, ${tar.z.toFixed(3)}]`, 
                    'color: #4facfe; font-weight: bold;', 
                    'color: #ffffff;', 
                    'color: #00f2fe;');
            }
        };

        this.appInstance.controls.addEventListener('change', this._logFn);
    }

    disableLogging() {
        this._loggingEnabled = false;
        if (this._logFn) {
            this.appInstance.controls.removeEventListener('change', this._logFn);
        }
    }

    enableDebug() {
        this.enableLogging();
        this._createDebugUI();
        console.log("%c[Camera Debug] %cModo depuración activado. Usa las flechas en pantalla para mover la cámara.", "color: #ff00ff; font-weight: bold;", "color: #white;");
    }

    disableDebug() {
        this.disableLogging();
        const ui = document.getElementById('v3d-camera-debug-ui');
        if (ui) ui.remove();
        if (this._statsInterval) clearInterval(this._statsInterval);
        console.log("%c[Camera Debug] %cModo depuración desactivado.", "color: #ff00ff; font-weight: bold;", "color: #white;");
    }

    _createDebugUI() {
        if (document.getElementById('v3d-camera-debug-ui')) return;

        const container = document.createElement('div');
        container.id = 'v3d-camera-debug-ui';
        container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px);
            padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
            color: white; font-family: 'Inter', sans-serif; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            width: 200px;
        `;

        const header = document.createElement('div');
        header.innerHTML = '<div style="font-size:12px; font-weight:800; margin-bottom:15px; color:#3874ff; text-transform:uppercase; letter-spacing:0.1em;">Camera Debugger</div>';
        container.appendChild(header);

        const stats = document.createElement('div');
        stats.id = 'debug-stats';
        stats.style.cssText = 'font-size:10px; font-family:monospace; margin-bottom:15px; line-height:1.4; color: #94a3b8;';
        container.appendChild(stats);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;';
        
        const btnStyle = `
            aspect-ratio: 1; background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s; font-size: 16px;
        `;

        const buttons = [
            { label: '↑', dir: 'up', grid: '1 / 2' },
            { label: 'F', dir: 'forward', grid: '1 / 3', title: 'Adelante (W)' },
            { label: '←', dir: 'left', grid: '2 / 1' },
            { label: '↓', dir: 'down', grid: '2 / 2' },
            { label: '→', dir: 'right', grid: '2 / 3' },
            { label: 'B', dir: 'backward', grid: '3 / 2', title: 'Atrás (S)' }
        ];

        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.innerHTML = b.label;
            if (b.title) btn.title = b.title;
            btn.style.cssText = btnStyle + `grid-area: ${b.grid};`;
            btn.onmouseover = () => { btn.style.background = '#3874ff'; btn.style.transform = 'scale(1.05)'; };
            btn.onmouseout = () => { btn.style.background = 'rgba(255,255,255,0.05)'; btn.style.transform = 'scale(1)'; };
            btn.onclick = () => this.moveCamera(b.dir);
            grid.appendChild(btn);
        });

        container.appendChild(grid);

        const sensitivity = document.createElement('div');
        sensitivity.style.cssText = 'margin-top:15px; font-size:10px; color:#64748b;';
        sensitivity.innerHTML = 'Sensibilidad: 50u';
        container.appendChild(sensitivity);

        document.body.appendChild(container);

        // Actualización de stats
        this._statsInterval = setInterval(() => {
            const s = document.getElementById('debug-stats');
            if (s) {
                const pos = this.appInstance.camera.position;
                const controls = this.appInstance.controls;
                const tar = controls.targetObj ? controls.targetObj.position : controls.target;
                
                if (tar) {
                    s.innerHTML = `POS: [${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)}]<br>TAR: [${tar.x.toFixed(0)}, ${tar.y.toFixed(0)}, ${tar.z.toFixed(0)}]`;
                }
            }
        }, 100);
    }

    moveCamera(direction, step = 50) {
        if (!this.appInstance || !this.appInstance.controls || !this.v3d) return;

        const camera = this.appInstance.camera;
        const controls = this.appInstance.controls;
        
        const forward = new this.v3d.Vector3();
        camera.getWorldDirection(forward);
        
        const side = new this.v3d.Vector3().crossVectors(camera.up, forward).normalize();
        const up = camera.up.clone().normalize();

        const offset = new this.v3d.Vector3();

        switch(direction) {
            case 'forward': offset.copy(forward).multiplyScalar(step); break;
            case 'backward': offset.copy(forward).multiplyScalar(-step); break;
            case 'left': offset.copy(side).multiplyScalar(step); break;
            case 'right': offset.copy(side).multiplyScalar(-step); break;
            case 'up': offset.copy(up).multiplyScalar(step); break;
            case 'down': offset.copy(up).multiplyScalar(-step); break;
        }

        camera.position.add(offset);
        
        const tar = controls.targetObj ? controls.targetObj.position : controls.target;
        if (tar) tar.add(offset); 
        
        controls.update();
    }
}
