/**
 * ============================================================================
 * RUTAS: HISTORIAL DE TRANSACCIONES
 * Endpoints protegidos para la consulta de transacciones históricas.
 * ============================================================================
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import { historialController } from '../controllers/historial.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

// Todas las rutas requieren usuario autenticado
router.use(authMiddleware);

router.get(
  '/',
  validate([
    query('tipo').optional().isIn(['INGRESO', 'GASTO', 'ingreso', 'gasto']).withMessage('Tipo debe ser INGRESO o GASTO'),
    query('categoria').optional().isString().trim(),
    query('estado').optional().isString().trim(),
    query('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    query('search').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Límite debe ser entre 1 y 500'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset inválido'),
  ]),
  historialController.list,
);

router.get(
  '/:id',
  validate([param('id').isInt().withMessage('ID inválido')]),
  historialController.getById,
);

export default router;

