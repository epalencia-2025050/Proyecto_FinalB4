import { gastoRepository } from '../repositories/gasto.repository';
import { ingresoRepository } from '../repositories/ingreso.repository';
import { CreateGastoDto, Gasto, toGastoDto, UpdateGastoDto } from '../models/gasto.model';
import { historialService } from './historial.service';

export class GastoService {
  async getGastos(userId: number, search?: string): Promise<Gasto[]> {
    const rows = await gastoRepository.findByUserId(userId, search);
    return rows.map(toGastoDto);
  }
//
  async getGastoById(id: number, userId: number): Promise<Gasto | null> {
    const row = await gastoRepository.findByIdAndUserId(id, userId);
    return row ? toGastoDto(row) : null;
  }

  async createGasto(userId: number, dto: CreateGastoDto): Promise<Gasto> {
    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }
    if (dto.monto === undefined || dto.monto <= 0) {
      throw new Error('El monto debe ser mayor a Q0.00');
    }
    if (!dto.categoria || dto.categoria.trim() === '') {
      throw new Error('La categoría es requerida');
    }

    // Validar saldo disponible
    const totalIngresos = await ingresoRepository.getTotalByUserId(userId);
    const totalGastos = await gastoRepository.getTotalByUserId(userId);
    const saldoDisponible = totalIngresos - totalGastos;
    if (dto.monto > saldoDisponible) {
      throw new Error(`Fondos insuficientes. Tu saldo disponible es Q${saldoDisponible.toFixed(2)} y estás intentando registrar un gasto de Q${dto.monto.toFixed(2)}.`);
    }

    const created = await gastoRepository.create(userId, dto);
    const result = toGastoDto(created);

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'GASTO',
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

  async updateGasto(id: number, userId: number, dto: UpdateGastoDto): Promise<Gasto> {
    if (dto.monto !== undefined && dto.monto <= 0) {
      throw new Error('El monto debe ser mayor a Q0.00');
    }

    if (dto.monto !== undefined) {
      const existing = await gastoRepository.findByIdAndUserId(id, userId);
      if (!existing) {
        throw new Error('Gasto no encontrado o no tiene permisos');
      }
      const totalIngresos = await ingresoRepository.getTotalByUserId(userId);
      const totalGastos = await gastoRepository.getTotalByUserId(userId);
      // Saldo considerando que se reemplaza el monto del gasto actual
      const saldoDisponible = totalIngresos - (totalGastos - Number(existing.monto));
      if (dto.monto > saldoDisponible) {
        throw new Error(`Fondos insuficientes. Tu saldo disponible es Q${saldoDisponible.toFixed(2)} y estás intentando registrar un gasto de Q${dto.monto.toFixed(2)}.`);
      }
    }

    const updated = await gastoRepository.update(id, userId, dto);
    if (!updated) {
      throw new Error('Gasto no encontrado o no tiene permisos');
    }
    const result = toGastoDto(updated);

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'GASTO',
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

  async deleteGasto(id: number, userId: number): Promise<boolean> {
    const existing = await gastoRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new Error('Gasto no encontrado o no tiene permisos');
    }
    const existingDto = toGastoDto(existing);

    const success = await gastoRepository.delete(id, userId);
    if (!success) {
      throw new Error('Gasto no encontrado o no tiene permisos');
    }

    await historialService.registrarEvento({
      usuarioId: userId,
      tipo: 'GASTO',
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

export const gastoService = new GastoService();

