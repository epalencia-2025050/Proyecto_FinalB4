import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, checkInactivity } from '../utils/jwt.util';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Verificar expiración por inactividad (además de la expiración absoluta del JWT)
    checkInactivity(payload);

    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userRole = payload.rol;
    next();
  } catch (error: any) {
    const isInactivity = error?.message?.includes('inactividad');
    res.status(401).json({
      message: isInactivity
        ? 'Tu sesión expiró por inactividad.'
        : 'Token invalido o expirado',
      code: isInactivity ? 'INACTIVITY_TIMEOUT' : 'TOKEN_INVALID',
    });
  }
}
