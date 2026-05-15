import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="min-h-screen bg-camp-cream/30 flex">
      <!-- Sidebar Desktop -->
      <aside class="hidden lg:flex flex-col w-64 bg-white border-r border-camp-sand/40 p-6 fixed h-full z-20">
        <div class="flex items-center gap-2 mb-10">
          <div class="w-8 h-8 bg-camp-sage rounded-camp"></div>
          <span class="text-xl font-serif text-camp-earth tracking-tight">campAIgn</span>
        </div>

        <nav class="flex-1 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-camp-sage/10 text-camp-sage" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium">
             <span class="text-lg">🏡</span> Dashboard
          </a>
          <a routerLink="/meteo" routerLinkActive="bg-camp-sage/10 text-camp-sage" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium">
             <span class="text-lg">☀️</span> Meteo
          </a>
          <a routerLink="/land" routerLinkActive="bg-camp-sage/10 text-camp-sage" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium">
             <span class="text-lg">🗺️</span> Il Mio Terreno
          </a>
          <a routerLink="/plants" routerLinkActive="bg-camp-sage/10 text-camp-sage" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium">
             <span class="text-lg">🌿</span> Le Mie Piante
          </a>
          <a routerLink="/calendar" routerLinkActive="bg-camp-sage/10 text-camp-sage" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium">
             <span class="text-lg">📅</span> Calendario
          </a>
        </nav>

        <div class="mt-auto pt-6 border-t border-camp-sand/40">
          <button (click)="logout()" class="flex items-center gap-3 px-4 py-3 w-full rounded-camp text-camp-olive hover:text-red-500 hover:bg-red-50 transition-all font-medium">
            <span class="text-lg">🚪</span> Esci
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 lg:ml-64 flex flex-col">
        <!-- Header Mobile/Global -->
        <header class="h-16 bg-white/80 backdrop-blur-md border-b border-camp-sand/40 flex items-center justify-between px-6 sticky top-0 z-10">
          <button (click)="toggleMobileMenu()" class="lg:hidden text-camp-earth">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          <div class="lg:hidden flex items-center gap-2">
            <div class="w-6 h-6 bg-camp-sage rounded-camp"></div>
            <span class="text-lg font-serif text-camp-earth tracking-tight">campAIgn</span>
          </div>

          <div class="flex items-center gap-4 ml-auto">
            <button class="w-10 h-10 rounded-full bg-camp-sand/30 flex items-center justify-center text-camp-earth hover:bg-camp-sand/50 transition-all relative">
              <span class="text-lg">🔔</span>
              <span class="absolute top-2 right-2 w-2 h-2 bg-camp-accent rounded-full border-2 border-white"></span>
            </button>
            <div class="w-10 h-10 rounded-full bg-camp-earth text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {{ userInitials() }}
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-6 lg:p-10">
          <ng-content></ng-content>
        </main>
      </div>

      <!-- Mobile Menu Overlay -->
      @if (mobileMenuOpen()) {
        <div class="fixed inset-0 bg-camp-earth/20 backdrop-blur-sm z-30 lg:hidden" (click)="toggleMobileMenu()">
          <div class="w-64 h-full bg-white p-6 shadow-2xl animate-slide-in" (click)="$event.stopPropagation()">
             <div class="flex items-center justify-between mb-10">
               <div class="flex items-center gap-2">
                 <div class="w-8 h-8 bg-camp-sage rounded-camp"></div>
                 <span class="text-xl font-serif text-camp-earth">campAIgn</span>
               </div>
               <button (click)="toggleMobileMenu()" class="text-camp-olive">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <nav class="space-y-1">
               <a routerLink="/dashboard" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium">🏡 Dashboard</a>
               <a routerLink="/meteo" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium">☀️ Meteo</a>
               <a routerLink="/land" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium">🗺️ Il Mio Terreno</a>
               <a routerLink="/plants" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium">🌿 Le Mie Piante</a>
               <a routerLink="/calendar" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium">📅 Calendario</a>
             </nav>
          </div>
        </div>
      }
    </div>
  `
})
export class AppLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  mobileMenuOpen = signal(false);

  userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user?.email) return 'U';
    return user.email.substring(0, 1).toUpperCase();
  });

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
