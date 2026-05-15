import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, first, map } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.isInitialLoading).pipe(
    filter(loading => !loading),
    first(),
    map(() => {
      if (authService.isAuthenticated()) {
        return router.createUrlTree([authService.getPostAuthRedirectPath()]);
      }
      return true;
    })
  );
};
