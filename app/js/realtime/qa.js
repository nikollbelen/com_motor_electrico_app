/**
 * qa.js — Sistema de Preguntas y Respuestas en Tiempo Real
 *
 * QAViewer: el viewer puede enviar preguntas y ver su estado (respondida / pendiente).
 * QAPresenter: el presentador ve todas las preguntas y puede marcarlas como respondidas.
 *
 * Presence channel: ambos comparten "presence-{roomId}" para que el presentador
 * pueda contar cuántos viewers hay conectados sin polling manual.
 */

import { supabase } from './supabase-config.js';

// ─── VIEWER ────────────────────────────────────────────────────

export class QAViewer {
    constructor(roomId) {
        this.roomId = roomId;
        // ID persistente por dispositivo — localStorage sobrevive cierres de pestaña
        this.viewerId = localStorage.getItem('qa_viewer_id')
            || crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        localStorage.setItem('qa_viewer_id', this.viewerId);

        this._channel = null;
        this._presenceChannel = null;
        this.onQuestionsUpdate = null; // callback(questions: [{id, question, answered, created_at}])
    }

    async start() {
        this._joinPresence();
        this._subscribeToUpdates();
        await this._fetchMyQuestions();
    }

    _joinPresence() {
        this._presenceChannel = supabase.channel(`presence-${this.roomId}`, {
            config: { presence: { key: this.viewerId } }
        });
        this._presenceChannel
            .on('presence', { event: 'sync' }, () => {})
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Registrar presencia (Supabase envía heartbeats automáticamente)
                    await this._presenceChannel.track({ viewerId: this.viewerId });
                }
            });
    }

    _subscribeToUpdates() {
        this._channel = supabase.channel(`qa-viewer-${this.roomId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'room_questions',
                filter: `room_id=eq.${this.roomId}`
            }, () => this._fetchMyQuestions())
            .subscribe((status) => {
                // Reconexión automática en timeout
                if (status === 'TIMED_OUT') this._fetchMyQuestions();
            });
    }

    async _fetchMyQuestions() {
        const { data } = await supabase
            .from('room_questions')
            .select('id, question, answered, created_at')
            .eq('room_id', this.roomId)
            .eq('viewer_id', this.viewerId)
            .order('created_at', { ascending: true });
        if (this.onQuestionsUpdate) this.onQuestionsUpdate(data || []);
    }

    async sendQuestion(text) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const { error } = await supabase.from('room_questions').insert({
            room_id: this.roomId,
            question: trimmed,
            viewer_id: this.viewerId
        });
        if (error) throw error;
    }

    stop() {
        if (this._channel) { supabase.removeChannel(this._channel); this._channel = null; }
        if (this._presenceChannel) { supabase.removeChannel(this._presenceChannel); this._presenceChannel = null; }
    }
}

// ─── PRESENTER ─────────────────────────────────────────────────

export class QAPresenter {
    constructor(roomId) {
        this.roomId = roomId;
        this._channel = null;
        this._presenceChannel = null;
        this.onQuestionsUpdate = null;   // callback(questions: [{id, question, answered, created_at}])
        this.onViewerCountChange = null; // callback(count: number)
    }

    async start() {
        this._subscribeToQuestions();
        this._subscribeToPresence();
        await this._fetchQuestions();
    }

    async _fetchQuestions() {
        const { data } = await supabase
            .from('room_questions')
            .select('id, question, answered, created_at')
            .eq('room_id', this.roomId)
            .order('created_at', { ascending: true });
        if (this.onQuestionsUpdate) this.onQuestionsUpdate(data || []);
    }

    _subscribeToQuestions() {
        this._channel = supabase.channel(`qa-presenter-${this.roomId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'room_questions',
                filter: `room_id=eq.${this.roomId}`
            }, () => this._fetchQuestions())
            .subscribe((status) => {
                if (status === 'TIMED_OUT') this._fetchQuestions();
            });
    }

    _subscribeToPresence() {
        this._presenceChannel = supabase.channel(`presence-${this.roomId}`);
        this._presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = this._presenceChannel.presenceState();
                const count = Object.keys(state).length;
                if (this.onViewerCountChange) this.onViewerCountChange(count);
            })
            .subscribe((status) => {
                // Disparar con 0 inmediatamente al conectarse para salir de "Calculando..."
                if (status === 'SUBSCRIBED') {
                    const state = this._presenceChannel.presenceState();
                    const count = Object.keys(state).length;
                    if (this.onViewerCountChange) this.onViewerCountChange(count);
                }
            });
    }

    async markAnswered(questionId) {
        const { error } = await supabase
            .from('room_questions')
            .update({ answered: true })
            .eq('id', questionId);
        if (error) console.error('[QA] Error marcando respondida:', error);
    }

    async deleteAllQuestions() {
        await supabase.from('room_questions').delete().eq('room_id', this.roomId);
    }

    stop() {
        if (this._channel) { supabase.removeChannel(this._channel); this._channel = null; }
        if (this._presenceChannel) { supabase.removeChannel(this._presenceChannel); this._presenceChannel = null; }
    }
}
