export class AnimationPlayer {
    constructor(appInstance, iframeWindow) {
        this.appInstance = appInstance;
        this.v3d = iframeWindow ? iframeWindow.v3d : null;
    }

    getAllAnimations() {
        if (!this.appInstance || !this.v3d) return [];
        const res = [];
        this.appInstance.scene.traverse((o) => {
            if (this.v3d.SceneUtils.getAnimationActionByName(this.appInstance, o.name)) {
                res.push(o.name);
            }
        });
        return res;
    }

    play(anims, from = 0, to = undefined, loop = 'LoopOnce') {
        if (!anims || !this.appInstance || !this.v3d) return;
        const names = (anims === 'ALL_OBJECTS') ? this.getAllAnimations() : (Array.isArray(anims) ? anims : [anims]);
        
        const loopMode = (loop === 'LoopRepeat') ? this.v3d.LoopRepeat : this.v3d.LoopOnce;
        
        names.forEach((n) => {
            // Usar SceneUtils.playAnimation que es la API estándar de Verge3D para puzzles
            if (this.v3d.SceneUtils && typeof this.v3d.SceneUtils.playAnimation === 'function') {
                this.v3d.SceneUtils.playAnimation(this.appInstance, n, from, to, loopMode);
            } else {
                // Fallback manual usando AnimationAction si SceneUtils no está disponible
                const action = this.v3d.SceneUtils.getAnimationActionByName(this.appInstance, n);
                if (action) {
                    action.reset();
                    action.loop = loopMode;
                    if (from !== undefined) action.time = from / 24;
                    
                    // Si hay un 'to', tendríamos que usar un mixer con duration, 
                    // pero SceneUtils.playAnimation es lo que deberíamos tener en V3D.
                    action.play();
                }
            }
        });
    }

    stop(anims) {
        if (!anims) return;
        const names = (anims === 'ALL_OBJECTS') ? this.getAllAnimations() : (Array.isArray(anims) ? anims : [anims]);
        
        if (!this.v3d) return;

        names.forEach((n) => {
            const action = this.v3d.SceneUtils.getAnimationActionByName(this.appInstance, n);
            if (action) action.stop();
        });
    }

    setFrame(anims, frame = 0) {
        if (!anims) return;
        const names = (anims === 'ALL_OBJECTS') ? this.getAllAnimations() : (Array.isArray(anims) ? anims : [anims]);
        
        if (!this.v3d) return;

        names.forEach((n) => {
            const action = this.v3d.SceneUtils.getAnimationActionByName(this.appInstance, n);
            if (action) {
                action.reset(); 
                action.time = frame / 24; 
                action.play(); 
                action.paused = true;
            }
        });
    }
}
