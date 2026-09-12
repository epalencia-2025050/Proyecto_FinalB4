import { pool } from '../config/database';
import { UserEntity, Role } from '../models/user.model';

/**
 * Capa de acceso a datos. Es la UNICA capa que conoce SQL.
 * Los services nunca deberian construir queries directamente.
 */
export class UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const result = await pool.query<UserEntity>(
      `SELECT id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion
       FROM usuarios
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: number): Promise<UserEntity | null> {
    const result = await pool.query<UserEntity>(
      `SELECT id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion
       FROM usuarios
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const result = await pool.query<UserEntity>(
      `SELECT id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion
       FROM usuarios
       WHERE google_id = $1
       LIMIT 1`,
      [googleId],
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<UserEntity[]> {
    const result = await pool.query<UserEntity>(
      `SELECT id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion
       FROM usuarios
       ORDER BY fecha_creacion DESC`,
    );
    return result.rows;
  }

  /**
   * `rol` es opcional y por defecto crea usuarios con rol 'user'.
   * La asignacion del rol 'admin' debe hacerse desde un endpoint protegido
   * por roleMiddleware, o directamente en base de datos — nunca desde
   * un registro publico sin control.
   */
  async create(
    nombre: string,
    email: string,
    passwordHash: string,
    rol: Role = 'user',
  ): Promise<UserEntity> {
    const result = await pool.query<UserEntity>(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion`,
      [nombre, email, passwordHash, rol],
    );
    return result.rows[0];
  }

  async createWithGoogle(
    nombre: string,
    email: string,
    googleId: string,
    passwordHash: string,
    rol: Role = 'user',
  ): Promise<UserEntity> {
    const result = await pool.query<UserEntity>(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, google_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, password_hash, rol, activo, google_id, fecha_creacion, fecha_actualizacion`,
      [nombre, email, passwordHash, rol, googleId],
    );
    return result.rows[0];
  }
}

export const userRepository = new UserRepository();
