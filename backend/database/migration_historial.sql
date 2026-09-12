-- ============================================================================
-- MIGRACIÓN: HISTORIAL PERSISTENTE DE TRANSACCIONES
-- Estructura independiente para almacenar el historial de transacciones (auditoría)
-- Permite conservar registros históricos aun si el ingreso/gasto original es eliminado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS historial_transacciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO', 'GASTO')),
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('CREADO', 'EDITADO', 'ELIMINADO')),
    descripcion VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
    fecha_transaccion DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'completado',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referencia_id INT -- ID del registro original (sin FK en cascada para preservar el historial ante eliminación)
);

-- Índices para optimizar consultas por usuario, filtros y orden cronológico
CREATE INDEX IF NOT EXISTS idx_historial_usuario_id ON historial_transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial_transacciones(accion);
CREATE INDEX IF NOT EXISTS idx_historial_fecha_transaccion ON historial_transacciones(fecha_transaccion);
CREATE INDEX IF NOT EXISTS idx_historial_fecha_registro ON historial_transacciones(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_historial_referencia_id ON historial_transacciones(referencia_id);

-- Poblar historial inicial con los ingresos y gastos existentes (idempotente)
INSERT INTO historial_transacciones (usuario_id, tipo, accion, descripcion, categoria, monto, fecha_transaccion, estado, fecha_registro, referencia_id)
SELECT usuario_id, 'INGRESO', 'CREADO', descripcion, categoria, monto, fecha, estado, fecha_creacion, id
FROM ingresos
WHERE NOT EXISTS (
    SELECT 1 FROM historial_transacciones 
    WHERE tipo = 'INGRESO' AND referencia_id = ingresos.id
);

INSERT INTO historial_transacciones (usuario_id, tipo, accion, descripcion, categoria, monto, fecha_transaccion, estado, fecha_registro, referencia_id)
SELECT usuario_id, 'GASTO', 'CREADO', descripcion, categoria, monto, fecha, estado, fecha_creacion, id
FROM gastos
WHERE NOT EXISTS (
    SELECT 1 FROM historial_transacciones 
    WHERE tipo = 'GASTO' AND referencia_id = gastos.id
);

