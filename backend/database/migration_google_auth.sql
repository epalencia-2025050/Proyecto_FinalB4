-- ============================================================================
-- MIGRACION: AGREGAR SOPORTE PARA GOOGLE LOGIN (google_id)
-- ============================================================================

-- 1. Agregar columna google_id si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL;

-- 2. Crear indice UNIQUE para google_id (evita asociar misma cuenta a multiples usuarios)
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_id ON usuarios (google_id) WHERE google_id IS NOT NULL;
