import { Component, OnInit, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LandService, Farm } from "../../core/services/land.service";
import { WeatherService, WeatherData } from "../../core/services/weather.service";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { FarmSummaryComponent } from "./components/farm-summary.component";
import { WeatherCardComponent } from "./components/weather-card.component";
import { CalendarStripComponent } from "./components/calendar-strip.component";
import { ArnaldoCardComponent } from "./components/arnaldo-card.component";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-dashboard",
	standalone: true,
	imports: [CommonModule, AppLayoutComponent, FarmSummaryComponent, WeatherCardComponent, CalendarStripComponent, ArnaldoCardComponent, CampCardComponent],
	template: `
		<app-layout>
			<div class="max-w-5xl mx-auto space-y-6 animate-fade-in">
				<!-- Header con Benvenuto -->
				<section class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
					<div>
						<h1 class="text-3xl md:text-4xl font-serif text-camp-earth mb-1">Bentornato in campagna</h1>
						<p class="text-camp-olive font-medium text-sm">Ecco la situazione aggiornata per i tuoi terreni.</p>
					</div>
					<div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-camp-olive bg-white px-4 py-2 rounded-full shadow-sm border border-camp-sand/40">
						<span class="w-2 h-2 bg-camp-success rounded-full animate-pulse"></span>
						Monitoraggio Attivo
					</div>
				</section>

				@if (isLoading()) {
					<!-- Loading State -->
					<div class="space-y-6">
						<div class="h-48 bg-camp-sand/20 animate-pulse rounded-camp"></div>
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
							<div class="lg:col-span-5 h-64 bg-camp-sand/20 animate-pulse rounded-camp"></div>
							<div class="lg:col-span-7 h-64 bg-camp-sand/20 animate-pulse rounded-camp"></div>
						</div>
						<div class="h-40 bg-camp-sand/20 animate-pulse rounded-camp"></div>
					</div>
				} @else if (farms().length > 0) {
					<!-- Main Dashboard Layout -->
					<div class="space-y-6">
						<!-- Riga 1: Arnaldo AI (Banner Intelligence) -->
						<app-arnaldo-card
							[weather]="weatherData()"
							[farm]="selectedFarm()"
							class="block w-full"
						/>

						<!-- Riga 2: Dati Core (Farm & Meteo) -->
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full">
							<div class="lg:col-span-5">
								<app-farm-summary [farm]="selectedFarm()!" />
							</div>
							<div class="lg:col-span-7">
								<app-weather-card [weather]="weatherData()" />
							</div>
						</div>

						<!-- Riga 3: Pianificazione (Calendario) -->
						<app-calendar-strip class="block w-full" />
					</div>
				} @else {
					<!-- Empty State -->
					<div class="max-w-2xl mx-auto py-12">
						<app-camp-card
							title="Nessun terreno registrato"
							subtitle="Benvenuto in campAIgn"
							icon="🚜"
							padding="large"
						>
							<div class="flex flex-col items-center text-center">
								<p class="text-camp-olive text-lg mb-10 max-w-md">
									Sembra che tu non abbia ancora configurato il tuo primo terreno. Aggiungilo ora per iniziare a monitorare le tue piante con l'aiuto di Arnaldo.
								</p>
								<button class="camp-btn-primary px-10 py-4 text-lg">
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
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										/>
									</svg>
									Aggiungi il tuo primo terreno
								</button>
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
	private weatherService = inject(WeatherService);

	farms = signal<Farm[]>([]);
	selectedFarm = signal<Farm | null>(null);
	weatherData = signal<WeatherData | null>(null);
	isLoading = signal(true);

	constructor() {
		// Carichiamo il meteo quando cambia la farm selezionata
		effect(
			() => {
				const farm = this.selectedFarm();
				if (farm && farm.latitude && farm.longitude) {
					this.loadWeather(farm.latitude, farm.longitude);
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
			console.error("Error loading dashboard data:", error);
		} finally {
			this.isLoading.set(false);
		}
	}

	private loadWeather(lat: number, lon: number) {
		this.weatherService.getWeather(lat, lon).subscribe({
			next: data => this.weatherData.set(data),
			error: err => console.error("Error fetching weather:", err)
		});
	}
}
