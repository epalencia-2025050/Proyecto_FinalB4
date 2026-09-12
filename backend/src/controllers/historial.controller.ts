/**
 * ============================================================================
 * CONTROLADOR: HISTORIAL DE TRANSACCIONES
 * Endpoints RESTful para consultar el historial persistente de transacciones.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { historialService } from '../services/historial.service';
import { TipoTransaccion } from '../models/historial.model';

export class HistorialController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { tipo, categoria, estado, fecha, search, limit, offset } = req.query;

      const filters = {
        tipo: tipo ? (String(tipo).toUpperCase() as TipoTransaccion) : undefined,
        categoria: categoria ? String(categoria) : undefined,
        estado: estado ? String(estado) : undefined,
        fecha: fecha ? String(fecha) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      };

      const data = await historialService.getHistorial(userId, filters);
      res.status(200).json({ data });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error al obtener el historial' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      const data = await historialService.getHistorialById(id, userId);

      if (!data) {
        res.status(404).json({ message: 'Registro de historial no encontrado' });
        return;
      }

      res.status(200).json({ data });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error al obtener el registro de historial' });
    }
  }
}

export const historialController = new HistorialController();

