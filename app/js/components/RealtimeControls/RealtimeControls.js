/**
 * RealtimeControls — Sala y Snapshot con nombres personalizados
 */
export class RealtimeControls {
    constructor(options = {}) {
        this.lang = options.lang || 'es';
        this._presenter = null;
        this._roomActive = false;
        this._roomId = null;
        this._voiceActive = false;
        this._presenterVoice = null;
        this._qaPresenter = null;
        this._qaQuestions = [];
        this._viewerCount = 0;
        this._injectStyles();
        this._injectHTML();
        this._bindEvents();
        this._restoreRoom();
    }

    static get translations() {
        return {
            es: {
                sala: 'Sala', salaTitle: 'Sala en vivo',
                mic: 'Micrófono', micTitle: 'Micrófono en vivo',
                preguntas: 'Preguntas', preguntasTitle: 'Preguntas de alumnos',
                snapshot: 'Snapshot',
                // Modal Sala
                salaModalTitle: 'Sala en vivo',
                salaModalDesc: 'Transmite tu laboratorio en tiempo real a tus alumnos.',
                salaNew: 'Crear nueva sala', salaExisting: 'Ya tengo mi sala',
                // Modal Snapshot
                snapModalTitle: '¿Tomar un snapshot?',
                snapModalDesc: 'Se guardará la vista actual del modelado. Podrás compartir el enlace con tus alumnos.',
                snapCancel: 'Cancelar', snapTake: 'Tomar snapshot',
                snapSaving: 'Guardando...', snapDone: '¡Snapshot guardado!',
                snapDoneDesc: 'Comparte este enlace con tus alumnos para que vean el snapshot.'
            },
            en: {
                sala: 'Room', salaTitle: 'Live room',
                mic: 'Microphone', micTitle: 'Live microphone',
                preguntas: 'Questions', preguntasTitle: 'Student questions',
                snapshot: 'Snapshot',
                // Modal Sala
                salaModalTitle: 'Live room',
                salaModalDesc: 'Stream your lab in real time to your students.',
                salaNew: 'Create new room', salaExisting: 'I already have my room',
                // Modal Snapshot
                snapModalTitle: 'Take a snapshot?',
                snapModalDesc: 'The current 3D view will be saved. You can share the link with your students.',
                snapCancel: 'Cancel', snapTake: 'Take snapshot',
                snapSaving: 'Saving...', snapDone: 'Snapshot saved!',
                snapDoneDesc: 'Share this link with your students so they can view the snapshot.'
            }
        };
    }

    setLanguage(lang) {
        this.lang = lang;
        this._updateTopbarLabels();
    }

    _updateTopbarLabels() {
        const t = RealtimeControls.translations[this.lang] || RealtimeControls.translations.es;
        const c = this._btnContainer;
        if (!c) return;
        const tooltips = c.querySelectorAll('.realtime-btn-tooltip');
        const [tSala, tMic, tQA, tSnap] = tooltips;
        if (tSala) tSala.textContent = t.sala;
        if (tMic)  tMic.textContent  = t.mic;
        if (tQA)   tQA.textContent   = t.preguntas;
        if (tSnap) tSnap.textContent = t.snapshot;
        const btnSala = c.querySelector('#btn-sala');
        const btnMic  = c.querySelector('#btn-mic');
        const btnQA   = c.querySelector('#btn-qa');
        const btnSnap = c.querySelector('#btn-snapshot');
        if (btnSala) btnSala.title = t.salaTitle;
        if (btnMic)  btnMic.title  = t.micTitle;
        if (btnQA)   btnQA.title   = t.preguntasTitle;
        if (btnSnap) btnSnap.title = t.snapshot;
    }

