import { Component, OnInit, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { LandService, Farm } from "../../core/services/land.service";
import { PlantsService, Plant } from "../../core/services/plants.service";
import { CalendarService, CalendarEvent } from "../../core/services/calendar.service";
import { WeatherService, WeatherData } from "../../core/services/weather.service";
import { WeatherImpactService } from "../../core/services/weather-impact.service";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { FarmSummaryComponent } from "./components/farm-summary.component";
import { WeatherCardComponent } from "./components/weather-card.component";
import { CalendarStripComponent } from "./components/calendar-strip.component";
import { DashboardAlertsComponent, DashboardAlert } from "./components/dashboard-alerts.component";
import { ArnaldoSuggestionsComponent } from "./components/arnaldo-suggestions.component";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-dashboard",
	standalone: true,
	imports: [
		CommonModule,
		RouterLink,
		AppLayoutComponent,
		FarmSummaryComponent,
		WeatherCardComponent,
		CalendarStripComponent,
		DashboardAlertsComponent,
		ArnaldoSuggestionsComponent,
		CampCardComponent
	],
	template: `
		<app-layout>
			<div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
				<section class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<div class="flex items-center gap-2 mb-1">
							<h1 class="text-3xl md:text-4xl font-serif text-camp-earth">Centro Operativo</h1>
							@if (selectedFarm()) {
								<span class="px-3 py-1 rounded-full bg-camp-sage/10 text-camp-sage text-xs font-bold uppercase tracking-wider">
									{{ selectedFarm()?.name }}
								</span>
							}
						</div>
						<p class="text-camp-olive font-medium text-sm">
							{{ summaryText() }}
						</p>
					</div>

					<div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-camp-olive bg-white px-4 py-2 rounded-full shadow-xs border border-camp-sand/40 self-start md:self-auto">
						<span class="w-2 h-2 bg-camp-success rounded-full animate-pulse"></span>
						Monitoraggio Terreno Attivo
					</div>
				</section>

				@if (isLoading()) {
					<div class="space-y-6">
						<div class="h-16 bg-camp-sand/20 animate-pulse rounded-camp"></div>
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
							<div class="lg:col-span-5 h-64 bg-camp-sand/20 animate-pulse rounded-camp"></div>
							<div class="lg:col-span-7 h-64 bg-camp-sand/20 animate-pulse rounded-camp"></div>
						</div>
						<div class="h-48 bg-camp-sand/20 animate-pulse rounded-camp"></div>
					</div>
				} @else if (farms().length > 0) {
					<div class="space-y-6">
						@if (activeAlerts().length > 0) {
							<app-dashboard-alerts [alerts]="activeAlerts()" class="block w-full" />
						}

						<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
							<div class="lg:col-span-5 flex flex-col h-full">
								<app-farm-summary
									[farm]="selectedFarm()!"
									[totalPlants]="plants().length"
									[optimalCount]="optimalPlantsCount()"
									[criticalCount]="criticalPlantsCount()"
									class="h-full w-full"
								/>
							</div>
							<div class="lg:col-span-7 flex flex-col h-full">
								<app-weather-card [weather]="weatherData()" class="h-full w-full" />
							</div>
						</div>

						<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
							<div class="lg:col-span-7 flex flex-col h-full">
								<app-calendar-strip [events]="upcomingAndOverdueEvents()" [weather]="weatherData()" class="h-full w-full" />
							</div>

							<div class="lg:col-span-5 flex flex-col h-full">
								<app-camp-card
									title="Stato di Salute Piante"
									subtitle="Attenzione & Monitoraggio"
									icon="🌿"
									class="h-full w-full"
								>
									<div header-action>
										<a
											routerLink="/land"
											class="text-xs font-semibold text-camp-sage hover:text-camp-earth transition-colors"
										>
											Mappa Terreno
										</a>
									</div>

									@if (criticalPlants().length > 0) {
										<div class="space-y-2.5 my-auto">
											@for (plant of criticalPlants().slice(0, 4); track plant.id) {
												<a
													[routerLink]="['/land/plant', plant.id]"
													class="p-3 rounded-xl bg-amber-50/60 border border-amber-200 hover:bg-amber-100/60 flex items-center justify-between transition-all group"
												>
													<div class="flex items-center gap-3">
														<div class="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
															⚠️
														</div>
														<div>
															<h4 class="font-serif font-bold text-xs text-camp-earth group-hover:text-amber-900 transition-colors">
																{{ plant.name }}
															</h4>
															<p class="text-[10px] text-camp-olive/80 font-medium">
																Specie: {{ plant.species }}
															</p>
														</div>
													</div>

													<span class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-200 text-amber-900">
														{{ plant.status }}
													</span>
												</a>
											}
										</div>
									} @else if (plants().length > 0) {
										<div class="p-4 rounded-2xl bg-camp-success-light/30 border border-camp-success/15 flex items-center gap-3 my-auto">
											<div class="w-8 h-8 rounded-full bg-camp-success-light text-camp-success flex items-center justify-center text-sm font-bold shrink-0">
												✓
											</div>
											<div>
												<p class="text-xs font-bold text-camp-earth uppercase tracking-wider">Tutte le piante sono in salute</p>
												<p class="text-xs text-camp-olive/80">Nessuna pianta segnala sintomi da monitorare.</p>
											</div>
										</div>
									} @else {
										<div class="p-4 rounded-2xl bg-camp-cream/30 border border-dashed border-camp-sand/60 flex items-center gap-3 my-auto">
											<div class="w-8 h-8 rounded-full bg-camp-sand/30 text-camp-olive flex items-center justify-center text-sm font-bold shrink-0">
												🌱
											</div>
											<div>
												<p class="text-xs font-bold text-camp-earth uppercase tracking-wider">Nessuna pianta censita</p>
												<p class="text-xs text-camp-olive/80">Aggiungi piante dalla mappa del terreno per avviare il monitoraggio.</p>
											</div>
										</div>
									}
								</app-camp-card>
							</div>
						</div>

						<app-arnaldo-suggestions
							[suggestions]="effectiveArnaldoSuggestions()"
							(accept)="handleAcceptSuggestion($event)"
							(dismiss)="handleDismissSuggestion($event)"
							class="block w-full mt-6"
						/>
					</div>
				} @else {
					<div class="max-w-2xl mx-auto py-12">
						<app-camp-card
							title="Nessun terreno registrato"
							subtitle="Benvenuto in campAIgn"
							icon="🚜"
							padding="large"
						>
							<div class="flex flex-col items-center text-center">
								<p class="text-camp-olive text-lg mb-8 max-w-md">
									Sembra che tu non abbia ancora configurato il tuo primo terreno. Aggiungilo ora per iniziare a monitorare le tue piante con l'aiuto di Arnaldo.
								</p>
								<a
									routerLink="/onboarding"
									class="camp-btn-primary px-8 py-3.5 text-base"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										/>
									</svg>
									Aggiungi il tuo primo terreno
								</a>
							</div>
						</app-camp-card>
					</div>
				}
			</div>
		</app-layout>
	`
})
export class DashboardComponent implements OnInit {
	private landService = inject(LandService);
	private plantsService = inject(PlantsService);
	private calendarService = inject(CalendarService);
	private weatherService = inject(WeatherService);
	private weatherImpactService = inject(WeatherImpactService);

