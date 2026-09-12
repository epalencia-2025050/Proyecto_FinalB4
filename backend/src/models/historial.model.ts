/**
 * ============================================================================
 * MODELO: HISTORIAL DE TRANSACCIONES
 * Definición de tipos, interfaces DTO y transformadores para el módulo de historial.
 * ============================================================================
 */

export type TipoTransaccion = 'INGRESO' | 'GASTO';
export type AccionTransaccion = 'CREADO' | 'EDITADO' | 'ELIMINADO';

export interface HistorialEntity {
  id: number;
  usuario_id: number;
  tipo: TipoTransaccion;
  accion: AccionTransaccion;
  descripcion: string;
  categoria: string;
  monto: string | number;
  fecha_transaccion: string | Date;
  estado: string;
  fecha_registro: Date;
  referencia_id: number | null;
}

export interface HistorialItem {
  id: number;
  usuarioId: number;
  tipo: TipoTransaccion;
  accion: AccionTransaccion;
  descripcion: string;
  categoria: string;
  monto: number;
  fechaTransaccion: string;
  estado: string;
  fechaRegistro: Date;
  referenciaId: number | null;
}

export interface RegistrarHistorialDto {
  usuarioId: number;
  tipo: TipoTransaccion;
  accion: AccionTransaccion;
  descripcion: string;
  categoria: string;
  monto: number;
  fechaTransaccion?: string;
  estado?: string;
  referenciaId?: number | null;
}

export interface HistorialFiltros {
  tipo?: TipoTransaccion;
  categoria?: string;
  estado?: string;
  fecha?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function toHistorialDto(entity: HistorialEntity): HistorialItem {
  return {
    id: entity.id,
    usuarioId: entity.usuario_id,
    tipo: entity.tipo,
    accion: entity.accion,
    descripcion: entity.descripcion,
    categoria: entity.categoria,
    monto: Number(entity.monto),
    fechaTransaccion: entity.fecha_transaccion
      ? (typeof entity.fecha_transaccion === 'string'
          ? entity.fecha_transaccion.split('T')[0]
          : (entity.fecha_transaccion as any).toISOString().split('T')[0])
      : '',
    estado: entity.estado,
    fechaRegistro: entity.fecha_registro,
    referenciaId: entity.referencia_id,
  };
}

