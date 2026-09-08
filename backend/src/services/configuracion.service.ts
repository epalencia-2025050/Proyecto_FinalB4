import { configuracionRepository } from '../repositories/configuracion.repository';
import { ConfiguracionUsuario, toConfiguracionDto, UpsertConfiguracionDto } from '../models/configuracion.model';

export class ConfiguracionService {
  async getConfiguracion(userId: number): Promise<ConfiguracionUsuario> {
    const row = await configuracionRepository.findByUserId(userId);
    if (!row) {
      // Si el usuario aún no tiene configuración guardada, devolver valores por defecto consistentes
      return {
        usuarioId: userId,
        nombreBanco: 'Banco Industrial',
        numeroCuenta: '',
        tipoCuenta: 'Cuenta corriente',
        taxId: '',
        frecuenciaPago: 'Mensual',
        moneda: 'GTQ',
        avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80',
      };
    }
    return toConfiguracionDto(row);
  }

  async updateConfiguracion(userId: number, dto: UpsertConfiguracionDto): Promise<ConfiguracionUsuario> {
    const updated = await configuracionRepository.upsert(userId, dto);
    return toConfiguracionDto(updated);
  }
}

export const configuracionService = new ConfiguracionService();

