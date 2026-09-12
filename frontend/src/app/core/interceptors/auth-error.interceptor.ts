import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const esPeticionDeLogin = req.url.includes('/auth/login');

        if (!esPeticionDeLogin) {
          // 1. Verificar si existía una sesión/token antes del error
          const teniaSesionActiva = !!authService.getToken();
          const backendMessage = error?.error?.message;

          // 2. Limpiar la sesión y redirigir mostrando mensaje si expiró
          authService.logout(teniaSesionActiva, backendMessage);
        }
      }
      return throwError(() => error);
    }),
  );
};