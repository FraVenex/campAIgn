import { Component, signal, computed, inject, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { LandService } from "../../core/services/land.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { startWith } from "rxjs";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";

interface PlantOption {
	value: string;
	label: string;
	icon: string;
	description: string;
}

@Component({
	selector: "app-onboarding",
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, CampCardComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="min-h-screen flex flex-col bg-camp-beige">
			<header class="px-6 py-5 flex items-center justify-between border-b border-camp-sand/30 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
				<div class="flex items-center gap-2.5">
					<img src="assets/logo.png" alt="campAIgn Logo" class="h-14 w-14 object-contain" />
					<span class="text-xl font-serif text-camp-earth hidden sm:block">campAIgn</span>
				</div>

				<div class="flex items-center gap-6">
					<div class="flex items-center gap-2">
						@for (step of steps; track step.number) {
							<div class="flex items-center gap-2">
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
									[class]="currentStep() >= step.number ? 'bg-camp-sage text-white shadow-camp-sm' : 'bg-camp-sand text-camp-olive'"
								>
									@if (currentStep() > step.number) {
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									} @else {
										{{ step.number }}
									}
								</div>
								@if (step.number < 3) {
									<div
										class="w-8 h-0.5 rounded-full transition-all duration-300"
										[class]="currentStep() > step.number ? 'bg-camp-sage' : 'bg-camp-sand'"
									></div>
								}
							</div>
						}
					</div>
				</div>
			</header>

			<main class="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-camp-beige to-camp-cream">
				<div class="w-full max-w-lg">
					<form
						[formGroup]="onboardingForm"
						(ngSubmit)="submitOnboarding()"
					>
						@if (currentStep() === 1) {
							<app-camp-card
								padding="large"
								class="block animate-slide-up"
							>
								<div class="text-center mb-8">
									<h1 class="text-3xl sm:text-4xl font-serif text-camp-earth mb-2">Il tuo terreno</h1>
									<p class="text-camp-olive text-sm sm:text-base">Dagli un nome e dicci cosa coltivi.</p>
								</div>

								<div class="space-y-6">
									<div>
										<label
											for="ob-name"
											class="camp-label"
											>Nome del terreno</label
										>
										<input
											id="ob-name"
											formControlName="name"
											type="text"
											class="camp-input"
											placeholder="Es: Uliveto di Nonno, Campagna Nord..."
										/>
										<p class="camp-helper">Scegli un nome che ti aiuti a riconoscerlo.</p>
										@if (onboardingForm.get("name")?.errors?.["minlength"] && onboardingForm.get("name")?.touched) {
											<p class="text-xs text-camp-error mt-1 animate-fade-in font-medium">Il nome deve contenere almeno 3 caratteri.</p>
										}
									</div>

									<div>
										<label class="camp-label">Coltura principale</label>
										<div class="grid grid-cols-2 gap-3 mt-1">
											@for (option of plantOptions; track option.value) {
												<button
													type="button"
													(click)="selectPlantType(option.value)"
													class="p-4 rounded-camp-lg border-2 text-left transition-all duration-200 group"
													[class]="
														formValue()?.main_crop === option.value
															? 'border-camp-sage bg-camp-sage/[0.06] shadow-camp-sm'
															: 'border-camp-sand bg-white hover:border-camp-olive/40 hover:shadow-camp-sm'
													"
												>
													<span class="text-2xl mb-2 block group-hover:scale-110 transition-transform">{{ option.icon }}</span>
													<span
														class="text-sm font-semibold block"
														[class]="formValue()?.main_crop === option.value ? 'text-camp-sage' : 'text-camp-earth'"
														>{{ option.label }}</span
													>
													<span class="text-xs text-camp-olive/60 block mt-0.5">{{ option.description }}</span>
												</button>
											}
										</div>
									</div>
								</div>

								<button
									type="button"
									[disabled]="!isStep1Valid()"
									(click)="nextStep()"
									class="camp-btn-primary mt-8 shadow-camp-sm"
								>
									Continua
								</button>
							</app-camp-card>
						}

						@if (currentStep() === 2) {
							<app-camp-card
								padding="large"
								class="block animate-slide-up"
							>
								<div class="text-center mb-8">
									<h1 class="text-3xl sm:text-4xl font-serif text-camp-earth mb-2">Dove si trova?</h1>
									<p class="text-camp-olive text-sm sm:text-base">Ci servono le coordinate per fornirti dati meteo precisi.</p>
								</div>

								<div class="space-y-5">
									<button
										type="button"
										(click)="getLocation()"
										[disabled]="isLocating()"
										class="w-full flex items-center justify-center gap-2.5 py-4 rounded-camp-lg border-2 border-dashed border-camp-sage/30 text-camp-sage font-semibold hover:bg-camp-sage/5 hover:border-camp-sage/50 transition-all shadow-sm"
									>
										@if (isLocating()) {
											<svg
												class="animate-spin-slow h-5 w-5"
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
											<span>Rilevamento in corso...</span>
										} @else {
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
													clip-rule="evenodd"
												/>
											</svg>
											<span>Rileva posizione attuale</span>
										}
									</button>

									<div class="flex items-center gap-3">
										<div class="flex-1 h-px bg-camp-sand/50"></div>
										<span class="text-[10px] text-camp-olive/40 font-bold uppercase tracking-widest">oppure inserisci</span>
										<div class="flex-1 h-px bg-camp-sand/50"></div>
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div>
											<label
												for="ob-lat"
												class="camp-label text-center"
												>Latitudine</label
											>
											<input
												id="ob-lat"
												formControlName="latitude"
												type="number"
												step="any"
												class="camp-input text-center"
												placeholder="40.1234"
											/>
										</div>
										<div>
											<label
												for="ob-lon"
												class="camp-label text-center"
												>Longitudine</label
											>
											<input
												id="ob-lon"
												formControlName="longitude"
												type="number"
												step="any"
												class="camp-input text-center"
												placeholder="18.5678"
											/>
										</div>
									</div>

									@if (locationError()) {
										<div class="camp-alert-error">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="w-5 h-5 flex-shrink-0"
											>
												<path
													fill-rule="evenodd"
													d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span>{{ locationError() }}</span>
										</div>
									}
								</div>

								<div class="flex gap-3 mt-8">
									<button
										type="button"
										(click)="prevStep()"
										class="camp-btn-secondary flex-1 shadow-sm"
									>
										Indietro
									</button>
									<button
										type="button"
										[disabled]="!isStep2Valid()"
										(click)="nextStep()"
										class="camp-btn-primary flex-[2] shadow-camp-sm"
									>
										Continua
									</button>
								</div>
							</app-camp-card>
						}

						@if (currentStep() === 3) {
							<app-camp-card
								padding="large"
								class="block animate-slide-up"
							>
								<div class="text-center mb-8">
									<h1 class="text-3xl sm:text-4xl font-serif text-camp-earth mb-2">Le tue piante</h1>
									<p class="text-camp-olive text-sm sm:text-base">Quanti esemplari gestirai e come sono disposti?</p>
								</div>

								<div class="space-y-6">
									<div>
										<div class="flex justify-between items-center mb-3">
											<label class="camp-label mb-0">Numero totale di piante</label>
											<div class="flex items-center gap-2">
												<input
													formControlName="plants_count"
													type="number"
													class="w-20 px-2 py-1 text-center bg-camp-sage/10 text-camp-sage font-bold rounded-lg border-none focus:ring-1 focus:ring-camp-sage tabular-nums transition-all"
												/>
											</div>
										</div>
										<input
											formControlName="plants_count"
											type="range"
											min="1"
											max="500"
											class="w-full accent-camp-sage cursor-pointer"
											(input)="updateSuggestedLayout()"
										/>
										<div class="flex justify-between text-[10px] uppercase tracking-tighter text-camp-olive/40 mt-1 font-bold">
											<span>1 pianta</span>
											<span>250 piante</span>
											<span>500+ piante</span>
										</div>
									</div>

									<div>
										<label class="camp-label mb-3">Disposizione nel terreno</label>
										<div class="grid grid-cols-1 gap-3">
											@for (option of layoutOptions; track option.value) {
												<button
													type="button"
													(click)="selectLayout(option.value)"
													class="flex items-center gap-4 p-4 rounded-camp-lg border-2 text-left transition-all duration-200 group"
													[class]="
														onboardingForm.get('layout_type')?.value === option.value ? 'border-camp-sage bg-camp-sage/[0.06] shadow-camp-sm' : 'border-camp-sand bg-white hover:border-camp-olive/40'
													"
												>
													<div
														class="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm transition-all group-hover:scale-105"
														[class]="onboardingForm.get('layout_type')?.value === option.value ? 'bg-camp-sage text-white' : 'bg-camp-sand text-camp-olive'"
													>
														{{ option.icon }}
													</div>
													<div class="flex-1">
														<div class="flex items-center justify-between">
															<span
																class="font-bold block"
																[class]="onboardingForm.get('layout_type')?.value === option.value ? 'text-camp-sage' : 'text-camp-earth'"
																>{{ option.label }}</span
															>
															@if (suggestedLayout() === option.value) {
																<span class="text-[10px] font-bold uppercase tracking-wider bg-camp-sage/10 text-camp-sage px-2 py-0.5 rounded-full">Suggerito</span>
															}
														</div>
														<span class="text-xs text-camp-olive/70 block mt-0.5">{{ option.description }}</span>
													</div>
													<div
														class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
														[class]="onboardingForm.get('layout_type')?.value === option.value ? 'border-camp-sage bg-camp-sage' : 'border-camp-sand'"
													>
														@if (onboardingForm.get("layout_type")?.value === option.value) {
															<svg
																xmlns="http://www.w3.org/2000/svg"
																class="h-3 w-3 text-white"
																viewBox="0 0 20 20"
																fill="currentColor"
															>
																<path
																	fill-rule="evenodd"
																	d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																	clip-rule="evenodd"
																/>
															</svg>
														}
													</div>
												</button>
											}
										</div>
									</div>
								</div>

								<div class="flex gap-3 mt-8">
									<button
										type="button"
										(click)="prevStep()"
										class="camp-btn-secondary flex-1 shadow-sm"
									>
										Indietro
									</button>
									<button
										type="submit"
										[disabled]="onboardingForm.invalid || isSubmitting()"
										class="camp-btn-primary flex-[2] shadow-camp-sm"
									>
										@if (isSubmitting()) {
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
											<span>Configurazione...</span>
										} @else {
											<span>Inizia l'avventura</span>
										}
									</button>
								</div>

								@if (submitError()) {
									<div class="camp-alert-error mt-4">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-5 h-5 flex-shrink-0"
										>
											<path
												fill-rule="evenodd"
												d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
												clip-rule="evenodd"
											/>
										</svg>
										<span>{{ submitError() }}</span>
									</div>
								}
							</app-camp-card>
						}
					</form>
				</div>
			</main>
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
export class OnboardingComponent {
	private fb = inject(FormBuilder);
	private router = inject(Router);
	private authService = inject(AuthService);
	private landService = inject(LandService);

	currentStep = signal(1);
	isSubmitting = signal(false);
	isLocating = signal(false);
	locationError = signal<string | null>(null);
	submitError = signal<string | null>(null);

	steps = [
		{ number: 1, label: "Terreno" },
		{ number: 2, label: "Posizione" },
		{ number: 3, label: "Piante" }
	];

	plantOptions: PlantOption[] = [
		{ value: "ULIVI", label: "Uliveto", icon: "🫒", description: "Olive e olio d'oliva" },
		{ value: "AGRUMI", label: "Agrumeto", icon: "🍊", description: "Limoni, arance e cedri" },
		{ value: "VIGNETO", label: "Vigneto", icon: "🍇", description: "Uva da tavola o da vino" },
		{ value: "ALTRO", label: "Altro / Misto", icon: "🌿", description: "Orto, alberi da frutto o misto" }
	];

	layoutOptions = [
		{ value: "loose", label: "Filari ampi", icon: "↔️", description: "Grande spazio tra le piante per una cura individuale meticolosa." },
		{ value: "medium_grid", label: "Griglia regolare", icon: "🟦", description: "Distribuzione equilibrata per un monitoraggio efficiente." },
		{ value: "dense_grid", label: "Griglia densa", icon: "📱", description: "Massima ottimizzazione dello spazio per grandi numeri." },
		{ value: "free", label: "Disposizione libera", icon: "🍃", description: "Nessuno schema fisso, seguiamo la natura del terreno." }
	];

	onboardingForm: FormGroup = this.fb.group({
		name: ["", [Validators.required, Validators.minLength(3)]],
		main_crop: ["ULIVI", Validators.required],
		latitude: [null as number | null, [Validators.required]],
		longitude: [null as number | null, [Validators.required]],
		plants_count: [50, [Validators.required, Validators.min(1)]],
		layout_type: ["medium_grid", Validators.required]
	});

	formValue = toSignal(this.onboardingForm.valueChanges.pipe(startWith(this.onboardingForm.value)));

	isStep1Valid = computed(() => {
		const val = this.formValue();
		const nameValid = val?.name?.length >= 3;
		const cropValid = !!val?.main_crop;
		return nameValid && cropValid;
	});

	isStep2Valid = computed(() => {
		const val = this.formValue();
		const latValid = val?.latitude !== null && val?.latitude !== undefined;
		const lonValid = val?.longitude !== null && val?.longitude !== undefined;
		return latValid && lonValid;
	});

	suggestedLayout = computed(() => {
		const count = this.onboardingForm.get("plants_count")?.value ?? 50;
		return this.landService.calculateSuggestedLayout(count);
	});

	updateSuggestedLayout() {
		const suggested = this.suggestedLayout();
		this.onboardingForm.get("layout_type")?.setValue(suggested);
	}

	selectLayout(value: string) {
		this.onboardingForm.get("layout_type")?.setValue(value);
	}

	selectPlantType(value: string) {
		this.onboardingForm.patchValue({ main_crop: value });
	}

	nextStep() {
		if (this.currentStep() === 2) {
			this.updateSuggestedLayout();
		}
		if (this.currentStep() < 3) {
			this.currentStep.update(s => s + 1);
		}
	}

	prevStep() {
		if (this.currentStep() > 1) {
			this.currentStep.update(s => s - 1);
		}
	}

	getLocation() {
		if (!("geolocation" in navigator)) {
			this.locationError.set("La geolocalizzazione non è supportata dal tuo browser.");
			return;
		}

		this.isLocating.set(true);
		this.locationError.set(null);

		navigator.geolocation.getCurrentPosition(
			position => {
				this.onboardingForm.patchValue({
					latitude: parseFloat(position.coords.latitude.toFixed(6)),
					longitude: parseFloat(position.coords.longitude.toFixed(6))
				});
				this.isLocating.set(false);
			},
			error => {
				this.isLocating.set(false);
				switch (error.code) {
					case error.PERMISSION_DENIED:
						this.locationError.set("Permesso negato. Inserisci le coordinate manualmente.");
						break;
					case error.POSITION_UNAVAILABLE:
						this.locationError.set("Posizione non disponibile. Inserisci le coordinate manualmente.");
						break;
					default:
						this.locationError.set("Errore nel rilevamento della posizione.");
				}
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	async submitOnboarding() {
		if (this.onboardingForm.invalid) return;

		this.isSubmitting.set(true);
		this.submitError.set(null);

		try {
			const formValue = this.onboardingForm.value;
			console.log("Inizio submitOnboarding. Form:", formValue);

			console.log("Chiamo this.landService.createFarm...");
			await this.landService.createFarm({
				name: formValue.name,
				latitude: formValue.latitude,
				longitude: formValue.longitude,
				main_crop: formValue.main_crop,
				plants_count: formValue.plants_count,
				layout_type: formValue.layout_type
			});
			console.log("createFarm completato con successo.");

			console.log("Chiamo this.authService.completeOnboarding...");
			await this.authService.completeOnboarding();
			console.log("completeOnboarding completato con successo.");

			console.log("Avvio timeout navigazione...");
			setTimeout(() => {
				console.log("Chiamo authService.navigatePostAuth...");
				this.authService
					.navigatePostAuth()
					.then(success => {
						if (!success) {
							console.error("Navigazione annullata dal Guard o fallita.");
							this.isSubmitting.set(false);
						}
					})
					.catch(err => {
						console.error("Errore router:", err);
						this.isSubmitting.set(false);
					});
			}, 100);
		} catch (error) {
			console.error("Errore sottomissione onboarding:", error);
			this.submitError.set("Errore di connessione o salvataggio. Riprova.");
			this.isSubmitting.set(false);
		} finally {
		}
	}
}