    _injectHTML() {
        this._btnContainer = document.createElement('div');
        this._btnContainer.id = 'realtime-controls';
        this._btnContainer.className = 'realtime-controls';
        this._btnContainer.innerHTML = `
            <div class="relative group">
                <button id="btn-sala" class="realtime-btn" title="Sala en vivo">
                    <span class="material-symbols-outlined">cast</span>
                    <span class="realtime-btn-dot" id="sala-dot" style="display:none;"></span>
                </button>
                <span class="realtime-btn-tooltip">Sala</span>
            </div>
            <div class="relative group" id="btn-mic-container" style="display:none;">
                <button id="btn-mic" class="realtime-btn" title="Micrófono en vivo">
                    <span class="material-symbols-outlined" id="btn-mic-icon">mic_off</span>
                </button>
                <span class="realtime-btn-tooltip">Micrófono</span>
            </div>
            <div class="relative group" id="btn-qa-container" style="display:none;">
                <button id="btn-qa" class="realtime-btn" title="Preguntas de alumnos">
                    <span class="material-symbols-outlined">forum</span>
                    <span class="rt-qa-topbadge" id="rt-qa-topbadge" style="display:none;"></span>
                </button>
                <span class="realtime-btn-tooltip">Preguntas</span>
            </div>
            <div class="relative group">
                <button id="btn-snapshot" class="realtime-btn" title="Snapshot">
                    <span class="material-symbols-outlined">photo_camera</span>
                </button>
                <span class="realtime-btn-tooltip">Snapshot</span>
            </div>`;

        this._modalSala = document.createElement('div');
        this._modalSala.id = 'modal-sala';
        this._modalSala.className = 'rt-overlay';
        this._modalSala.innerHTML = `<div class="rt-backdrop"></div><div class="rt-panel"><button class="rt-close" id="sala-close"><span class="material-symbols-outlined">close</span></button><div id="sala-content"></div></div>`;

        this._modalSnap = document.createElement('div');
        this._modalSnap.id = 'modal-snapshot';
        this._modalSnap.className = 'rt-overlay';
        this._modalSnap.innerHTML = `<div class="rt-backdrop"></div><div class="rt-panel"><button class="rt-close" id="snap-close"><span class="material-symbols-outlined">close</span></button><div id="snap-content"></div></div>`;

        this._modalQA = document.createElement('div');
        this._modalQA.id = 'modal-qa';
        this._modalQA.className = 'rt-overlay';
        this._modalQA.innerHTML = `
            <div class="rt-backdrop"></div>
            <div class="rt-panel rt-qa-panel">
                <button class="rt-close" id="qa-close"><span class="material-symbols-outlined">close</span></button>
                <div id="qa-pres-header" class="rt-qa-pres-header">
                    <div class="rt-icon" style="width:40px;height:40px;border-radius:12px;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:22px;">forum</span></div>
                    <div>
                        <h3 class="rt-title" style="margin-bottom:2px;">Preguntas de alumnos</h3>
                        <p style="font-size:12px;color:#94a3b8;margin:0;" id="qa-pres-count-label">Sin preguntas aún</p>
                    </div>
                </div>
                <div id="qa-pres-list" class="rt-qa-pres-list">
                    <div class="rt-qa-empty">Aún no hay preguntas</div>
                </div>
            </div>`;

        const topbar = document.querySelector('.VistaPrincipal-root .fixed.top-8.right-8');
        if (topbar) topbar.insertBefore(this._btnContainer, topbar.firstChild);

        this._injectMobileButtons();

        this._viewerChip = document.createElement('div');
        this._viewerChip.id = 'rt-viewer-chip';
        this._viewerChip.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:14px;color:var(--color-primary);font-variation-settings:'FILL' 1;">group</span>
            <span id="rt-viewer-chip-count">0</span>
            <span style="opacity:.55;">conectados</span>`;

        document.body.appendChild(this._modalSala);
        document.body.appendChild(this._modalSnap);
        document.body.appendChild(this._modalQA);
        document.body.appendChild(this._viewerChip);
    }

    _bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-sala') || e.target.closest('#btn-sala-mobile')) {
                this._closeMobileMenu();
                this._openSalaModal();
            }
            if (e.target.closest('#btn-mic') || e.target.closest('#btn-mic-mobile')) { this._closeMobileMenu(); this._toggleVoice(); }

            if (e.target.closest('#btn-snapshot') || e.target.closest('#btn-snapshot-mobile')) {
                this._closeMobileMenu();
                this._openSnapModal();
            }
            if (e.target.closest('#btn-qa') || e.target.closest('#btn-qa-mobile')) { this._closeMobileMenu(); this._openQAModal(); }
            if (e.target.closest('#sala-close') || (e.target.closest('.rt-backdrop') && this._modalSala.classList.contains('visible'))) this._close(this._modalSala);
            if (e.target.closest('#snap-close') || (e.target.closest('.rt-backdrop') && this._modalSnap.classList.contains('visible'))) this._close(this._modalSnap);
            if (e.target.closest('#qa-close') || (e.target.closest('.rt-backdrop') && this._modalQA.classList.contains('visible'))) this._close(this._modalQA);
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this._close(this._modalSala); this._close(this._modalSnap); this._close(this._modalQA); } });

        // Actualizar idioma cuando cambia
        window.addEventListener('lang:change', (e) => { this.lang = e.detail?.lang || this.lang; });

        // MutationObserver: detecta cualquier re-render de VistaPrincipal (idioma, ayuda, equipo, etc.)
        // y re-inyecta los botones del topbar y del menú móvil automáticamente
        const vpContainer = document.getElementById('vista-principal-container');
        if (vpContainer) {
            new MutationObserver(() => {
                requestAnimationFrame(() => {
                    this._reinjectTopbarButtons();
                    this._injectMobileButtons();
                });
            }).observe(vpContainer, { childList: true });
        }
    }

    _reinjectTopbarButtons() {
        if (document.getElementById('realtime-controls')) return;
        const topbar = document.querySelector('.VistaPrincipal-root .fixed.top-8.right-8');
        if (topbar) topbar.insertBefore(this._btnContainer, topbar.firstChild);
        this._updateTopbarLabels();
        this._updateBtn();
    }

    _injectMobileButtons() {
        // Evitar duplicados
        if (document.getElementById('btn-sala-mobile')) return;

        const mobileDropdown = document.querySelector('.VistaPrincipal-root header .absolute.top-full');
        if (!mobileDropdown) return;

        const sep = document.createElement('div');
        sep.className = 'h-px bg-white/10 mx-2 my-1 rt-mobile-sep';

        const t = RealtimeControls.translations[this.lang] || RealtimeControls.translations.es;

        const salaBtn = document.createElement('button');
        salaBtn.id = 'btn-sala-mobile';
        salaBtn.className = 'flex items-center gap-3 px-4 py-2 rounded-xl transition-all VistaPrincipal-menu-item-hover text-sm w-full';
        salaBtn.innerHTML = `<span class="material-symbols-outlined text-xl text-on-surface-dark">cast</span><span class="font-medium">${t.sala}</span>`;

        const micBtn = document.createElement('button');
        micBtn.id = 'btn-mic-mobile';
        micBtn.className = 'flex items-center gap-3 px-4 py-2 rounded-xl transition-all VistaPrincipal-menu-item-hover text-sm w-full';
        micBtn.innerHTML = `<span class="material-symbols-outlined text-xl text-on-surface-dark" id="btn-mic-icon-mobile">mic_off</span><span class="font-medium">${t.mic}</span>`;
        micBtn.style.display = 'none';

        const qaBtn = document.createElement('button');
        qaBtn.id = 'btn-qa-mobile';
        qaBtn.className = 'flex items-center gap-3 px-4 py-2 rounded-xl transition-all VistaPrincipal-menu-item-hover text-sm w-full';
        qaBtn.innerHTML = `<span class="material-symbols-outlined text-xl text-on-surface-dark">forum</span><span class="font-medium">${t.preguntas}</span>`;
        qaBtn.style.display = 'none';

        const snapBtn = document.createElement('button');
        snapBtn.id = 'btn-snapshot-mobile';
        snapBtn.className = 'flex items-center gap-3 px-4 py-2 rounded-xl transition-all VistaPrincipal-menu-item-hover text-sm w-full';
        snapBtn.innerHTML = `<span class="material-symbols-outlined text-xl text-on-surface-dark">photo_camera</span><span class="font-medium">${t.snapshot}</span>`;

        mobileDropdown.insertBefore(sep, mobileDropdown.firstChild);
        mobileDropdown.insertBefore(snapBtn, mobileDropdown.firstChild);
        mobileDropdown.insertBefore(qaBtn, mobileDropdown.firstChild);
        mobileDropdown.insertBefore(micBtn, mobileDropdown.firstChild);
        mobileDropdown.insertBefore(salaBtn, mobileDropdown.firstChild);

        // Restaurar visibilidad si la sala ya estaba activa al re-inyectar
        if (this._roomActive) {
            micBtn.style.display = '';
            qaBtn.style.display = this._qaPresenter ? '' : 'none';
        }
    }

    _open(m) { requestAnimationFrame(() => m.classList.add('visible')); }
    _close(m) { m.classList.remove('visible'); }

    // ─── SALA MODAL ───────────────────────────────────────────

    _openSalaModal() {
        const c = document.getElementById('sala-content');
        if (this._roomActive) {
            this._showSalaActive(c);
        } else {
            this._showSalaMenu(c);
        }
        this._open(this._modalSala);
    }

    _showSalaMenu(c) {
        const t = RealtimeControls.translations[this.lang] || RealtimeControls.translations.es;
        c.innerHTML = `
            <div class="rt-icon"><span class="material-symbols-outlined">cast</span></div>
            <h3 class="rt-title">${t.salaModalTitle}</h3>
            <p class="rt-desc">${t.salaModalDesc}</p>
            <div class="rt-actions" style="flex-direction:column;gap:10px;">
                <button class="rt-btn-primary" id="sala-new-btn" style="width:100%;justify-content:center;display:flex;align-items:center;gap:8px;">
                    <span class="material-symbols-outlined" style="font-size:18px;">add_circle</span> ${t.salaNew}
                </button>
                <button class="rt-btn-secondary" id="sala-existing-btn" style="width:100%;justify-content:center;display:flex;align-items:center;gap:8px;">
                    <span class="material-symbols-outlined" style="font-size:18px;">login</span> ${t.salaExisting}
                </button>
            </div>`;
        setTimeout(() => {
            document.getElementById('sala-new-btn').onclick = () => this._showSalaCreate(c);
            document.getElementById('sala-existing-btn').onclick = () => this._showSalaJoin(c);
        }, 30);
    }

    _showSalaCreate(c) {
        c.innerHTML = `
            <div class="rt-icon"><span class="material-symbols-outlined">add_circle</span></div>
            <h3 class="rt-title">Crear nueva sala</h3>
            <p class="rt-desc">Elige un nombre único para tu sala. Tus alumnos lo usarán para conectarse.</p>
            <div class="rt-input-group">
                <input type="text" id="sala-name-input" class="rt-input" placeholder="ej: fisica-101" maxlength="40" autocomplete="off" spellcheck="false"/>
                <div class="rt-input-status" id="sala-status"></div>
            </div>
            <div class="rt-actions">
                <button class="rt-btn-secondary" id="sala-back">Volver</button>
                <button class="rt-btn-primary" id="sala-create" disabled>Crear sala</button>
            </div>`;
        setTimeout(() => {
            const input = document.getElementById('sala-name-input');
            const status = document.getElementById('sala-status');
            const createBtn = document.getElementById('sala-create');
            let debounce;
            input.focus();
            input.oninput = () => {
                const val = input.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                input.value = val;
                createBtn.disabled = true;
                if (val.length < 3) { status.innerHTML = '<span style="color:#94a3b8;">Mínimo 3 caracteres</span>'; return; }
                status.innerHTML = '<span style="color:#94a3b8;">Verificando...</span>';
                clearTimeout(debounce);
                debounce = setTimeout(() => this._checkRoom(val, status, createBtn), 400);
            };
            createBtn.onclick = () => this._createRoom(input.value.trim());
            document.getElementById('sala-back').onclick = () => this._showSalaMenu(c);
        }, 30);
    }

    _showSalaJoin(c) {
        c.innerHTML = `
            <div class="rt-icon"><span class="material-symbols-outlined">login</span></div>
            <h3 class="rt-title">Conectar a mi sala</h3>
            <p class="rt-desc">Ingresa el nombre de tu sala para reactivarla.</p>
            <div class="rt-input-group">
                <input type="text" id="sala-join-input" class="rt-input" placeholder="ej: fisica-101" maxlength="40" autocomplete="off" spellcheck="false"/>
                <div class="rt-input-status" id="sala-join-status"></div>
            </div>
            <div class="rt-actions">
                <button class="rt-btn-secondary" id="sala-join-back">Volver</button>
                <button class="rt-btn-primary" id="sala-join-go" disabled>Conectar</button>
            </div>`;
        setTimeout(() => {
            const input = document.getElementById('sala-join-input');
            const status = document.getElementById('sala-join-status');
            const goBtn = document.getElementById('sala-join-go');
            let debounce;
            input.focus();
            input.oninput = () => {
                const val = input.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                input.value = val;
                goBtn.disabled = true;
                if (val.length < 3) { status.innerHTML = '<span style="color:#94a3b8;">Mínimo 3 caracteres</span>'; return; }
                status.innerHTML = '<span style="color:#94a3b8;">Buscando...</span>';
                clearTimeout(debounce);
                debounce = setTimeout(() => this._checkRoomExists(val, status, goBtn), 400);
            };
            goBtn.onclick = () => this._joinRoom(input.value.trim());
            document.getElementById('sala-join-back').onclick = () => this._showSalaMenu(c);
        }, 30);
    }

    _showSalaActive(c) {
        const url = this._buildViewerUrl();
        const vIcon = this._voiceActive ? 'mic' : 'mic_off';
        const vStatus = this._voiceActive ? 'Activa' : 'Inactiva';
        const vBtnText = this._voiceActive ? 'Detener' : 'Activar';
        const vBtnClass = this._voiceActive ? 'rt-voice-btn active' : 'rt-voice-btn';
        const vIconColor = this._voiceActive ? 'var(--color-primary)' : '#94a3b8';
        c.innerHTML = `
            <div class="rt-icon" style="background:rgba(22,163,74,0.12);color:#16a34a;"><span class="material-symbols-outlined">cast_connected</span></div>
            <h3 class="rt-title">Sala activa: <span style="color:var(--color-primary);">${this._roomId}</span></h3>
            <p class="rt-desc">Comparte este enlace con tus alumnos para que se unan a tu sala en tiempo real.</p>
            <div class="rt-link-box" id="sala-copy" title="Clic para copiar">
                <code>${url}</code>
                <span class="material-symbols-outlined rt-copy-icon">content_copy</span>
            </div>
            <div class="rt-toast" id="sala-copied">✓ Enlace copiado</div>
            <div class="rt-voice-row">
                <span class="material-symbols-outlined" id="sala-mic-icon" style="font-size:20px;color:${vIconColor};transition:color .3s;">${vIcon}</span>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:600;color:#1a1c1e;line-height:1.2;">Voz en vivo</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;" id="sala-mic-status">${vStatus}</div>
                </div>
                <button class="${vBtnClass}" id="sala-mic-btn">${vBtnText}</button>
            </div>
            <div class="rt-viewers-row">
                <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-primary);font-variation-settings:'FILL' 1;">group</span>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:600;color:#1a1c1e;line-height:1.2;">Espectadores conectados</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;" id="sala-viewer-count">${this._viewerCount === 0 ? 'Ninguno aún' : `${this._viewerCount} conectado${this._viewerCount !== 1 ? 's' : ''}`}</div>
                </div>
                <button class="rt-voice-btn" id="sala-qa-open-btn">Ver preguntas</button>
            </div>
            <div class="rt-actions">
                <button class="rt-btn-danger" id="sala-stop">Cerrar sala</button>
            </div>`;
        setTimeout(() => {
            document.getElementById('sala-copy').onclick = () => this._copy(url, 'sala-copied');
            document.getElementById('sala-stop').onclick = () => this._stopRoom();
            document.getElementById('sala-mic-btn').onclick = () => this._toggleVoice();
            document.getElementById('sala-qa-open-btn').onclick = () => { this._close(this._modalSala); this._openQAModal(); };
        }, 30);
    }

    async _checkRoom(name, statusEl, btn) {
        try {
            const { supabase } = await import('../../realtime/supabase-config.js');
            const { data } = await supabase.from('room_states').select('room_id').eq('room_id', name).maybeSingle();
            if (data) {
                statusEl.innerHTML = '<span style="color:#ef4444;">✗ Este nombre ya está en uso</span>';
                btn.disabled = true;
            } else {
                statusEl.innerHTML = '<span style="color:#16a34a;">✓ Disponible</span>';
                btn.disabled = false;
            }
        } catch (e) { statusEl.innerHTML = '<span style="color:#ef4444;">Error verificando</span>'; }
    }

    async _checkRoomExists(name, statusEl, btn) {
        try {
            const { supabase } = await import('../../realtime/supabase-config.js');
            const { data } = await supabase.from('room_states').select('room_id').eq('room_id', name).maybeSingle();
            if (data) {
                statusEl.innerHTML = '<span style="color:#16a34a;">✓ Sala encontrada</span>';
                btn.disabled = false;
            } else {
                statusEl.innerHTML = '<span style="color:#ef4444;">✗ Sala no encontrada</span>';
                btn.disabled = true;
            }
        } catch (e) { statusEl.innerHTML = '<span style="color:#ef4444;">Error buscando</span>'; }
    }

    async _restoreRoom() {
        const savedRoomId = localStorage.getItem('rt_active_room');
        if (!savedRoomId) return;
        try {
            const { supabase } = await import('../../realtime/supabase-config.js');
            const { data } = await supabase.from('room_states').select('state').eq('room_id', savedRoomId).maybeSingle();
            if (data?.state?.active) {
                console.log(`%c[RT] %cRestaurando sala "${savedRoomId}" desde localStorage`, 'color:#ff6b6b;font-weight:bold;', 'color:#ffd93d;');
                await this._joinRoom(savedRoomId);
            } else {
                localStorage.removeItem('rt_active_room');
            }
        } catch (e) {
            console.warn('[RT] Error restaurando sala:', e);
        }
    }

    async _createRoom(name) {
        this._roomId = name;
        try {
            const { PresenterSync } = await import('../../realtime/presenter.js');
            this._presenter = new PresenterSync(window.Lab.engine, this._roomId);
            await this._presenter.start();
            // Marcar sala como activa
            const { supabase } = await import('../../realtime/supabase-config.js');
            await supabase.from('room_states').update({ state: { ...this._presenter._captureState(), active: true } }).eq('room_id', this._roomId);
            this._roomActive = true;
            localStorage.setItem('rt_active_room', this._roomId);
            await this._startQA();
            this._updateBtn();
            this._showSalaActive(document.getElementById('sala-content'));
        } catch (e) {
            console.error('[RT] Error creando sala:', e);
            alert('Error creando la sala.');
        }
    }

    async _joinRoom(name) {
        this._roomId = name;
        try {
            const { PresenterSync } = await import('../../realtime/presenter.js');
            this._presenter = new PresenterSync(window.Lab.engine, this._roomId);
            await this._presenter.start();
            const { supabase } = await import('../../realtime/supabase-config.js');
            await supabase.from('room_states').update({ state: { ...this._presenter._captureState(), active: true } }).eq('room_id', this._roomId);
            this._roomActive = true;
            localStorage.setItem('rt_active_room', this._roomId);
            await this._startQA();
            this._updateBtn();
            this._showSalaActive(document.getElementById('sala-content'));
        } catch (e) {
            console.error('[RT] Error conectando sala:', e);
            alert('Error conectando a la sala.');
        }
    }

    async _startQA() {
        try {
            const { QAPresenter } = await import('../../realtime/qa.js');
            this._qaPresenter = new QAPresenter(this._roomId);

            this._qaPresenter.onQuestionsUpdate = (questions) => {
                this._qaQuestions = questions;
                this._updateQABadge(questions);
                this._renderQAList(questions);
            };

            this._qaPresenter.onViewerCountChange = (count) => {
                this._updateViewerCountDisplay(count);
            };

            await this._qaPresenter.start();

            const qaContainer = document.getElementById('btn-qa-container');
            if (qaContainer) qaContainer.style.display = '';
            const qaContainerMobile = document.getElementById('btn-qa-mobile');
            if (qaContainerMobile) qaContainerMobile.style.display = '';
        } catch (e) {
            console.warn('[RT] Q&A no disponible:', e);
        }
    }

    _updateQABadge(questions) {
        const pending = questions.filter(q => !q.answered).length;
        const badge = document.getElementById('rt-qa-topbadge');
        if (!badge) return;
        if (pending > 0) {
            badge.textContent = pending;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    _escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    _renderQAList(questions) {
        const list = document.getElementById('qa-pres-list');
        const label = document.getElementById('qa-pres-count-label');
        if (!list) return;

        const total = questions.length;
        const pending = questions.filter(q => !q.answered).length;
        if (label) {
            label.textContent = total === 0
                ? 'Sin preguntas aún'
                : `${total} pregunta${total !== 1 ? 's' : ''} · ${pending} pendiente${pending !== 1 ? 's' : ''}`;
        }

        if (total === 0) {
            list.innerHTML = '<div class="rt-qa-empty">Aún no hay preguntas</div>';
            return;
        }

        list.innerHTML = questions.map(q => `
            <div class="rt-qa-item ${q.answered ? 'rt-qa-answered' : ''}">
                <div class="rt-qa-item-text">${this._escapeHtml(q.question)}</div>
                <div class="rt-qa-item-footer">
                    <span class="rt-qa-status" style="color:${q.answered ? '#16a34a' : '#94a3b8'};">
                        <span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1;">${q.answered ? 'check_circle' : 'schedule'}</span>
                        ${q.answered ? 'Respondida' : 'Pendiente'}
                    </span>
                    ${!q.answered ? `<button class="rt-qa-respond-btn" data-id="${q.id}">Marcar respondida</button>` : ''}
                </div>
            </div>`).join('');

        // Bindear botones de respuesta
        list.querySelectorAll('.rt-qa-respond-btn').forEach(btn => {
            btn.onclick = async () => {
                btn.disabled = true;
                btn.textContent = 'Guardando...';
                await this._qaPresenter?.markAnswered(btn.dataset.id);
            };
        });
    }

    _openQAModal() {
        this._renderQAList(this._qaQuestions);
        this._open(this._modalQA);
    }

    _updateViewerCountDisplay(count) {
        this._viewerCount = count;
        const text = count === 0 ? 'Ninguno aún' : `${count} conectado${count !== 1 ? 's' : ''}`;
        // Modal (solo si está abierto)
        const modalEl = document.getElementById('sala-viewer-count');
        if (modalEl) modalEl.textContent = text;
        // Chip permanente
        const chipCount = document.getElementById('rt-viewer-chip-count');
        if (chipCount) chipCount.textContent = count;
    }

    async _stopRoom() {
        // 0. Detener voz si estaba activa
        if (this._voiceActive) this._stopVoice();

        // 1. Detener el presenter PRIMERO (mata el interval y pending pushes)
        const roomId = this._roomId;
        if (this._presenter) { this._presenter.stop(); this._presenter = null; }

        // 2. Esperar a que cualquier push en vuelo termine
        await new Promise(r => setTimeout(r, 300));

        // 3. AHORA marcar como inactiva en Supabase (sin race condition)
        try {
            const { supabase } = await import('../../realtime/supabase-config.js');
            const { data } = await supabase.from('room_states').select('state').eq('room_id', roomId).maybeSingle();
            const curState = data?.state || {};
            await supabase.from('room_states').update({ state: { ...curState, active: false } }).eq('room_id', roomId);
            console.log('[RT] Sala marcada como inactiva en Supabase ✓');
        } catch (e) { console.warn('[RT] Error marcando sala inactiva:', e); }

        // 4. Borrar todas las preguntas de la sala y detener Q&A
        if (this._qaPresenter) {
            await this._qaPresenter.deleteAllQuestions().catch(() => {});
            this._qaPresenter.stop();
            this._qaPresenter = null;
        }
        this._qaQuestions = [];
        this._viewerCount = 0;
        const qaContainer = document.getElementById('btn-qa-container');
        if (qaContainer) qaContainer.style.display = 'none';
        const qaContainerMobile = document.getElementById('btn-qa-mobile');
        if (qaContainerMobile) qaContainerMobile.style.display = 'none';
        const qaBadge = document.getElementById('rt-qa-topbadge');
        if (qaBadge) qaBadge.style.display = 'none';
        this._close(this._modalQA);

        this._roomActive = false;
        this._roomId = null;
        localStorage.removeItem('rt_active_room');
        this._updateBtn();
        this._close(this._modalSala);
    }

    // ─── VOZ EN VIVO ──────────────────────────────────────────

    _toggleVoice() {
        if (this._voiceActive) {
            this._stopVoice();
        } else {
            this._startVoice();
        }
    }

    async _startVoice() {
        const btn = document.getElementById('sala-mic-btn');
        const status = document.getElementById('sala-mic-status');
        const icon = document.getElementById('sala-mic-icon');
        if (btn) { btn.disabled = true; btn.textContent = 'Iniciando...'; }
        if (status) status.textContent = 'Solicitando permiso...';

        try {
            const { PresenterVoice } = await import('../../realtime/voice.js');
            this._presenterVoice = new PresenterVoice(this._roomId);
            await this._presenterVoice.start();

            // Notificar a los viewers que la voz está activa
            if (this._presenter) this._presenter.voiceActive = true;

            this._voiceActive = true;
            if (icon) { icon.textContent = 'mic'; icon.style.color = 'var(--color-primary)'; }
            if (status) status.textContent = 'Activa';
            if (btn) { btn.textContent = 'Detener'; btn.disabled = false; btn.classList.add('active'); }
            // Topbar y móvil
            const topBtn = document.getElementById('btn-mic');
            const topIcon = document.getElementById('btn-mic-icon');
            if (topIcon) topIcon.textContent = 'mic';
            if (topBtn) topBtn.classList.add('active');
            const mobileIcon = document.getElementById('btn-mic-icon-mobile');
            if (mobileIcon) { mobileIcon.textContent = 'mic'; mobileIcon.style.color = 'var(--color-primary)'; }
        } catch (e) {
            console.error('[Voice] Error iniciando voz:', e);
            const msg = e.name === 'NotAllowedError' ? 'Permiso denegado'
                      : e.name === 'NotFoundError'   ? 'Sin micrófono detectado'
                      : 'Error al activar';
            if (status) status.textContent = msg;
            if (btn) { btn.textContent = 'Activar'; btn.disabled = false; }
            this._presenterVoice = null;
        }
    }

    _stopVoice() {
        if (this._presenterVoice) { this._presenterVoice.stop(); this._presenterVoice = null; }
        if (this._presenter) this._presenter.voiceActive = false;
        this._voiceActive = false;

        const btn = document.getElementById('sala-mic-btn');
        const status = document.getElementById('sala-mic-status');
        const icon = document.getElementById('sala-mic-icon');
        if (icon) { icon.textContent = 'mic_off'; icon.style.color = '#94a3b8'; }
        if (status) status.textContent = 'Inactiva';
        if (btn) { btn.textContent = 'Activar'; btn.classList.remove('active'); }
        // Topbar y móvil
        const topBtn = document.getElementById('btn-mic');
        const topIcon = document.getElementById('btn-mic-icon');
        if (topIcon) topIcon.textContent = 'mic_off';
        if (topBtn) topBtn.classList.remove('active');
        const mobileIcon = document.getElementById('btn-mic-icon-mobile');
        if (mobileIcon) { mobileIcon.textContent = 'mic_off'; mobileIcon.style.color = ''; }
    }

    _updateBtn() {
        const btn = document.getElementById('btn-sala');
        const dot = document.getElementById('sala-dot');
        const micContainer = document.getElementById('btn-mic-container');
        if (!btn || !dot) return;
        btn.classList.toggle('active', this._roomActive);
        dot.style.display = this._roomActive ? 'block' : 'none';
        if (micContainer) micContainer.style.display = this._roomActive ? '' : 'none';
        if (this._viewerChip) this._viewerChip.style.display = this._roomActive ? 'flex' : 'none';

        // Botón móvil sala: colorear icono y texto cuando la sala está activa
        const mobileBtn = document.getElementById('btn-sala-mobile');
        if (mobileBtn) {
            const icon = mobileBtn.querySelector('.material-symbols-outlined');
            const label = mobileBtn.querySelector('span:not(.material-symbols-outlined)');
            const color = this._roomActive ? 'var(--color-primary)' : '';
            if (icon) { icon.style.color = color; icon.style.fontVariationSettings = this._roomActive ? "'FILL' 1" : ''; }
            if (label) label.style.color = color;
        }
        // Botón móvil micrófono: solo visible si la sala está activa
        const mobileMicBtn = document.getElementById('btn-mic-mobile');
        if (mobileMicBtn) mobileMicBtn.style.display = this._roomActive ? '' : 'none';
    }

    // ─── SNAPSHOT MODAL ───────────────────────────────────────

    _openSnapModal() {
        const t = RealtimeControls.translations[this.lang] || RealtimeControls.translations.es;
        const c = document.getElementById('snap-content');
        c.innerHTML = `
            <div class="rt-icon"><span class="material-symbols-outlined">photo_camera</span></div>
            <h3 class="rt-title">${t.snapModalTitle}</h3>
            <p class="rt-desc">${t.snapModalDesc}</p>
            <div class="rt-actions">
                <button class="rt-btn-secondary" id="snap-cancel">${t.snapCancel}</button>
                <button class="rt-btn-primary" id="snap-take">${t.snapTake}</button>
            </div>`;
        this._open(this._modalSnap);
        setTimeout(() => {
            document.getElementById('snap-take').onclick = () => this._takeSnap();
            document.getElementById('snap-cancel').onclick = () => this._close(this._modalSnap);
        }, 30);
    }

    async _takeSnap() {
        const texts = RealtimeControls.translations[this.lang] || RealtimeControls.translations.es;
        const c = document.getElementById('snap-content');
        try {
            c.innerHTML = `<div class="rt-icon"><span class="material-symbols-outlined">hourglass_top</span></div><h3 class="rt-title">${texts.snapSaving}</h3>`;
            const engine = window.Lab.engine;
            const cam = engine.instance.camera;
            const ctrl = engine.instance.controls;
            const target = ctrl.targetObj ? ctrl.targetObj.position : ctrl.target;
            const state = {
                active: false,
                currentPaso: window.Lab?.currentPasoId || null,
                currentPasoHighlight: window.Lab?.currentPasoHighlight || false,
                camera: { position: { x:+cam.position.x.toFixed(2), y:+cam.position.y.toFixed(2), z:+cam.position.z.toFixed(2) }, target: { x:+target.x.toFixed(2), y:+target.y.toFixed(2), z:+target.z.toFixed(2) } },
                action: null, 
                ui: { lang: document.body.classList.contains('lang-en') ? 'en' : 'es' }
            };
            const { supabase } = await import('../../realtime/supabase-config.js');
            const snapId = crypto.randomUUID().replace(/-/g, '').substring(0, 6);
            const roomId = this._roomId || 'standalone';
            // Asegurar que el room existe (FK constraint en snapshots)
            if (!this._roomId) {
                await supabase.from('room_states').upsert(
                    { room_id: 'standalone', state: { active: false }, presenter_id: 'snapshot' },
                    { onConflict: 'room_id' }
                );
            }
            const { error } = await supabase.from('snapshots').insert({ id: snapId, room_id: roomId, state });
            if (error) throw new Error(error.message);
            const url = this._buildSnapshotUrl(snapId);
            c.innerHTML = `
                <div class="rt-icon" style="background:rgba(22,163,74,0.12);color:#16a34a;"><span class="material-symbols-outlined">check_circle</span></div>
                <h3 class="rt-title">${texts.snapDone}</h3>
                <p class="rt-desc">${texts.snapDoneDesc}</p>
                <div class="rt-link-box" id="snap-copy" title="Clic para copiar"><code>${url}</code><span class="material-symbols-outlined rt-copy-icon">content_copy</span></div>
                <div class="rt-toast" id="snap-copied">✓ Enlace copiado</div>`;
            setTimeout(() => { document.getElementById('snap-copy').onclick = () => this._copy(url, 'snap-copied'); }, 30);
        } catch (e) {
            console.error('[RT] Snapshot error:', e);
            c.innerHTML = `<div class="rt-icon" style="background:rgba(239,68,68,0.12);color:#ef4444;"><span class="material-symbols-outlined">error</span></div><h3 class="rt-title">Error</h3><p class="rt-desc">${e.message}</p>`;
        }
    }

    // ─── HELPERS ──────────────────────────────────────────────

    _buildViewerUrl() {
        const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
        return `${base}/viewer.html?room=${this._roomId}`;
    }
    _buildSnapshotUrl(id) {
        const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
        if (this._roomId) {
            return `${base}/viewer.html?room=${this._roomId}&snapshot=${id}`;
        }
        return `${base}/viewer.html?snapshot=${id}`;
    }
    _copy(text, toastId) {
        navigator.clipboard.writeText(text).then(() => {
            const t = document.getElementById(toastId);
            if (t) { t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
        });
    }

    _closeMobileMenu() {
        const toggle = document.getElementById('menu-toggle');
        if (toggle) toggle.checked = false;
    }

    // ─── STYLES ──────────────────────────────────────────────

    _injectStyles() {
        if (document.getElementById('rt-styles')) return;
        const s = document.createElement('style');
        s.id = 'rt-styles';
        s.textContent = `
.realtime-controls{display:flex;align-items:center;gap:12px}
.realtime-btn{position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.4);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);cursor:pointer;transition:all .4s cubic-bezier(.4,0,.2,1);box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);color:var(--color-text-dark,#1a1c1e)}
.realtime-btn:hover,.realtime-btn.active{background:rgba(var(--color-primary-rgb),0.2)!important;color:var(--color-primary)!important;border-color:rgba(var(--color-primary-rgb),0.3)!important;box-shadow:0 0 20px rgba(var(--color-primary-rgb),0.4)}
.realtime-btn:hover .material-symbols-outlined,.realtime-btn.active .material-symbols-outlined{color:var(--color-primary)!important;font-variation-settings:'FILL' 1!important}
.realtime-btn-dot{position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px rgba(239,68,68,0.6);animation:rt-pulse 2s ease-in-out infinite}
@keyframes rt-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(.85)}}
.realtime-btn-tooltip{position:absolute;top:100%;margin-top:8px;right:0;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:500;white-space:nowrap;background:rgba(255,255,255,0.4);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.3);color:var(--color-primary);opacity:0;transform:translateY(8px);pointer-events:none;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.relative.group:hover .realtime-btn-tooltip{opacity:1;transform:translateY(0)}
.rt-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .3s}
.rt-overlay.visible{opacity:1;pointer-events:auto}
.rt-backdrop{position:absolute;inset:0;background:rgba(11,19,38,0.4);backdrop-filter:blur(8px)}
.rt-panel{position:relative;z-index:10;width:100%;max-width:460px;border-radius:20px;padding:32px;background:rgba(255,255,255,0.88);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.5);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);transform:scale(.9) translateY(20px);transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;opacity:0}
.rt-overlay.visible .rt-panel{transform:scale(1) translateY(0);opacity:1}
.rt-close{position:absolute;top:16px;right:16px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:none;background:transparent;color:#1a1c1e;cursor:pointer;transition:background .2s}
.rt-close:hover{background:rgba(0,0,0,0.06)}
.rt-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:rgba(var(--color-primary-rgb),0.12);color:var(--color-primary);box-shadow:0 0 20px rgba(var(--color-primary-rgb),0.15)}
.rt-icon .material-symbols-outlined{font-size:28px;font-variation-settings:'FILL' 1}
.rt-title{font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:#1a1c1e;margin-bottom:8px;letter-spacing:-0.01em}
.rt-desc{font-family:'Inter',sans-serif;font-size:14px;color:#44474e;line-height:1.6;margin-bottom:24px}
.rt-actions{display:flex;gap:12px;justify-content:flex-end}
.rt-btn-primary{padding:10px 24px;border-radius:12px;border:none;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .3s;background:var(--gradient-primary,var(--color-primary));color:#fff;box-shadow:0 4px 16px rgba(var(--color-primary-rgb),0.35)}
.rt-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(var(--color-primary-rgb),0.45)}
.rt-btn-primary:disabled{opacity:0.4;cursor:not-allowed}
.rt-btn-secondary{padding:10px 24px;border-radius:12px;border:1px solid rgba(0,0,0,0.1);font-family:'Inter',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;background:transparent;color:#44474e}
.rt-btn-secondary:hover{background:rgba(0,0,0,0.04)}
.rt-btn-danger{padding:10px 24px;border-radius:12px;border:1px solid rgba(239,68,68,0.2);font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .3s;background:rgba(239,68,68,0.08);color:#ef4444}
.rt-btn-danger:hover{background:rgba(239,68,68,0.15)}
.rt-input-group{margin-bottom:20px}
.rt-input{width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(0,0,0,0.12);font-family:'Inter',sans-serif;font-size:15px;font-weight:500;background:rgba(255,255,255,0.6);color:#1a1c1e;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
.rt-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(var(--color-primary-rgb),0.15)}
.rt-input::placeholder{color:#94a3b8}
.rt-input-status{margin-top:8px;font-size:13px;font-weight:500;min-height:20px}
.rt-link-box{background:rgba(var(--color-primary-rgb),0.06);border:1px solid rgba(var(--color-primary-rgb),0.15);border-radius:12px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .2s}
.rt-link-box:hover{background:rgba(var(--color-primary-rgb),0.1);border-color:rgba(var(--color-primary-rgb),0.25)}
.rt-link-box code{flex:1;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;color:var(--color-primary);word-break:break-all;line-height:1.4}
.rt-copy-icon{flex-shrink:0;color:var(--color-primary);opacity:.6;transition:opacity .2s}
.rt-link-box:hover .rt-copy-icon{opacity:1}
.rt-toast{font-size:12px;color:#16a34a;font-weight:600;margin-top:4px;margin-bottom:16px;opacity:0;transition:opacity .3s}
.rt-toast.show{opacity:1}
.rt-voice-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.06);margin-bottom:16px}
.rt-voice-btn{padding:7px 16px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:#44474e;white-space:nowrap}
.rt-voice-btn:hover:not(:disabled){background:rgba(0,0,0,0.04)}
.rt-voice-btn.active{background:rgba(var(--color-primary-rgb),0.1);color:var(--color-primary);border-color:rgba(var(--color-primary-rgb),0.25)}
.rt-voice-btn:disabled{opacity:.5;cursor:not-allowed}
.rt-viewers-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.06);margin-bottom:16px}
#rt-viewer-chip{position:fixed;top:92px;right:20px;z-index:45;display:none;align-items:center;gap:6px;padding:5px 12px 5px 10px;border-radius:20px;background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.35);font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:#1a1c1e;box-shadow:0 4px 16px rgba(0,0,0,0.07);pointer-events:none;animation:rt-chip-in .4s cubic-bezier(.34,1.56,.64,1)}
@keyframes rt-chip-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.rt-qa-topbadge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:var(--color-primary);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid rgba(255,255,255,0.85);pointer-events:none}
.rt-qa-panel{max-height:80vh;display:flex;flex-direction:column;padding:28px 0 0}
.rt-qa-pres-header{display:flex;align-items:center;gap:14px;padding:0 28px 16px;border-bottom:1px solid rgba(0,0,0,0.06);flex-shrink:0}
.rt-qa-pres-list{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-height:120px;max-height:52vh}
.rt-qa-empty{text-align:center;color:#94a3b8;font-family:'Inter',sans-serif;font-size:13px;padding:28px 0}
.rt-qa-item{border-radius:12px;padding:12px 14px;background:#f8f9fb;border:1px solid rgba(0,0,0,0.06);transition:border-color .3s,background .3s}
.rt-qa-item.rt-qa-answered{background:rgba(22,163,74,0.05);border-color:rgba(22,163,74,0.18)}
.rt-qa-item-text{font-family:'Inter',sans-serif;font-size:13px;color:#1a1c1e;line-height:1.55;word-break:break-word;margin-bottom:8px}
.rt-qa-item-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rt-qa-status{display:flex;align-items:center;gap:4px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600}
.rt-qa-respond-btn{padding:5px 14px;border-radius:8px;border:none;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;cursor:pointer;background:var(--color-primary);color:#fff;transition:opacity .2s;flex-shrink:0}
.rt-qa-respond-btn:hover:not(:disabled){opacity:.85}
.rt-qa-respond-btn:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:767px){#rt-viewer-chip{top:28px;right:auto;left:16px;}}
`;
        document.head.appendChild(s);
    }
}
