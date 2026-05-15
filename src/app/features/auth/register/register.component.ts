import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-register",
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink, CampCardComponent],
	template: `
		<div class="min-h-screen flex items-center justify-center bg-camp-beige p-4 sm:p-6">
			<div class="fixed inset-0 overflow-hidden pointer-events-none">
				<div class="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-camp-sage/[0.04] rounded-full blur-3xl"></div>
				<div class="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-camp-amber/[0.06] rounded-full blur-3xl"></div>
			</div>

			<div class="w-full max-w-[420px] relative z-10 animate-scale-in">
				<app-camp-card
					variant="glass"
					padding="large"
				>
					<div class="text-center mb-8">
						<div class="inline-flex items-center justify-center w-14 h-14 bg-camp-sage rounded-camp-lg mb-5 shadow-camp-sm">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-7 w-7 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
								/>
							</svg>
						</div>
						<h1 class="text-3xl font-serif text-camp-earth tracking-tight mb-1">Crea il tuo account</h1>
						<p class="text-sm text-camp-olive">Inizia a gestire il tuo terreno con intelligenza</p>
					</div>

					<form
						[formGroup]="registerForm"
						(ngSubmit)="onSubmit()"
						class="space-y-4"
					>
						@if (errorMessage()) {
							<div class="camp-alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-5 h-5 flex-shrink-0 mt-0.5"
								>
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
										clip-rule="evenodd"
									/>
								</svg>
								<span>{{ errorMessage() }}</span>
							</div>
						}

						<div>
							<label
								for="reg-fullname"
								class="camp-label"
								>Nome completo</label
							>
							<input
								id="reg-fullname"
								type="text"
								formControlName="fullName"
								class="camp-input"
								placeholder="Mario Rossi"
								autocomplete="name"
							/>
						</div>

						<div>
							<label
								for="reg-email"
								class="camp-label"
								>Email</label
							>
							<input
								id="reg-email"
								type="email"
								formControlName="email"
								class="camp-input"
								placeholder="mario.rossi@email.it"
								autocomplete="email"
							/>
						</div>

						<div>
							<label
								for="reg-password"
								class="camp-label"
								>Password</label
							>
							<div class="relative">
								<input
									id="reg-password"
									[type]="showPassword() ? 'text' : 'password'"
									formControlName="password"
									class="camp-input pr-12"
									placeholder="Minimo 6 caratteri"
									autocomplete="new-password"
								/>
								<button
									type="button"
									(click)="showPassword.set(!showPassword())"
									class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-camp-olive/50 hover:text-camp-sage rounded-lg hover:bg-camp-cream transition-all"
									[attr.aria-label]="showPassword() ? 'Nascondi password' : 'Mostra password'"
								>
									@if (showPassword()) {
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4.5 h-4.5"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
											/>
										</svg>
									} @else {
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4.5 h-4.5"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
											/>
										</svg>
									}
								</button>
							</div>
						</div>

						<div>
							<label
								for="reg-confirm"
								class="camp-label"
								>Conferma password</label
							>
							<input
								id="reg-confirm"
								[type]="showPassword() ? 'text' : 'password'"
								formControlName="confirmPassword"
								class="camp-input"
								[class.camp-input-error]="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched"
								placeholder="Ripeti la password"
								autocomplete="new-password"
							/>
							@if (registerForm.hasError("passwordMismatch") && registerForm.get("confirmPassword")?.touched) {
								<p class="camp-error-text">Le password non coincidono.</p>
							}
						</div>

						<div class="pt-2">
							<button
								type="submit"
								[disabled]="registerForm.invalid || isLoading()"
								class="camp-btn-primary"
							>
								@if (isLoading()) {
									<svg
										class="animate-spin-slow h-5 w-5 text-white"
										viewBox="0 0 24 24"
										fill="none"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="3"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									<span>Registrazione...</span>
								} @else {
									<span>Crea account</span>
								}
							</button>
						</div>

						<p class="text-center text-sm text-camp-bark/60 pt-1">
							Hai già un account?
							<a
								routerLink="/login"
								class="text-camp-sage font-semibold hover:text-camp-earth transition-colors ml-1"
								>Accedi</a
							>
						</p>
					</form>
				</app-camp-card>
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
			}
		`
	]
})
export class RegisterComponent {
	private fb = inject(FormBuilder);
	private authService = inject(AuthService);
	private router = inject(Router);

	isLoading = signal(false);
	showPassword = signal(false);
	errorMessage = signal<string | null>(null);

	registerForm = this.fb.group(
		{
			fullName: ["", [Validators.required, Validators.minLength(2)]],
			email: ["", [Validators.required, Validators.email]],
			password: ["", [Validators.required, Validators.minLength(6)]],
			confirmPassword: ["", [Validators.required]]
		},
		{ validators: this.passwordMatchValidator }
	);

	passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
		const password = control.get("password");
		const confirmPassword = control.get("confirmPassword");
		if (password && confirmPassword && password.value !== confirmPassword.value) {
			return { passwordMismatch: true };
		}
		return null;
	}

	async onSubmit() {
		if (this.registerForm.invalid) return;

		this.isLoading.set(true);
		this.errorMessage.set(null);

		const { email, password, fullName } = this.registerForm.value;
		const { error } = await this.authService.signUp(email!, password!, fullName!);

		if (error) {
			this.errorMessage.set(this.getErrorMessage(error.message));
			this.isLoading.set(false);
		} else {
			this.authService.navigatePostAuth();
		}
	}

	private getErrorMessage(msg: string): string {
		if (msg.includes("User already registered")) return "Questo indirizzo email è già registrato.";
		if (msg.includes("Password should be")) return "La password deve avere almeno 6 caratteri.";
		return "Si è verificato un errore durante la registrazione. Riprova più tardi.";
	}
}
