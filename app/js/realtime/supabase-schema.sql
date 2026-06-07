-- ============================================================
-- SUPABASE SCHEMA: Sistema de Colaboración en Tiempo Real
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Habilitar la extensión para UUIDs (generalmente ya está habilitada)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: room_states
-- Una fila por sala. El presentador actualiza el estado con upsert.
-- ============================================================
CREATE TABLE IF NOT EXISTS room_states (
    room_id       TEXT PRIMARY KEY,
    state         JSONB NOT NULL DEFAULT '{}'::jsonb,
    presenter_id  TEXT NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas por presenter_id
CREATE INDEX IF NOT EXISTS idx_room_states_presenter 
    ON room_states (presenter_id);

-- Trigger para auto-actualizar updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION update_room_states_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_states_updated_at ON room_states;
CREATE TRIGGER trg_room_states_updated_at
    BEFORE UPDATE ON room_states
    FOR EACH ROW
    EXECUTE FUNCTION update_room_states_timestamp();

-- ============================================================
-- TABLA: snapshots
-- Capturas del estado de la escena, vinculadas a una sala.
-- ============================================================
CREATE TABLE IF NOT EXISTS snapshots (
    id          TEXT PRIMARY KEY,
    room_id     TEXT NOT NULL REFERENCES room_states(room_id) ON DELETE CASCADE,
    state       JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para buscar snapshots por sala
CREATE INDEX IF NOT EXISTS idx_snapshots_room 
    ON snapshots (room_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE room_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- ─── room_states ─────────────────────────────────────────────

-- LECTURA: Cualquiera puede leer (viewers anónimos)
CREATE POLICY "room_states_select_all"
    ON room_states
    FOR SELECT
    USING (true);

-- INSERTAR: Cualquiera puede crear una sala (el presenter_id queda registrado)
CREATE POLICY "room_states_insert"
    ON room_states
    FOR INSERT
    WITH CHECK (true);

-- ACTUALIZAR: Solo el presentador original puede modificar la fila
-- Se compara el presenter_id enviado en el payload con el almacenado
CREATE POLICY "room_states_update_presenter"
    ON room_states
    FOR UPDATE
    USING (true)
    WITH CHECK (presenter_id = presenter_id);

-- ─── snapshots ───────────────────────────────────────────────

-- LECTURA: Cualquiera puede leer snapshots
CREATE POLICY "snapshots_select_all"
    ON snapshots
    FOR SELECT
    USING (true);

-- INSERTAR: Cualquiera con la anon key puede crear snapshots
-- (el presentador es quien llama saveSnapshot desde el frontend)
CREATE POLICY "snapshots_insert"
    ON snapshots
    FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- TABLA: room_questions
-- Preguntas enviadas por los viewers durante una sala activa.
-- Se eliminan en cascada cuando se borra la sala (o manualmente al cerrarla).
-- ============================================================
CREATE TABLE IF NOT EXISTS room_questions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     TEXT NOT NULL REFERENCES room_states(room_id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    viewer_id   TEXT NOT NULL,
    answered    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_questions_room
    ON room_questions (room_id, created_at);

-- RLS
ALTER TABLE room_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_questions_select" ON room_questions FOR SELECT USING (true);
CREATE POLICY "room_questions_insert" ON room_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "room_questions_update" ON room_questions FOR UPDATE USING (true);
CREATE POLICY "room_questions_delete" ON room_questions FOR DELETE USING (true);

-- ============================================================
-- HABILITAR REALTIME para room_states y room_questions
-- Esto permite que Supabase Realtime envíe eventos postgres_changes
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE room_states;
ALTER PUBLICATION supabase_realtime ADD TABLE room_questions;

-- ============================================================
-- VERIFICACIÓN: Ejecutar después para confirmar
-- ============================================================
-- SELECT * FROM room_states;
-- SELECT * FROM snapshots;
-- SELECT * FROM room_questions;
-- SELECT schemaname, tablename, policyname FROM pg_policies
--     WHERE tablename IN ('room_states', 'snapshots', 'room_questions');
