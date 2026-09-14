import fs from 'fs';
import path from 'path';
import { Client, PoolClient } from 'pg';
import { env } from './env';
import { pool } from './database';

/**
 * Busca y retorna la ruta absoluta a la carpeta 'database'.
 */
function findDatabaseDirectory(): string {
  const candidatePaths = [
    path.resolve(__dirname, '../../database'),
    path.resolve(process.cwd(), 'database'),
    path.resolve(process.cwd(), 'backend/database'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(
    `No se pudo encontrar el directorio de scripts SQL 'database'. Rutas evaluadas: ${candidatePaths.join(', ')}`
  );
}

/**
 * Verifica si la base de datos PostgreSQL de destino existe en el servidor.
 * Si no existe, se conecta a la base de datos administrativa 'postgres' y la crea.
 */
export async function ensureDatabaseExists(): Promise<void> {
  const targetDb = env.db.database;

  // Validación básica del identificador de la base de datos para prevenir inyecciones
  if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) {
    throw new Error(`Nombre de base de datos no permitido: "${targetDb}"`);
  }

  const adminClient = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();

    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (res.rowCount === 0) {
      console.log(`📦 La base de datos "${targetDb}" no existe. Creándola automáticamente...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Base de datos "${targetDb}" creada exitosamente.`);
    } else {
      console.log(`🔍 Base de datos "${targetDb}" detectada correctamente.`);
    }
  } catch (error) {
    console.error(`❌ Error al verificar o crear la base de datos "${targetDb}":`, error);
    throw error;
  } finally {
    try {
      await adminClient.end();
    } catch {
      // Ignorar error al cerrar conexión administrativa
    }
  }
}

/**
 * Ejecuta los esquemas, migraciones y semillas dentro de la base de datos destino.
 */
export async function runDatabaseMigrationsAndSeeds(client: PoolClient): Promise<void> {
  const dbDir = findDatabaseDirectory();

  // 1. Esquema base y migraciones de estructura
  const structuralScripts = [
    'schema.sql',
    'migration_add_rol.sql',
    'migration_google_auth.sql',
    'migration_finanzas.sql',
    'migration_v2_auditoria.sql',
    'migration_historial.sql',
  ];

  for (const file of structuralScripts) {
    const filePath = path.join(dbDir, file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      if (sql.trim().length > 0) {
        await client.query(sql);
      }
    }
  }

  // 2. Semillas de usuarios (idempotente mediante ON CONFLICT DO NOTHING)
  const seedUsersPath = path.join(dbDir, 'seed.sql');
  if (fs.existsSync(seedUsersPath)) {
    const seedSql = fs.readFileSync(seedUsersPath, 'utf-8');
    if (seedSql.trim().length > 0) {
      await client.query(seedSql);
      console.log('👤 Usuarios administradores y de prueba asegurados.');
    }
  }

  // 3. Semillas de finanzas (ejecutar únicamente si la tabla de ingresos está vacía para evitar duplicados)
  const seedFinanzasPath = path.join(dbDir, 'seed_finanzas.sql');
  if (fs.existsSync(seedFinanzasPath)) {
    const countResult = await client.query('SELECT COUNT(*) AS total FROM ingresos');
    const totalIngresos = parseInt(countResult.rows[0]?.total ?? '0', 10);

    if (totalIngresos === 0) {
      const seedFinanzasSql = fs.readFileSync(seedFinanzasPath, 'utf-8');
      if (seedFinanzasSql.trim().length > 0) {
        await client.query(seedFinanzasSql);
        console.log('🌱 Datos iniciales de ingresos y gastos cargados.');

        // Re-sincronizar historial con los datos recién sembrados
        const syncHistorialSql = `
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
        `;
        await client.query(syncHistorialSql);
      }
    }
  }

  console.log('✅ Esquemas, migraciones y datos iniciales aplicados correctamente.');
}

/**
 * Procedimiento de inicialización completo de la base de datos.
 * Se invoca durante el inicio del backend.
 */
export async function initializeDatabase(): Promise<void> {
  // Paso 1: Asegurar que la base de datos exista
  await ensureDatabaseExists();

  // Paso 2: Conectar al pool de la base de datos destino y ejecutar DDL / migraciones / semillas
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log(`🔗 Conexión exitosa a la base de datos "${env.db.database}".`);
    await runDatabaseMigrationsAndSeeds(client);
  } finally {
    client.release();
  }
}

