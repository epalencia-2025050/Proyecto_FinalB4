-- ============================================================================
-- MIGRACIÓN V2: REMEDIACIÓN AUDITORÍA TÉCNICA
-- ============================================================================

-- 1. Agregar columna es_ahorro a ingresos si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ingresos' AND column_name = 'es_ahorro'
    ) THEN
        ALTER TABLE ingresos ADD COLUMN es_ahorro BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 2. Migrar registros que tenían el tag [AHORRO] en la descripción
UPDATE ingresos 
SET 
    es_ahorro = TRUE,
    descripcion = TRIM(REGEXP_REPLACE(descripcion, '^\[AHORRO\]\s*', ''))
WHERE descripcion LIKE '%[AHORRO]%';

-- 3. Crear tabla de configuración de usuario (persistencia de datos bancarios y avatar)
CREATE TABLE IF NOT EXISTS configuracion_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_banco VARCHAR(150),
    numero_cuenta VARCHAR(100),
    tipo_cuenta VARCHAR(50) DEFAULT 'Cuenta corriente',
    tax_id VARCHAR(50),
    frecuencia_pago VARCHAR(50) DEFAULT 'Mensual',
    moneda VARCHAR(10) DEFAULT 'GTQ',
    avatar_url TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_configuracion_usuario_id ON configuracion_usuario(usuario_id);

-- Trigger para mantener fecha_actualizacion al día
DROP TRIGGER IF EXISTS trg_configuracion_actualizacion ON configuracion_usuario;
CREATE TRIGGER trg_configuracion_actualizacion
BEFORE UPDATE ON configuracion_usuario
FOR EACH ROW
EXECUTE FUNCTION set_fecha_actualizacion();

-- 4. Restricciones CHECK para montos mayores a 0 si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_schema = 'public' AND table_name = 'ingresos' AND constraint_name = 'chk_ingresos_monto_pos'
    ) THEN
        ALTER TABLE ingresos ADD CONSTRAINT chk_ingresos_monto_pos CHECK (monto > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_schema = 'public' AND table_name = 'gastos' AND constraint_name = 'chk_gastos_monto_pos'
    ) THEN
        ALTER TABLE gastos ADD CONSTRAINT chk_gastos_monto_pos CHECK (monto > 0);
    END IF;
END $$;

