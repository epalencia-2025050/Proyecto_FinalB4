import { Router } from 'express';
import { body, param } from 'express-validator';
import { gastoController } from '../controllers/gasto.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', gastoController.list);
router.get('/:id', validate([param('id').isInt().withMessage('ID inválido')]), gastoController.getById);

router.post(
  '/',
  validate([
    body('monto').isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a 0'),
    body('descripcion').isString().trim().notEmpty().withMessage('La descripción es requerida'),
    body('categoria').isString().trim().notEmpty().withMessage('La categoría es requerida'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('estado').optional().isString().trim(),
  ]),
  gastoController.create,
);

router.put(
  '/:id',
  validate([
    param('id').isInt().withMessage('ID inválido'),
    body('monto').optional().isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a 0'),
    body('descripcion').optional().isString().trim().notEmpty().withMessage('La descripción no puede estar vacía'),
    body('categoria').optional().isString().trim().notEmpty().withMessage('La categoría no puede estar vacía'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('estado').optional().isString().trim(),
  ]),
  gastoController.update,
);

router.delete(
  '/:id',
  validate([param('id').isInt().withMessage('ID inválido')]),
  gastoController.delete,
);

export default router;

