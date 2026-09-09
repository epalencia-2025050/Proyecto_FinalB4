/**
 * ============================================================================
 * SERVICIO: LÓGICA DE NEGOCIO PARA INGRESOS (GITHUB COMMIT)
 * Valida montos, descripciones, categorías y ejecuta reglas de negocio financieras.
 * ============================================================================
 */
import { ingresoRepository } from '../repositories/ingreso.repository';
import { CreateIngresoDto, Ingreso, toIngresoDto, UpdateIngresoDto } from '../models/ingreso.model';
import { historialService } from './historial.service';

export class IngresoService {
  async getIngresos(userId: number, search?: string): Promise<Ingreso[]> {
    const rows = await ingresoRepository.findByUserId(userId, search);
    return rows.map(toIngresoDto);
  }

  async getIngresoById(id: number, userId: number): Promise<Ingreso | null> {
    const row = await ingresoRepository.findByIdAndUserId(id, userId);
    return row ? toIngresoDto(row) : null;
  }

  async createIngreso(userId: number, dto: CreateIngresoDto): Promise<Ingreso> {
    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }
    if (dto.monto === undefined || dto.monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }
    const created = await ingresoRepository.create(userId, dto);
    const result = toIngresoDto(created);

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'INGRESO',
      accion: 'CREADO',
      descripcion: result.descripcion,
      categoria: result.categoria,
      monto: result.monto,
      fechaTransaccion: result.fecha,
      estado: result.estado,
      referenciaId: result.id,
    });

    return result;
  }

  async updateIngreso(id: number, userId: number, dto: UpdateIngresoDto): Promise<Ingreso> {
    if (dto.monto !== undefined && dto.monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }
    const updated = await ingresoRepository.update(id, userId, dto);
    if (!updated) {
      throw new Error('Ingreso no encontrado o no tiene permisos');
    }
    const result = toIngresoDto(updated);

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'INGRESO',
      accion: 'EDITADO',
      descripcion: result.descripcion,
      categoria: result.categoria,
      monto: result.monto,
      fechaTransaccion: result.fecha,
      estado: result.estado,
      referenciaId: result.id,
    });

    return result;
  }

  async deleteIngreso(id: number, userId: number): Promise<boolean> {
    const existing = await ingresoRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new Error('Ingreso no encontrado o no tiene permisos');
    }
    const existingDto = toIngresoDto(existing);

    const success = await ingresoRepository.delete(id, userId);
    if (!success) {
      throw new Error('Ingreso no encontrado o no tiene permisos');
    }

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'INGRESO',
      accion: 'ELIMINADO',
      descripcion: existingDto.descripcion,
      categoria: existingDto.categoria,
      monto: existingDto.monto,
      fechaTransaccion: existingDto.fecha,
      estado: existingDto.estado,
      referenciaId: existingDto.id,
    });

    return true;
  }
}

export const ingresoService = new IngresoService();

