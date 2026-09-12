import { Router } from 'express';
import { body, param } from 'express-validator';
import { gastoController } from '../controllers/gasto.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', gastoController.list);
router.get('/:id', validate([param('id').isInt().withMessage('ID inválido')]), gastoController.getById);

const VALID_GASTO_CATEGORIAS = ['Vivienda', 'Alimentación', 'Transporte', 'Otros', 'vivienda', 'alimentación', 'alimentacion', 'transporte', 'otros'];
const VALID_GASTO_ESTADOS = ['pagado', 'pendiente', 'PAGADO', 'PENDIENTE', 'completado', 'COMPLETADO'];

const isNotFutureDate = (val: string) => {
  if (!val) return true;
  const inputDate = new Date(val);
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return inputDate <= now;
};

const hasMaxTwoDecimals = (val: number) => {
  if (val === undefined || val === null) return true;
  return /^\d+(\.\d{1,2})?$/.test(String(val));
};

router.post(
  '/',
  validate([
    body('monto')
      .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a Q0.00')
      .custom(hasMaxTwoDecimals).withMessage('El monto no puede tener más de 2 decimales'),
    body('descripcion')
      .isString().withMessage('La descripción debe ser texto')
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('La descripción debe tener entre 3 y 100 caracteres y no ser solo espacios'),
    body('categoria')
      .isString().trim()
      .custom((val) => VALID_GASTO_CATEGORIAS.includes(val)).withMessage('Categoría de gasto inválida'),
    body('fecha')
      .notEmpty().withMessage('La fecha es obligatoria')
      .isISO8601().withMessage('Fecha inválida')
      .custom(isNotFutureDate).withMessage('No se permiten fechas futuras para movimientos ya realizados'),
    body('estado')
      .optional()
      .isString().trim()
      .custom((val) => VALID_GASTO_ESTADOS.includes(val.toLowerCase())).withMessage('Estado de gasto inválido'),
  ]),
  gastoController.create,
);

router.put(
  '/:id',
  validate([
    param('id').isInt().withMessage('ID inválido'),
    body('monto')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a Q0.00')
      .custom(hasMaxTwoDecimals).withMessage('El monto no puede tener más de 2 decimales'),
    body('descripcion')
      .optional()
      .isString().withMessage('La descripción debe ser texto')
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('La descripción debe tener entre 3 y 100 caracteres y no ser solo espacios'),
    body('categoria')
      .optional()
      .isString().trim()
      .custom((val) => VALID_GASTO_CATEGORIAS.includes(val)).withMessage('Categoría de gasto inválida'),
    body('fecha')
      .optional()
      .isISO8601().withMessage('Fecha inválida')
      .custom(isNotFutureDate).withMessage('No se permiten fechas futuras para movimientos ya realizados'),
    body('estado')
      .optional()
      .isString().trim()
      .custom((val) => VALID_GASTO_ESTADOS.includes(val.toLowerCase())).withMessage('Estado de gasto inválido'),
  ]),
  gastoController.update,
);

router.delete(
  '/:id',
  validate([param('id').isInt().withMessage('ID inválido')]),
  gastoController.delete,
);

export default router;

