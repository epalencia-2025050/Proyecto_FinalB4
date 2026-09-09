import { pool } from '../config/database';
import { CreateGastoDto, GastoEntity, UpdateGastoDto } from '../models/gasto.model';

export class GastoRepository {
  async findByUserId(userId: number, search?: string): Promise<GastoEntity[]> {
    let query = 'SELECT * FROM gastos WHERE usuario_id = $1';
    const params: any[] = [userId];

    if (search && search.trim() !== '') {
      query += ` AND (LOWER(descripcion) LIKE $2 OR LOWER(categoria) LIKE $2 OR LOWER(estado) LIKE $2)`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    query += ' ORDER BY fecha DESC, id DESC';

    const { rows } = await pool.query<GastoEntity>(query, params);
    return rows;
  }

  async findByIdAndUserId(id: number, userId: number): Promise<GastoEntity | null> {
    const query = 'SELECT * FROM gastos WHERE id = $1 AND usuario_id = $2';
    const { rows } = await pool.query<GastoEntity>(query, [id, userId]);
    return rows[0] ?? null;
  }

  async create(userId: number, dto: CreateGastoDto): Promise<GastoEntity> {
    const query = `
      INSERT INTO gastos (usuario_id, monto, descripcion, fecha, categoria, estado)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      userId,
      dto.monto,
      dto.descripcion,
      dto.fecha || new Date().toISOString().split('T')[0],
      dto.categoria,
      dto.estado || 'pagado',
    ];
    const { rows } = await pool.query<GastoEntity>(query, values);
    return rows[0];
  }

  async update(id: number, userId: number, dto: UpdateGastoDto): Promise<GastoEntity | null> {
    const current = await this.findByIdAndUserId(id, userId);
    if (!current) return null;

    const monto = dto.monto !== undefined ? dto.monto : current.monto;
    const descripcion = dto.descripcion !== undefined ? dto.descripcion : current.descripcion;
    const fecha = dto.fecha !== undefined ? dto.fecha : current.fecha;
    const categoria = dto.categoria !== undefined ? dto.categoria : current.categoria;
    const estado = dto.estado !== undefined ? dto.estado : current.estado;

    const query = `
      UPDATE gastos
      SET monto = $1, descripcion = $2, fecha = $3, categoria = $4, estado = $5, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $6 AND usuario_id = $7
      RETURNING *
    `;
    const { rows } = await pool.query<GastoEntity>(query, [
      monto,
      descripcion,
      fecha,
      categoria,
      estado,
      id,
      userId,
    ]);
    return rows[0] ?? null;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const query = 'DELETE FROM gastos WHERE id = $1 AND usuario_id = $2';
    const result = await pool.query(query, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTotalByUserId(userId: number): Promise<number> {
    const query = 'SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE usuario_id = $1';
    const { rows } = await pool.query<{ total: string }>(query, [userId]);
    return parseFloat(rows[0]?.total ?? '0');
  }

  async getTotalsByEstado(userId: number): Promise<{ cobrados: number; porCobrar: number }> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(estado) IN ('pagado', 'cobrado', 'completado') THEN monto ELSE 0 END), 0) AS cobrados,
        COALESCE(SUM(CASE WHEN LOWER(estado) IN ('pendiente', 'por cobrar', 'por_cobrar') THEN monto ELSE 0 END), 0) AS por_cobrar
      FROM gastos
      WHERE usuario_id = $1
    `;
    const { rows } = await pool.query<{ cobrados: string; por_cobrar: string }>(query, [userId]);
    return {
      cobrados: parseFloat(rows[0]?.cobrados ?? '0'),
      porCobrar: parseFloat(rows[0]?.por_cobrar ?? '0'),
    };
  }

  async getCategoryBreakdown(userId: number): Promise<{ categoria: string; total: number }[]> {
    const query = `
      SELECT 
        categoria,
        COALESCE(SUM(monto), 0)::float AS total
      FROM gastos
      WHERE usuario_id = $1
      GROUP BY categoria
      ORDER BY total DESC
    `;
    const { rows } = await pool.query<{ categoria: string; total: number }>(query, [userId]);
    return rows;
  }

  async getMonthlyTotals(userId: number, months: number = 6): Promise<{ mes_num: number; ano: number; total: number }[]> {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM fecha)::int AS mes_num,
        EXTRACT(YEAR FROM fecha)::int AS ano,
        COALESCE(SUM(monto), 0)::float AS total
      FROM gastos
      WHERE usuario_id = $1
        AND fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${months - 1} months')
      GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
      ORDER BY ano ASC, mes_num ASC
    `;
    const { rows } = await pool.query<{ mes_num: number; ano: number; total: number }>(query, [userId]);
    return rows;
  }
}
//
export const gastoRepository = new GastoRepository();

