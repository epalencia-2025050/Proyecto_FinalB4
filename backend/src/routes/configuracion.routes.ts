import { Router } from 'express';
import { body } from 'express-validator';
import { configuracionController } from '../controllers/configuracion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

// Protegido con JWT
router.use(authMiddleware);

router.get('/', configuracionController.get);

router.put(
  '/',
  validate([
    body('nombreBanco').optional().isString().trim(),
    body('numeroCuenta').optional().isString().trim(),
    body('tipoCuenta').optional().isString().trim(),
    body('taxId').optional().isString().trim(),
    body('frecuenciaPago').optional().isString().trim(),
    body('moneda').optional().isString().trim(),
    body('avatarUrl').optional().isString().trim(),
  ]),
  configuracionController.update,
);

export default router;

