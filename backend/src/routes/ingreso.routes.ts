import { Router } from 'express';
import { body, param } from 'express-validator';
import { ingresoController } from '../controllers/ingreso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

// Todas las rutas requieren usuario autenticado
router.use(authMiddleware);

router.get('/', ingresoController.list);
router.get('/:id', validate([param('id').isInt().withMessage('ID inválido')]), ingresoController.getById);

router.post(
  '/',
  validate([
    body('monto').isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a 0'),
    body('descripcion').isString().trim().notEmpty().withMessage('La descripción es requerida'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('categoria').optional().isString().trim(),
    body('estado').optional().isString().trim(),
    body('esAhorro').optional().isBoolean().withMessage('esAhorro debe ser booleano'),
  ]),
  ingresoController.create,
);

router.put(
  '/:id',
  validate([
    param('id').isInt().withMessage('ID inválido'),
    body('monto').optional().isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a 0'),
    body('descripcion').optional().isString().trim().notEmpty().withMessage('La descripción no puede estar vacía'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('categoria').optional().isString().trim(),
    body('estado').optional().isString().trim(),
    body('esAhorro').optional().isBoolean().withMessage('esAhorro debe ser booleano'),
  ]),
  ingresoController.update,
);

router.delete(
  '/:id',
  validate([param('id').isInt().withMessage('ID inválido')]),
  ingresoController.delete,
);

export default router;

