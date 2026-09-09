import { gastoRepository } from '../repositories/gasto.repository';
import { CreateGastoDto, Gasto, toGastoDto, UpdateGastoDto } from '../models/gasto.model';

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
      throw new Error('El monto debe ser mayor a 0');
    }
    if (!dto.categoria || dto.categoria.trim() === '') {
      throw new Error('La categoría es requerida');
    }
    const created = await gastoRepository.create(userId, dto);
    return toGastoDto(created);
  }

  async updateGasto(id: number, userId: number, dto: UpdateGastoDto): Promise<Gasto> {
    if (dto.monto !== undefined && dto.monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }
    const updated = await gastoRepository.update(id, userId, dto);
    if (!updated) {
      throw new Error('Gasto no encontrado o no tiene permisos');
    }
    return toGastoDto(updated);
  }

  async deleteGasto(id: number, userId: number): Promise<boolean> {
    const success = await gastoRepository.delete(id, userId);
    if (!success) {
      throw new Error('Gasto no encontrado o no tiene permisos');
    }
    return true;
  }
}

export const gastoService = new GastoService();

