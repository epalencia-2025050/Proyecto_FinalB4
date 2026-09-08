/**
 * ============================================================================
 * REPOSITORIO: ACCESO A BASE DE DATOS PARA INGRESOS (GITHUB COMMIT)
 * Consultas SQL parametrizadas a PostgreSQL para la tabla ingresos con aislamiento por usuario.
 * ============================================================================
 */
import { pool } from '../config/database';
import { CreateIngresoDto, IngresoEntity, UpdateIngresoDto } from '../models/ingreso.model';

export class IngresoRepository {
  async findByUserId(userId: number, search?: string): Promise<IngresoEntity[]> {
    let query = 'SELECT * FROM ingresos WHERE usuario_id = $1';
    const params: any[] = [userId];

    if (search && search.trim() !== '') {
      query += ` AND (LOWER(descripcion) LIKE $2 OR LOWER(categoria) LIKE $2 OR LOWER(estado) LIKE $2)`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    query += ' ORDER BY fecha DESC, id DESC';

    const { rows } = await pool.query<IngresoEntity>(query, params);
    return rows;
  }

  async findByIdAndUserId(id: number, userId: number): Promise<IngresoEntity | null> {
    const query = 'SELECT * FROM ingresos WHERE id = $1 AND usuario_id = $2';
    const { rows } = await pool.query<IngresoEntity>(query, [id, userId]);
    return rows[0] ?? null;
  }

  async create(userId: number, dto: CreateIngresoDto): Promise<IngresoEntity> {
    const query = `
      INSERT INTO ingresos (usuario_id, monto, descripcion, fecha, categoria, estado, es_ahorro)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      userId,
      dto.monto,
      dto.descripcion,
      dto.fecha || new Date().toISOString().split('T')[0],
      dto.categoria || 'Otros',
      dto.estado || 'completado',
      Boolean(dto.esAhorro),
    ];
    const { rows } = await pool.query<IngresoEntity>(query, values);
    return rows[0];
  }

  async update(id: number, userId: number, dto: UpdateIngresoDto): Promise<IngresoEntity | null> {
    const current = await this.findByIdAndUserId(id, userId);
    if (!current) return null;

    const monto = dto.monto !== undefined ? dto.monto : current.monto;
    const descripcion = dto.descripcion !== undefined ? dto.descripcion : current.descripcion;
    const fecha = dto.fecha !== undefined ? dto.fecha : current.fecha;
    const categoria = dto.categoria !== undefined ? dto.categoria : current.categoria;
    const estado = dto.estado !== undefined ? dto.estado : current.estado;
    const esAhorro = dto.esAhorro !== undefined ? dto.esAhorro : current.es_ahorro;

    const query = `
      UPDATE ingresos
      SET monto = $1, descripcion = $2, fecha = $3, categoria = $4, estado = $5, es_ahorro = $6, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $7 AND usuario_id = $8
      RETURNING *
    `;
    const { rows } = await pool.query<IngresoEntity>(query, [
      monto,
      descripcion,
      fecha,
      categoria,
      estado,
      esAhorro,
      id,
      userId,
    ]);
    return rows[0] ?? null;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const query = 'DELETE FROM ingresos WHERE id = $1 AND usuario_id = $2';
    const result = await pool.query(query, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTotalByUserId(userId: number): Promise<number> {
    const query = 'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE usuario_id = $1';
    const { rows } = await pool.query<{ total: string }>(query, [userId]);
    return parseFloat(rows[0]?.total ?? '0');
  }

  async getTotalAhorroByUserId(userId: number): Promise<number> {
    const query = 'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE usuario_id = $1 AND es_ahorro = TRUE';
    const { rows } = await pool.query<{ total: string }>(query, [userId]);
    return parseFloat(rows[0]?.total ?? '0');
  }

  async getMonthlyTotals(userId: number, months: number = 6): Promise<{ mes_num: number; ano: number; total: number }[]> {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM fecha)::int AS mes_num,
        EXTRACT(YEAR FROM fecha)::int AS ano,
        COALESCE(SUM(monto), 0)::float AS total
      FROM ingresos
      WHERE usuario_id = $1
        AND fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${months - 1} months')
      GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
      ORDER BY ano ASC, mes_num ASC
    `;
    const { rows } = await pool.query<{ mes_num: number; ano: number; total: number }>(query, [userId]);
    return rows;
  }

  async getMonthlyAhorroTotals(userId: number, months: number = 6): Promise<{ mes_num: number; ano: number; total: number }[]> {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM fecha)::int AS mes_num,
        EXTRACT(YEAR FROM fecha)::int AS ano,
        COALESCE(SUM(monto), 0)::float AS total
      FROM ingresos
      WHERE usuario_id = $1
        AND es_ahorro = TRUE
        AND fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${months - 1} months')
      GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
      ORDER BY ano ASC, mes_num ASC
    `;
    const { rows } = await pool.query<{ mes_num: number; ano: number; total: number }>(query, [userId]);
    return rows;
  }
}

export const ingresoRepository = new IngresoRepository();