	farms = signal<Farm[]>([]);
	selectedFarm = signal<Farm | null>(null);
	plants = signal<Plant[]>([]);
	confirmedEvents = signal<CalendarEvent[]>([]);
	arnaldoSuggestions = signal<CalendarEvent[]>([]);
	weatherData = signal<WeatherData | null>(null);
	isLoading = signal(true);

	constructor() {
		effect(
			() => {
				const farm = this.selectedFarm();
				if (farm) {
					this.loadFarmData(farm);
				}
			},
			{ allowSignalWrites: true }
		);
	}

	async ngOnInit() {
		try {
			this.isLoading.set(true);
			const farms = await this.landService.getFarms();
			this.farms.set(farms);

			if (farms.length > 0) {
				this.selectedFarm.set(farms[0]);
			}
		} catch (error) {
			console.error("Error loading farms:", error);
		} finally {
			this.isLoading.set(false);
		}
	}

	private async loadFarmData(farm: Farm) {
		try {
			if (farm.id) {
				const farmPlants = await this.plantsService.getPlantsByFarm(farm.id);
				this.plants.set(farmPlants);
			}

			const events = await this.calendarService.getConfirmedEvents();
			this.confirmedEvents.set(events);

			const suggestions = await this.calendarService.getSuggestedEvents();
			this.arnaldoSuggestions.set(suggestions);

			if (farm.latitude && farm.longitude) {
				this.loadWeather(farm.latitude, farm.longitude);
			}
		} catch (error) {
			console.error("Error loading farm detailed data:", error);
		}
	}

	private loadWeather(lat: number, lon: number) {
		this.weatherService.getWeather(lat, lon).subscribe({
			next: data => this.weatherData.set(data),
			error: err => console.error("Error fetching weather:", err)
		});
	}

	async handleAcceptSuggestion(id: string) {
		try {
			if (id.startsWith('weather-sug-')) {
				const targetSug = this.effectiveArnaldoSuggestions().find(s => s.id === id);
				if (targetSug) {
					await this.calendarService.createEvent({
						farm_id: targetSug.farm_id,
						title: targetSug.title,
						description: targetSug.description,
						type: targetSug.type,
						start: targetSug.start,
						end: targetSug.end,
						all_day: targetSug.all_day,
						source: 'arnaldo',
						status: 'confirmed'
					});
				}
			} else {
				await this.calendarService.acceptSuggestion(id);
			}
			const suggestions = await this.calendarService.getSuggestedEvents();
			this.arnaldoSuggestions.set(suggestions);
			const events = await this.calendarService.getConfirmedEvents();
			this.confirmedEvents.set(events);
		} catch (err) {
			console.error("Error accepting suggestion:", err);
		}
	}

