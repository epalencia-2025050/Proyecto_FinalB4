import { Pool } from 'pg';
import { env } from './env';
import { initializeDatabase } from './initDatabase';

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err: Error) => {
  console.error('Error inesperado en el pool de PostgreSQL', err);
});

export { initializeDatabase };

export async function checkDatabaseConnection(): Promise<void> {
  await initializeDatabase();
}
