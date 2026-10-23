import { Component, inject, signal, computed } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { ArnaldoChatComponent } from "../arnaldo-chat/arnaldo-chat.component";
import { CampDialogComponent } from "../camp-dialog/camp-dialog.component";
import { ToastHostComponent } from "../toast-host/toast-host.component";
import { MOBILE_NAV, NAV_SECTIONS, NavSection } from "../../../core/constants/navigation";

/**
 * Layout applicativo: menù laterale a sezioni con sotto-menù, header, bottom bar mobile,
 * notifiche globali e assistente Arnaldo sempre presente.
 */
@Component({
	selector: "app-layout",
	standalone: true,
	imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, ArnaldoChatComponent, CampDialogComponent, ToastHostComponent],
	template: `
		<div class="min-h-screen bg-camp-cream/30 flex">
			<aside class="hidden lg:flex flex-col w-64 bg-white border-r border-camp-sand/40 px-4 py-6 fixed h-full z-40 overflow-y-auto custom-scrollbar">
				<a routerLink="/journal/home" class="flex items-center gap-2 mb-8 px-2">
					<img src="assets/logo.png" alt="campAIgn" class="w-12 h-12 object-contain" />
					<span class="text-xl font-serif text-camp-earth tracking-tight">campAIgn</span>
				</a>
				<ng-container *ngTemplateOutlet="navTpl; context: { $implicit: false }"></ng-container>
				<div class="mt-auto pt-4 border-t border-camp-sand/40">
					<button type="button" (click)="openLogoutConfirm()" class="flex items-center gap-3 px-3 py-2.5 w-full rounded-camp text-sm text-camp-olive hover:text-camp-error hover:bg-camp-error-light transition-all font-medium cursor-pointer">
						<span>🚪</span> Esci
					</button>
				</div>
			</aside>

			<div class="flex-1 lg:ml-64 flex flex-col min-w-0">
				<header class="h-14 md:h-16 bg-white/85 backdrop-blur-md border-b border-camp-sand/40 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 pt-safe">
					<button (click)="mobileMenuOpen.set(true)" class="lg:hidden text-camp-earth p-1.5 -ml-1.5 rounded-lg hover:bg-camp-sand/30" aria-label="Apri menù">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
					</button>
					<div class="lg:hidden flex items-center gap-2">
						<img src="assets/logo.png" alt="campAIgn" class="w-8 h-8 object-contain" />
						<span class="text-base font-serif text-camp-earth tracking-tight">campAIgn</span>
					</div>
					<div class="hidden lg:flex items-center gap-2 text-sm text-camp-olive">
						<span>{{ activeSection()?.icon }}</span>
						<span class="font-semibold text-camp-earth">{{ activeSection()?.label }}</span>
					</div>
					<div class="flex items-center gap-3 ml-auto lg:ml-0">
						<span class="hidden sm:block text-sm text-camp-olive">Ciao, <strong class="text-camp-earth">{{ displayName() }}</strong></span>
						<div class="w-9 h-9 rounded-full bg-camp-earth text-white flex items-center justify-center text-xs font-bold shadow-sm">{{ userInitials() }}</div>
					</div>
				</header>

				<main class="flex-1 p-3.5 sm:p-6 lg:p-10 pb-28 lg:pb-12 pl-safe pr-safe">
					<ng-content></ng-content>
				</main>
			</div>

			@if (mobileMenuOpen()) {
				<div class="fixed inset-0 bg-camp-earth/25 backdrop-blur-sm z-[60] lg:hidden" (click)="mobileMenuOpen.set(false)">
					<div class="w-72 max-w-[85vw] h-full bg-white px-4 py-6 shadow-2xl animate-slide-right flex flex-col overflow-y-auto" (click)="$event.stopPropagation()">
						<div class="flex items-center justify-between mb-6 px-2">
							<div class="flex items-center gap-2">
								<img src="assets/logo.png" alt="campAIgn" class="w-10 h-10 object-contain" />
								<span class="text-lg font-serif text-camp-earth">campAIgn</span>
							</div>
							<button (click)="mobileMenuOpen.set(false)" class="w-9 h-9 rounded-full hover:bg-camp-sand/30 text-camp-olive" aria-label="Chiudi menù">✕</button>
						</div>
						<ng-container *ngTemplateOutlet="navTpl; context: { $implicit: true }"></ng-container>
						<div class="mt-auto pt-4 border-t border-camp-sand/40">
							<button type="button" (click)="openLogoutConfirm()" class="flex items-center gap-3 px-3 py-2.5 w-full rounded-camp text-sm text-camp-olive hover:text-camp-error hover:bg-camp-error-light font-medium cursor-pointer">
								<span>🚪</span> Esci
							</button>
						</div>
					</div>
				</div>
			}

			<ng-template #navTpl let-mobile>
				<nav class="space-y-0.5" aria-label="Navigazione principale">
					@for (section of sections; track section.base) {
						<a
							[routerLink]="section.link"
							(click)="mobile && mobileMenuOpen.set(false)"
							class="flex items-center gap-3 px-3 py-2.5 rounded-camp text-sm font-semibold transition-all"
							[class]="isActive(section) ? 'bg-camp-sage text-white shadow-camp-sm' : 'text-camp-earth hover:bg-camp-sand/30'"
						>
							<span class="text-base w-5 text-center">{{ section.icon }}</span>
							<span class="leading-snug">{{ section.label }}</span>
						</a>
						@if (section.children && isActive(section)) {
							<div class="ml-6 pl-3 border-l-2 border-camp-sand/60 my-1 space-y-0.5 animate-fade-in">
								@for (child of section.children; track child.link) {
									<a
										[routerLink]="child.link"
										routerLinkActive="text-camp-sage font-bold bg-camp-sage/10"
										(click)="mobile && mobileMenuOpen.set(false)"
										class="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-camp-olive hover:text-camp-earth hover:bg-camp-sand/20 transition-all"
									>
										<span class="text-xs">{{ child.icon }}</span>{{ child.label }}
									</a>
								}
							</div>
						}
					}
				</nav>
			</ng-template>

			<app-arnaldo-chat></app-arnaldo-chat>
			<app-toast-host></app-toast-host>

			@if (showLogoutConfirm()) {
				<app-camp-dialog title="Conferma uscita" subtitle="Termine sessione" icon="🚪" maxWidth="max-w-md" (close)="showLogoutConfirm.set(false)">
					<p class="text-sm text-camp-earth leading-relaxed">Sei sicuro di voler uscire dal tuo account <strong>campAIgn</strong>?</p>
					<div footer class="dialog-footer">
						<button type="button" (click)="showLogoutConfirm.set(false)" class="btn btn-secondary">Rimani</button>
						<button type="button" (click)="confirmLogout()" class="btn btn-primary">Esci</button>
					</div>
				</app-camp-dialog>
			}

			<!-- Bottom navigation mobile -->
			<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-camp-sand/50 shadow-camp-lg pb-safe" aria-label="Navigazione rapida">
				<div class="flex items-stretch justify-around px-1 py-1">
					@for (section of mobileSections; track section.base) {
						<a [routerLink]="section.link" class="flex flex-col items-center justify-center flex-1 py-1.5 transition-colors text-center" [class.text-camp-sage]="isActive(section)" [class.font-bold]="isActive(section)" [class.text-camp-olive]="!isActive(section)">
							<span class="text-lg leading-none">{{ section.icon }}</span>
							<span class="text-[10px] tracking-tight mt-1">{{ section.short || section.label }}</span>
						</a>
					}
					<button type="button" (click)="mobileMenuOpen.set(true)" class="flex flex-col items-center justify-center flex-1 py-1.5 text-center" [class.text-camp-sage]="isInMoreSection()" [class.text-camp-olive]="!isInMoreSection()">
						<span class="text-lg leading-none">☰</span>
						<span class="text-[10px] tracking-tight mt-1">Altro</span>
					</button>
				</div>
			</nav>
		</div>
	`
})
export class AppLayoutComponent {
	private authService = inject(AuthService);
	private router = inject(Router);

	readonly sections = NAV_SECTIONS;
	readonly mobileSections = NAV_SECTIONS.filter(s => MOBILE_NAV.includes(s.base));
	readonly mobileMenuOpen = signal(false);
	readonly showLogoutConfirm = signal(false);

	private readonly url = toSignal(
		this.router.events.pipe(
			filter((e): e is NavigationEnd => e instanceof NavigationEnd),
			map(e => e.urlAfterRedirects)
		),
		{ initialValue: this.router.url }
	);

	readonly activeSection = computed(() => this.sections.find(s => this.url().startsWith(s.base)) ?? null);
	readonly isInMoreSection = computed(() => {
		const active = this.activeSection();
		return !!active && !MOBILE_NAV.includes(active.base);
	});
	readonly displayName = this.authService.displayName;
	readonly userInitials = computed(() => this.authService.displayName().substring(0, 1).toUpperCase() || "U");

	isActive(section: NavSection): boolean {
		return this.activeSection()?.base === section.base;
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
