import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    if (authService.isTokenExpired()) {
      authService.logout(true);
      return false;
    }
    // La navegación cuenta como actividad del usuario
    authService.recordActivity();
    return true;
  }

  const teniaToken = !!authService.getToken();
  if (teniaToken) {
    authService.logout(true);
  } else {
    router.navigate(['/login']);
  }
  return false;
};
