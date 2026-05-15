import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, first, map, combineLatest } from 'rxjs';

export const onboardingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return combineLatest([
    toObservable(authService.isInitialLoading),
    toObservable(authService.isProfileLoading)
  ]).pipe(
    filter(([initial, profile]) => !initial && !profile),
    first(),
    map(() => {
      if (!authService.isAuthenticated() || authService.onboardingCompleted()) {
        return router.createUrlTree([authService.getPostAuthRedirectPath()]);
      }
      return true;
    })
  );
};
