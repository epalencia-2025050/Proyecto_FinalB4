export interface ConfiguracionUsuarioEntity {
  id: number;
  usuario_id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  tax_id: string | null;
  frecuencia_pago: string | null;
  moneda: string | null;
  avatar_url: string | null;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface ConfiguracionUsuario {
  id?: number;
  usuarioId: number;
  nombreBanco: string;
  numeroCuenta: string;
  tipoCuenta: string;
  taxId: string;
  frecuenciaPago: string;
  moneda: string;
  avatarUrl: string;
}

export interface UpsertConfiguracionDto {
  nombreBanco?: string;
  numeroCuenta?: string;
  tipoCuenta?: string;
  taxId?: string;
  frecuenciaPago?: string;
  moneda?: string;
  avatarUrl?: string;
}

export function toConfiguracionDto(entity: ConfiguracionUsuarioEntity): ConfiguracionUsuario {
  return {
    id: entity.id,
    usuarioId: entity.usuario_id,
    nombreBanco: entity.nombre_banco || 'Banco Industrial',
    numeroCuenta: entity.numero_cuenta || '',
    tipoCuenta: entity.tipo_cuenta || 'Cuenta corriente',
    taxId: entity.tax_id || '',
    frecuenciaPago: entity.frecuencia_pago || 'Mensual',
    moneda: entity.moneda || 'GTQ',
    avatarUrl: entity.avatar_url || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80',
  };
}

