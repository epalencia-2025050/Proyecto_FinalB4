import { pool } from '../config/database';
import { ConfiguracionUsuarioEntity, UpsertConfiguracionDto } from '../models/configuracion.model';

export class ConfiguracionRepository {
  async findByUserId(userId: number): Promise<ConfiguracionUsuarioEntity | null> {
    const query = 'SELECT * FROM configuracion_usuario WHERE usuario_id = $1';
    const { rows } = await pool.query<ConfiguracionUsuarioEntity>(query, [userId]);
    return rows[0] ?? null;
  }

  async upsert(userId: number, dto: UpsertConfiguracionDto): Promise<ConfiguracionUsuarioEntity> {
    const current = await this.findByUserId(userId);

    if (current) {
      const nombreBanco = dto.nombreBanco !== undefined ? dto.nombreBanco : current.nombre_banco;
      const numeroCuenta = dto.numeroCuenta !== undefined ? dto.numeroCuenta : current.numero_cuenta;
      const tipoCuenta = dto.tipoCuenta !== undefined ? dto.tipoCuenta : current.tipo_cuenta;
      const taxId = dto.taxId !== undefined ? dto.taxId : current.tax_id;
      const frecuenciaPago = dto.frecuenciaPago !== undefined ? dto.frecuenciaPago : current.frecuencia_pago;
      const moneda = dto.moneda !== undefined ? dto.moneda : current.moneda;
      const avatarUrl = dto.avatarUrl !== undefined ? dto.avatarUrl : current.avatar_url;

      const query = `
        UPDATE configuracion_usuario
        SET nombre_banco = $1,
            numero_cuenta = $2,
            tipo_cuenta = $3,
            tax_id = $4,
            frecuencia_pago = $5,
            moneda = $6,
            avatar_url = $7,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE usuario_id = $8
        RETURNING *
      `;
      const values = [nombreBanco, numeroCuenta, tipoCuenta, taxId, frecuenciaPago, moneda, avatarUrl, userId];
      const { rows } = await pool.query<ConfiguracionUsuarioEntity>(query, values);
      return rows[0];
    } else {
      const query = `
        INSERT INTO configuracion_usuario (
          usuario_id,
          nombre_banco,
          numero_cuenta,
          tipo_cuenta,
          tax_id,
          frecuencia_pago,
          moneda,
          avatar_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        userId,
        dto.nombreBanco || 'Banco Industrial',
        dto.numeroCuenta || '',
        dto.tipoCuenta || 'Cuenta corriente',
        dto.taxId || '',
        dto.frecuenciaPago || 'Mensual',
        dto.moneda || 'GTQ',
        dto.avatarUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80',
      ];
      const { rows } = await pool.query<ConfiguracionUsuarioEntity>(query, values);
      return rows[0];
    }
  }
}

export const configuracionRepository = new ConfiguracionRepository();

