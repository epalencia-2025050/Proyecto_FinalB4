/**
 * ============================================================================
 * REPOSITORIO: ACCESO A BASE DE DATOS PARA HISTORIAL DE TRANSACCIONES
 * Consultas SQL parametrizadas a PostgreSQL para la tabla historial_transacciones.
 * ============================================================================
 */

import { pool } from '../config/database';
import { HistorialEntity, HistorialFiltros, RegistrarHistorialDto } from '../models/historial.model';

export class HistorialRepository {
  async findByUserId(userId: number, filters: HistorialFiltros = {}): Promise<HistorialEntity[]> {
    let query = 'SELECT * FROM historial_transacciones WHERE usuario_id = $1';
    const params: any[] = [userId];

    if (filters.tipo) {
      params.push(filters.tipo.toUpperCase());
      query += ` AND tipo = $${params.length}`;
    }

    if (filters.categoria && filters.categoria.trim() !== '' && filters.categoria.toLowerCase() !== 'all') {
      params.push(filters.categoria.trim().toLowerCase());
      query += ` AND LOWER(categoria) = $${params.length}`;
    }

    if (filters.estado && filters.estado.trim() !== '' && filters.estado.toLowerCase() !== 'all') {
      params.push(filters.estado.trim().toLowerCase());
      query += ` AND LOWER(estado) = $${params.length}`;
    }

    if (filters.fecha && filters.fecha.trim() !== '') {
      params.push(filters.fecha.trim());
      query += ` AND fecha_transaccion = $${params.length}`;
    }

    if (filters.search && filters.search.trim() !== '') {
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(descripcion) LIKE $${params.length} OR LOWER(categoria) LIKE $${params.length} OR LOWER(estado) LIKE $${params.length})`;
    }

    query += ' ORDER BY fecha_registro DESC, id DESC';

    if (filters.limit && filters.limit > 0) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (filters.offset && filters.offset > 0) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await pool.query<HistorialEntity>(query, params);
    return rows;
  }

  async findByIdAndUserId(id: number, userId: number): Promise<HistorialEntity | null> {
    const query = 'SELECT * FROM historial_transacciones WHERE id = $1 AND usuario_id = $2';
    const { rows } = await pool.query<HistorialEntity>(query, [id, userId]);
    return rows[0] ?? null;
  }

  async create(dto: RegistrarHistorialDto): Promise<HistorialEntity> {
    const query = `
      INSERT INTO historial_transacciones (
        usuario_id, tipo, accion, descripcion, categoria, monto, fecha_transaccion, estado, referencia_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      dto.usuarioId,
      dto.tipo.toUpperCase(),
      dto.accion.toUpperCase(),
      dto.descripcion,
      dto.categoria,
      dto.monto,
      dto.fechaTransaccion || new Date().toISOString().split('T')[0],
      dto.estado || 'completado',
      dto.referenciaId ?? null,
    ];
    const { rows } = await pool.query<HistorialEntity>(query, values);
    return rows[0];
  }
}

export const historialRepository = new HistorialRepository();

