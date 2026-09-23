import { Component, inject, signal, computed } from "@angular/core";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { CommonModule } from "@angular/common";
import { ArnaldoChatComponent } from "../arnaldo-chat/arnaldo-chat.component";
import { CampDialogComponent } from "../camp-dialog/camp-dialog.component";

@Component({
	selector: "app-layout",
	standalone: true,
	imports: [RouterLink, RouterLinkActive, CommonModule, ArnaldoChatComponent, CampDialogComponent],
	template: `
		<div class="min-h-screen bg-camp-cream/30 flex">
			<aside class="hidden lg:flex flex-col w-64 bg-white border-r border-camp-sand/40 p-6 fixed h-full z-40">
				<div class="flex items-center gap-2 mb-10">
					<img
						src="assets/logo.png"
						alt="campAIgn Logo"
						class="w-14 h-14 object-contain"
					/>
					<span class="text-xl font-serif text-camp-earth tracking-tight">campAIgn</span>
				</div>

				<nav class="flex-1 space-y-1">
					<a
						routerLink="/dashboard"
						routerLinkActive="bg-camp-sage/10 text-camp-sage"
						class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium"
					>
						<span class="text-lg">🏡</span> Dashboard
					</a>
					<a
						routerLink="/meteo"
						routerLinkActive="bg-camp-sage/10 text-camp-sage"
						class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium"
					>
						<span class="text-lg">☀️</span> Meteo
					</a>
					<a
						routerLink="/land"
						routerLinkActive="bg-camp-sage/10 text-camp-sage"
						class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium"
					>
						<span class="text-lg">🗺️</span> Il Mio Terreno
					</a>
					<a
						routerLink="/calendar"
						routerLinkActive="bg-camp-sage/10 text-camp-sage"
						class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium"
					>
						<span class="text-lg">📅</span> Calendario
					</a>
					<a
						routerLink="/archive"
						routerLinkActive="bg-camp-sage/10 text-camp-sage"
						class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive hover:bg-camp-sand/20 transition-all font-medium"
					>
						<span class="text-lg">📂</span> Archivio attività
					</a>
				</nav>

				<div class="mt-auto pt-6 border-t border-camp-sand/40">
					<button
						type="button"
						(click)="openLogoutConfirm()"
						class="flex items-center gap-3 px-4 py-3 w-full rounded-camp text-camp-olive hover:text-red-500 hover:bg-red-50 transition-all font-medium cursor-pointer"
					>
						<span class="text-lg">🚪</span> Esci
					</button>
				</div>
			</aside>

			<div class="flex-1 lg:ml-64 flex flex-col min-w-0">
				<header class="h-14 landscape:h-11 md:h-16 bg-white/85 backdrop-blur-md border-b border-camp-sand/40 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-all pt-safe">
					<button
						(click)="toggleMobileMenu()"
						class="lg:hidden text-camp-earth p-1.5 -ml-1.5 rounded-lg hover:bg-camp-sand/30"
						aria-label="Menu"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16m-7 6h7"
							/>
						</svg>
					</button>

					<div class="lg:hidden flex items-center gap-2">
						<img
							src="assets/logo.png"
							alt="campAIgn Logo"
							class="w-8 h-8 landscape:w-7 landscape:h-7 sm:w-10 sm:h-10 object-contain"
						/>
						<span class="text-base sm:text-lg font-serif text-camp-earth tracking-tight">campAIgn</span>
					</div>

					<div class="flex items-center gap-3 sm:gap-4 ml-auto">
						<button class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-camp-sand/30 flex items-center justify-center text-camp-earth hover:bg-camp-sand/50 transition-all relative">
							<span class="text-base sm:text-lg">🔔</span>
							<span class="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 bg-camp-accent rounded-full border-2 border-white"></span>
						</button>
						<div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-camp-earth text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm">
							{{ userInitials() }}
						</div>
					</div>
				</header>

				<main class="flex-1 p-3.5 sm:p-6 lg:p-10 pb-24 lg:pb-10 pl-safe pr-safe">
					<ng-content></ng-content>
				</main>
			</div>

			@if (mobileMenuOpen()) {
				<div
					class="fixed inset-0 bg-camp-earth/20 backdrop-blur-sm z-[45] lg:hidden"
					(click)="toggleMobileMenu()"
				>
					<div
						class="w-64 h-full bg-white p-6 shadow-2xl animate-slide-in"
						(click)="$event.stopPropagation()"
					>
						<div class="flex items-center justify-between mb-10">
							<div class="flex items-center gap-2">
								<img
									src="assets/logo.png"
									alt="campAIgn Logo"
									class="w-14 h-14 object-contain"
								/>
								<span class="text-xl font-serif text-camp-earth">campAIgn</span>
							</div>
							<button
								(click)="toggleMobileMenu()"
								class="text-camp-olive"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<nav class="space-y-1">
							<a
								routerLink="/dashboard"
								(click)="toggleMobileMenu()"
								class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium"
								>🏡 Dashboard</a
							>
							<a
								routerLink="/meteo"
								(click)="toggleMobileMenu()"
								class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium"
								>☀️ Meteo</a
							>
							<a
								routerLink="/land"
								(click)="toggleMobileMenu()"
								class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium"
								>🗺️ Il Mio Terreno</a
							>
							<a
								routerLink="/calendar"
								(click)="toggleMobileMenu()"
								class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium"
								>📅 Calendario</a
							>
							<a
								routerLink="/archive"
								(click)="toggleMobileMenu()"
								class="flex items-center gap-3 px-4 py-3 rounded-camp text-camp-olive font-medium"
								>📂 Archivio attività</a
							>
							<div class="pt-4 border-t border-camp-sand/40">
								<button
									type="button"
									(click)="openLogoutConfirm()"
									class="flex items-center gap-3 px-4 py-3 w-full rounded-camp text-camp-olive hover:text-red-500 hover:bg-red-50 transition-all font-medium cursor-pointer text-left"
								>
									<span class="text-lg">🚪</span> Esci
								</button>
							</div>
						</nav>
					</div>
				</div>
			}
			<app-arnaldo-chat></app-arnaldo-chat>

			@if (showLogoutConfirm()) {
				<app-camp-dialog
					title="Conferma Uscita"
					subtitle="Termine Sessione"
					icon="🚪"
					maxWidth="max-w-md"
					(close)="showLogoutConfirm.set(false)"
				>
					<div class="space-y-3">
						<p class="text-sm text-camp-earth leading-relaxed">
							Sei sicuro di voler uscire dal tuo account <strong>campAIgn</strong>?
						</p>
						<p class="text-xs text-camp-olive/80 leading-relaxed">
							Dovrai effettuare nuovamente il login per accedere ai tuoi terreni.
						</p>
					</div>

					<div footer class="px-8 py-5 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-3">
						<button
							type="button"
							(click)="showLogoutConfirm.set(false)"
							class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-xs font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40 transition-colors cursor-pointer"
						>
							Rimani
						</button>
						<button
							type="button"
							(click)="confirmLogout()"
							class="px-5 py-2.5 bg-camp-olive hover:bg-camp-earth text-white rounded-camp text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
						>
							Esci
						</button>
					</div>
				</app-camp-dialog>
			}

			<!-- Mobile Bottom Navigation Bar (Thumb Zone) -->
			<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-camp-sand/50 shadow-camp-lg pb-safe">
				<div class="flex items-center justify-around px-1 py-1 sm:px-2">
					<a
						routerLink="/dashboard"
						routerLinkActive="text-camp-sage font-bold"
						[routerLinkActiveOptions]="{ exact: true }"
						class="flex flex-col items-center justify-center flex-1 py-1.5 text-camp-olive hover:text-camp-sage transition-colors text-center"
					>
						<span class="text-lg leading-none">🏡</span>
						<span class="text-[10px] tracking-tight mt-1">Home</span>
					</a>
					<a
						routerLink="/land"
						routerLinkActive="text-camp-sage font-bold"
						class="flex flex-col items-center justify-center flex-1 py-1.5 text-camp-olive hover:text-camp-sage transition-colors text-center"
					>
						<span class="text-lg leading-none">🗺️</span>
						<span class="text-[10px] tracking-tight mt-1">Terreno</span>
					</a>
					<a
						routerLink="/meteo"
						routerLinkActive="text-camp-sage font-bold"
						class="flex flex-col items-center justify-center flex-1 py-1.5 text-camp-olive hover:text-camp-sage transition-colors text-center"
					>
						<span class="text-lg leading-none">☀️</span>
						<span class="text-[10px] tracking-tight mt-1">Meteo</span>
					</a>
					<a
						routerLink="/calendar"
						routerLinkActive="text-camp-sage font-bold"
						class="flex flex-col items-center justify-center flex-1 py-1.5 text-camp-olive hover:text-camp-sage transition-colors text-center"
					>
						<span class="text-lg leading-none">📅</span>
						<span class="text-[10px] tracking-tight mt-1">Agenda</span>
					</a>
					<a
						routerLink="/archive"
						routerLinkActive="text-camp-sage font-bold"
						class="flex flex-col items-center justify-center flex-1 py-1.5 text-camp-olive hover:text-camp-sage transition-colors text-center"
					>
						<span class="text-lg leading-none">📂</span>
						<span class="text-[10px] tracking-tight mt-1">Archivio</span>
					</a>
				</div>
			</nav>
		</div>
	`
})
export class AppLayoutComponent {
	private authService = inject(AuthService);
	private router = inject(Router);

	mobileMenuOpen = signal(false);
	showLogoutConfirm = signal(false);

	userInitials = computed(() => {
		const user = this.authService.currentUser();
		if (!user?.email) return "U";
		return user.email.substring(0, 1).toUpperCase();
	});

	toggleMobileMenu() {
		this.mobileMenuOpen.update(v => !v);
	}

	openLogoutConfirm() {
		this.mobileMenuOpen.set(false);
		this.showLogoutConfirm.set(true);
	}

	async confirmLogout() {
		this.showLogoutConfirm.set(false);
		await this.authService.signOut();
		this.router.navigate(["/login"]);
	}
}
