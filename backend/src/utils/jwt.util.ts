import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../models/user.model';

/** Minutos de inactividad antes de que la sesión expire. Configurable vía env o directamente aquí. */
export const INACTIVITY_TIMEOUT_MINUTES = env.jwt.inactivityTimeoutMinutes;

export interface JwtPayload {
  sub: number; // id del usuario
  email: string;
  rol: Role;
  /** Timestamp (epoch ms) de la última actividad registrada */
  lastActivity: number;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as any };
  return jwt.sign(payload, env.jwt.secret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwt.secret);
  return decoded as unknown as JwtPayload;
}

/**
 * Verifica que el tiempo transcurrido desde `lastActivity` no supere el límite de inactividad.
 * Lanza un error si la sesión expiró por inactividad.
 */
export function checkInactivity(payload: JwtPayload): void {
  if (!payload.lastActivity) {
    throw new Error('Sesión inválida: sin registro de actividad');
  }
  const elapsedMinutes = (Date.now() - payload.lastActivity) / 60_000;
  if (elapsedMinutes > INACTIVITY_TIMEOUT_MINUTES) {
    throw new Error(`Sesión expirada por inactividad (${INACTIVITY_TIMEOUT_MINUTES} min)`);
  }
}
