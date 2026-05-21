import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { appGuard } from './core/guards/no-onboarding.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent),
    canActivate: [onboardingGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [appGuard]
  },
  {
    path: 'meteo',
    loadComponent: () => import('./features/meteo/meteo.component').then(m => m.MeteoComponent),
    canActivate: [appGuard]
  },
  {
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [appGuard]
  },
  {
    path: 'archive',
    loadComponent: () => import('./features/archive/archive.component').then(m => m.ArchiveComponent),
    canActivate: [appGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
