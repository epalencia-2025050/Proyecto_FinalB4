import { Request, Response } from 'express';
import { gastoService } from '../services/gasto.service';

//

export class GastoController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const search = req.query.search as string | undefined;
      const data = await gastoService.getGastos(userId, search);
      res.status(200).json({ data });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error al obtener gastos' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      const data = await gastoService.getGastoById(id, userId);
      if (!data) {
        res.status(404).json({ message: 'Gasto no encontrado' });
        return;
      }
      res.status(200).json({ data });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error al obtener gasto' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { monto, descripcion, fecha, categoria, estado } = req.body;
      const data = await gastoService.createGasto(userId, {
        monto: Number(monto),
        descripcion,
        fecha,
        categoria,
        estado,
      });
      res.status(201).json({ message: 'Gasto registrado exitosamente', data });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al crear gasto' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      const { monto, descripcion, fecha, categoria, estado } = req.body;
      const data = await gastoService.updateGasto(id, userId, {
        monto: monto !== undefined ? Number(monto) : undefined,
        descripcion,
        fecha,
        categoria,
        estado,
      });
      res.status(200).json({ message: 'Gasto actualizado exitosamente', data });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al actualizar gasto' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      await gastoService.deleteGasto(id, userId);
      res.status(200).json({ message: 'Gasto eliminado exitosamente' });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al eliminar gasto' });
    }
  }
}

export const gastoController = new GastoController();