	async handleDismissSuggestion(id: string) {
		try {
			if (!id.startsWith('weather-sug-')) {
				await this.calendarService.dismissSuggestion(id);
			}
			this.arnaldoSuggestions.update(list => list.filter(s => s.id !== id));
		} catch (err) {
			console.error("Error dismissing suggestion:", err);
		}
	}

	criticalPlants = computed(() => {
		return this.plants().filter(p => p.status === "Attenzione" || p.status === "Stressato");
	});

	optimalPlantsCount = computed(() => {
		return this.plants().filter(p => p.status === "Ottimo").length;
	});

	criticalPlantsCount = computed(() => {
		return this.criticalPlants().length;
	});

	upcomingAndOverdueEvents = computed(() => {
		return [...this.confirmedEvents()].sort((a, b) => {
			return new Date(a.start).getTime() - new Date(b.start).getTime();
		});
	});

	effectiveArnaldoSuggestions = computed(() => {
		const base = [...this.arnaldoSuggestions()];
		const weather = this.weatherData();
		const events = this.confirmedEvents();
		const farm = this.selectedFarm();

		if (weather && events.length > 0 && farm) {
			events.forEach((ev, idx) => {
				const evalRes = this.weatherImpactService.evaluateEventImpact(ev, weather);
				if (evalRes.status === 'attention' && evalRes.betterWindow) {
					const exists = base.some(s => s.title.includes(ev.title));
					if (!exists) {
						base.push({
							id: `weather-sug-${ev.id || idx}`,
							farm_id: farm.id || 'farm-1',
							title: `Sposta ${ev.title}`,
							description: `${evalRes.reason} Arnaldo suggerisce di anticipare o posticipare a ${evalRes.betterWindow.dateLabel}.`,
							type: ev.type,
							start: `${evalRes.betterWindow.date}T09:00:00.000Z`,
							end: `${evalRes.betterWindow.date}T11:00:00.000Z`,
							all_day: ev.all_day,
							source: 'arnaldo',
							status: 'suggested',
							suggestion_reason: evalRes.betterWindow.reason
						});
					}
				}
			});
		}

		return base;
	});

	activeAlerts = computed(() => {
		const list: DashboardAlert[] = [];
		const criticalCount = this.criticalPlantsCount();
		if (criticalCount > 0) {
			list.push({
				id: "alert-plants-critical",
				severity: "warning",
				title: `${criticalCount} Piant${criticalCount === 1 ? 'a richiede' : 'e richiedono'} attenzione`,
				message: "Alcune piante segnalano uno stato non ottimale. Ti consigliamo di ispezionarle dalla scheda pianta.",
				icon: "⚠️",
				actionUrl: "/land",
				actionLabel: "Vedi Piante"
			});
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const overdueCount = this.confirmedEvents().filter(e => new Date(e.start) < today).length;
		if (overdueCount > 0) {
			list.push({
				id: "alert-overdue-events",
				severity: "critical",
				title: `${overdueCount} Attività Scadut${overdueCount === 1 ? 'a' : 'e'}`,
				message: "Ci sono interventi in ritardo non ancora contrassegnati come completati.",
				icon: "⏰",
				actionUrl: "/calendar",
				actionLabel: "Apri Calendario"
			});
		}

		const w = this.weatherData();
		if (w?.current?.windSpeed && w.current.windSpeed > 20) {
			list.push({
				id: "alert-weather-wind",
				severity: "info",
				title: "Vento Forte in Campo",
				message: `Velocità del vento registrata a ${w.current.windSpeed} km/h. Si sconsiglia di effettuare trattamenti fogliari o nebulizzazioni.`,
				icon: "💨",
				actionUrl: "/meteo",
				actionLabel: "Dettaglio Meteo"
			});
		}

		if (w) {
			const upcoming = this.confirmedEvents();
			upcoming.forEach(ev => {
				const evalRes = this.weatherImpactService.evaluateEventImpact(ev, w);
				if (evalRes.status === 'attention') {
					list.push({
						id: `alert-weather-impact-${ev.id}`,
						severity: evalRes.severity === 'warning' ? 'warning' : 'info',
						title: `${evalRes.badgeLabel}: ${ev.title}`,
						message: `${evalRes.reason} ${evalRes.recommendation || ''}`,
						icon: evalRes.icon,
						actionUrl: '/calendar',
						actionLabel: 'Rivedi in Calendario'
					});
				}
			});
		}

		return list;
	});

	summaryText = computed(() => {
		const plantsCount = this.plants().length;
		const criticalCount = this.criticalPlantsCount();
		const eventsCount = this.upcomingAndOverdueEvents().length;

		const parts: string[] = [];

		if (plantsCount > 0) {
			parts.push(`${plantsCount} piante monitorate`);
		}
		if (criticalCount > 0) {
			parts.push(`${criticalCount} da controllare`);
		}
		if (eventsCount > 0) {
			parts.push(`${eventsCount} attività in programma`);
		}

		if (parts.length === 0) {
			return "Monitoraggio e pianificazione agronomica attiva per i tuoi terreni.";
		}

		return parts.join(" • ");
	});
}
