/**
 * ============================================================================
 * SERVICIO: LÓGICA DE NEGOCIO PARA HISTORIAL DE TRANSACCIONES
 * Consulta y registro de eventos históricos persistentes.
 * ============================================================================
 */

import { historialRepository } from '../repositories/historial.repository';
import {
  HistorialFiltros,
  HistorialItem,
  RegistrarHistorialDto,
  toHistorialDto,
} from '../models/historial.model';

export class HistorialService {
  async getHistorial(userId: number, filters: HistorialFiltros = {}): Promise<HistorialItem[]> {
    const rows = await historialRepository.findByUserId(userId, filters);
    return rows.map(toHistorialDto);
  }

  async getHistorialById(id: number, userId: number): Promise<HistorialItem | null> {
    const row = await historialRepository.findByIdAndUserId(id, userId);
    return row ? toHistorialDto(row) : null;
  }

  async registrarEvento(dto: RegistrarHistorialDto): Promise<HistorialItem> {
    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }
    if (dto.monto === undefined || dto.monto < 0) {
      throw new Error('El monto debe ser mayor o igual a 0');
    }
    const created = await historialRepository.create(dto);
    return toHistorialDto(created);
  }
}

export const historialService = new HistorialService();

