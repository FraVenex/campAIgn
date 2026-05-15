import { Injectable, signal, computed, inject } from "@angular/core";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { SupabaseService } from "./supabase.service";
import { Router } from "@angular/router";

export interface Profile {
	id: string;
	full_name: string | null;
	onboarding_completed: boolean;
	created_at: string;
	updated_at: string;
}

@Injectable({
	providedIn: "root"
})
export class AuthService {
	private supabase: SupabaseClient;
	private _supabaseService = inject(SupabaseService);
	private router = inject(Router);
	
	private _currentUser = signal<User | null>(null);
	private _profile = signal<Profile | null>(null);
	private _isInitialLoading = signal<boolean>(true);
	private _isProfileLoading = signal<boolean>(false);

	readonly currentUser = this._currentUser.asReadonly();
	readonly profile = this._profile.asReadonly();
	readonly isInitialLoading = this._isInitialLoading.asReadonly();
	readonly isProfileLoading = this._isProfileLoading.asReadonly();
	readonly onboardingCompleted = computed(() => this._profile()?.onboarding_completed ?? false);

	readonly displayName = computed(() => {
		const p = this._profile();
		if (p?.full_name) return p.full_name;
		const u = this._currentUser();
		if (u?.email) return u.email.split("@")[0];
		return "Utente";
	});

	constructor() {
		this.supabase = this._supabaseService.client;
		this.initSession();
	}

	private async initSession() {
		try {
			const {
				data: { session }
			} = await this.supabase.auth.getSession();
			const user = session?.user ?? null;
			this._currentUser.set(user);

			if (user) {
				await this.fetchProfile(user.id);
			}
		} finally {
			this._isInitialLoading.set(false);
		}

		this.supabase.auth.onAuthStateChange((event, session) => {
			const user = session?.user ?? null;
			this._currentUser.set(user);

			if (user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
				// Eseguiamo fuori dal ciclo di lock di onAuthStateChange per evitare deadlock
				setTimeout(() => {
					this.fetchProfile(user.id);
				}, 0);
			} else if (!user) {
				this._profile.set(null);
			}
		});
	}

	private async fetchProfile(userId: string) {
		this._isProfileLoading.set(true);
		try {
			const { data, error } = await this.supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.maybeSingle();

			if (error) {
				console.error("Errore nel recupero del profilo:", error);
				return;
			}

			this._profile.set(data as Profile | null);
		} finally {
			this._isProfileLoading.set(false);
		}
	}

	async signUp(email: string, password: string, fullName: string) {
		return await this.supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName
				}
			}
		});
	}

	async signIn(email: string, password: string) {
		const result = await this.supabase.auth.signInWithPassword({ email, password });

		if (!result.error && result.data.user) {
			await this.fetchProfile(result.data.user.id);
		}

		return result;
	}

	async signOut() {
		await this.supabase.auth.signOut();
		this._currentUser.set(null);
		this._profile.set(null);
	}

	async completeOnboarding() {
		const user = this._currentUser();
		if (!user) throw new Error("Utente non autenticato");

		const { error } = await this.supabase
			.from("profiles")
			.update({ onboarding_completed: true })
			.eq("id", user.id);

		if (error) {
			console.error("Errore durante il completamento dell'onboarding:", error);
			throw error;
		}

		// Aggiorna il segnale locale in modo proattivo
		const currentProfile = this._profile();
		if (currentProfile) {
			this._profile.set({ ...currentProfile, onboarding_completed: true });
		} else {
			// Forza il caricamento del profilo se mancante
			await this.fetchProfile(user.id);
		}
	}

	isAuthenticated(): boolean {
		return !!this._currentUser();
	}

	getPostAuthRedirectPath(): string {
		if (!this.isAuthenticated()) {
			return "/login";
		}
		return this.onboardingCompleted() ? "/dashboard" : "/onboarding";
	}

	navigatePostAuth(): Promise<boolean> {
		const path = this.getPostAuthRedirectPath();
		return this.router.navigate([path]);
	}
}
