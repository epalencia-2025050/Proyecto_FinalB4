import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional (Angular 15+/17): adjunta automaticamente
 * el header "Authorization: Bearer <token>" a cada peticion saliente,
 * si existe un token guardado.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  if (!req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
    authService.recordActivity();
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
