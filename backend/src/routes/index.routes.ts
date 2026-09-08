import { Router } from 'express';
import authRoutes from './auth.routes';
import ingresoRoutes from './ingreso.routes';
import gastoRoutes from './gasto.routes';
import dashboardRoutes from './dashboard.routes';
import configuracionRoutes from './configuracion.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/ingresos', ingresoRoutes);
router.use('/gastos', gastoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/configuracion', configuracionRoutes);

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
