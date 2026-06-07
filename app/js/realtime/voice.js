/**
 * voice.js — Voz en tiempo real via WebRTC + Supabase Broadcast
 * Sin migraciones SQL. El audio viaja P2P directo (~24 kbps Opus).
 * Señalización efímera via Supabase Broadcast (no persiste en DB).
 */
import { supabase } from './supabase-config.js';

const ICE = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Nombres de evento cortos para minimizar payload (internet lento)
// req = request-audio, off = offer, ans = answer
// ic-p = ice-candidate-presenter, ic-v = ice-candidate-viewer, bye = bye

// ─── Presentador ─────────────────────────────────────────────────────────────

export class PresenterVoice {
    constructor(roomId) {
        this.roomId = roomId;
        this._stream = null;
        this._peers = new Map(); // viewerId → RTCPeerConnection
        this._ch = null;
        this._active = false;
    }

    /** Pide permiso del micrófono y se suscribe al canal de señalización */
    async start() {
        this._stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
        });
        this._active = true;
        await this._subscribe();
        console.log('[Voice] Presentador: micrófono activo');
    }

    /** Detiene todo: peer connections, stream y canal */
    stop() {
        this._active = false;
        this._peers.forEach(pc => pc.close());
        this._peers.clear();
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._ch) { supabase.removeChannel(this._ch); this._ch = null; }
        console.log('[Voice] Presentador: detenido');
    }

    setMuted(muted) {
        this._stream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }

    get peerCount() { return this._peers.size; }

    // ── Internos ──────────────────────────────────────────────────────────────

    _subscribe() {
        return new Promise(resolve => {
            this._ch = supabase.channel(`v-${this.roomId}`)
                .on('broadcast', { event: 'req' }, ({ payload }) => {
                    if (this._active) this._createOffer(payload.vid);
                })
                .on('broadcast', { event: 'ans' }, ({ payload }) => {
                    const pc = this._peers.get(payload.vid);
                    if (pc) pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(() => {});
                })
                .on('broadcast', { event: 'ic-v' }, ({ payload }) => {
                    const pc = this._peers.get(payload.vid);
                    if (pc && payload.c) pc.addIceCandidate(new RTCIceCandidate(payload.c)).catch(() => {});
                })
                .on('broadcast', { event: 'bye' }, ({ payload }) => {
                    const pc = this._peers.get(payload.vid);
                    if (pc) { pc.close(); this._peers.delete(payload.vid); }
                })
                .subscribe(s => { if (s === 'SUBSCRIBED') resolve(); });
        });
    }

    async _createOffer(vid) {
        if (this._peers.has(vid)) return; // evitar duplicados si el viewer reintenta
        const pc = new RTCPeerConnection(ICE);
        this._peers.set(vid, pc);

        this._stream.getAudioTracks().forEach(t => pc.addTrack(t, this._stream));

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this._ch.send({ type: 'broadcast', event: 'ic-p', payload: { vid, c: candidate.toJSON() } });
            }
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            console.log(`[Voice] Viewer ${vid.substring(0, 6)}: ${s}`);
            if (s === 'connected') {
                // Limitar bitrate una vez conectado (ayuda en internet lento)
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) {
                    const p = sender.getParameters();
                    if (!p.encodings?.length) p.encodings = [{}];
                    p.encodings[0].maxBitrate = 24000; // Opus ~24 kbps para voz
                    sender.setParameters(p).catch(() => {});
                }
            }
            if (s === 'failed' || s === 'closed') {
                this._peers.delete(vid);
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this._ch.send({
            type: 'broadcast', event: 'off',
            payload: { vid, sdp: { type: offer.type, sdp: offer.sdp } }
        });
    }
}

// ─── Viewer ──────────────────────────────────────────────────────────────────

export class ViewerVoice {
    constructor(roomId) {
        this.roomId = roomId;
        this._vid = crypto.randomUUID();
        this._pc = null;
        this._ch = null;
        this._audio = null;
        this._active = false;
        this.onConnected = null;
        this.onFailed = null;
    }

    /** Se suscribe al canal, luego solicita audio al presentador */
    async start() {
        this._active = true;

        this._audio = document.createElement('audio');
        this._audio.autoplay = true;
        this._audio.style.display = 'none';
        document.body.appendChild(this._audio);

        // Esperar suscripción antes de enviar request (para no perder el offer)
        await new Promise(resolve => {
            this._ch = supabase.channel(`v-${this.roomId}`)
                .on('broadcast', { event: 'off' }, ({ payload }) => {
                    if (this._active && payload.vid === this._vid) this._handleOffer(payload.sdp);
                })
                .on('broadcast', { event: 'ic-p' }, ({ payload }) => {
                    if (payload.vid === this._vid && this._pc && payload.c) {
                        this._pc.addIceCandidate(new RTCIceCandidate(payload.c)).catch(() => {});
                    }
                })
                .subscribe(s => { if (s === 'SUBSCRIBED') resolve(); });
        });

        // Suscrito → seguro enviar request
        this._ch.send({ type: 'broadcast', event: 'req', payload: { vid: this._vid } });
        console.log('[Voice] Viewer: audio solicitado');
    }

    stop() {
        this._active = false;
        try { this._ch?.send({ type: 'broadcast', event: 'bye', payload: { vid: this._vid } }); } catch (_) {}
        if (this._ch) { supabase.removeChannel(this._ch); this._ch = null; }
        if (this._pc) { this._pc.close(); this._pc = null; }
        if (this._audio) { this._audio.srcObject = null; this._audio.remove(); this._audio = null; }
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    async _handleOffer(offerSdp) {
        this._pc = new RTCPeerConnection(ICE);

        this._pc.ontrack = ({ streams }) => {
            if (streams[0] && this._audio) {
                this._audio.srcObject = streams[0];
                // Llamada explícita a play() necesaria en iOS Safari
                this._audio.play().catch(e => console.warn('[Voice] Autoplay bloqueado:', e));
                console.log('[Voice] Viewer: audio recibido ✓');
            }
        };

        this._pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this._ch.send({ type: 'broadcast', event: 'ic-v', payload: { vid: this._vid, c: candidate.toJSON() } });
            }
        };

        this._pc.onconnectionstatechange = () => {
            const s = this._pc?.connectionState;
            console.log(`[Voice] Viewer estado: ${s}`);
            if (s === 'connected') this.onConnected?.();
            if (s === 'failed') this.onFailed?.();
        };

        await this._pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        this._ch.send({
            type: 'broadcast', event: 'ans',
            payload: { vid: this._vid, sdp: { type: answer.type, sdp: answer.sdp } }
        });
    }
}
