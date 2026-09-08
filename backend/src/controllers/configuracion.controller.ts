import { Request, Response } from 'express';
import { configuracionService } from '../services/configuracion.service';

export class ConfiguracionController {
  async get(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const data = await configuracionService.getConfiguracion(userId);
      res.status(200).json({ data });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error al obtener configuración' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { nombreBanco, numeroCuenta, tipoCuenta, taxId, frecuenciaPago, moneda, avatarUrl } = req.body;
      const data = await configuracionService.updateConfiguracion(userId, {
        nombreBanco,
        numeroCuenta,
        tipoCuenta,
        taxId,
        frecuenciaPago,
        moneda,
        avatarUrl,
      });
      res.status(200).json({ message: 'Configuración actualizada exitosamente', data });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al actualizar configuración' });
    }
  }
}

export const configuracionController = new ConfiguracionController();

