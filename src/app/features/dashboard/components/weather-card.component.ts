import { CommonModule } from "@angular/common";
import { Component, input, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { WeatherData } from "../../../core/services/weather.service";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-weather-card",
	standalone: true,
	imports: [CommonModule, RouterLink, CampCardComponent],
	template: `
		<a
			routerLink="/meteo"
			class="block h-full w-full group"
		>
			<app-camp-card
				title="Meteo & Agrometeo"
				subtitle="Condizioni di Campo"
				[icon]="getWeatherIcon(weather()?.current?.weatherCode)"
			>
				<div header-action>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-camp-olive/30 group-hover:text-camp-sage transition-colors"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</div>

				@if (weather()) {
					<div class="flex flex-col space-y-4 my-auto">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span class="text-5xl drop-shadow-xs">{{ getWeatherIcon(weather()?.current?.weatherCode) }}</span>
								<div>
									<div class="text-4xl font-serif text-camp-earth tracking-tight">{{ weather()?.current?.temperature }}°C</div>
									<div class="text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mt-0.5">
										{{ weather()?.current?.time | date: "EEEE, d MMM" }}
									</div>
								</div>
							</div>

							<div
								[class]="
									'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ' +
									(workSuitability().isSuitable
										? 'bg-camp-success-light border-camp-success/20 text-camp-success'
										: 'bg-amber-100 border-amber-300 text-amber-900')
								"
							>
								<span
									[class]="
										'w-2 h-2 rounded-full ' +
										(workSuitability().isSuitable ? 'bg-camp-success' : 'bg-amber-600')
									"
								></span>
								{{ workSuitability().label }}
							</div>
						</div>

						<div class="grid grid-cols-3 gap-2 pt-3 border-t border-camp-sand/30">
							<div class="flex flex-col items-center p-2.5 rounded-xl bg-camp-cream/30">
								<span class="text-[9px] uppercase tracking-wider text-camp-olive/60 font-bold">Umidità</span>
								<span class="text-xs font-bold text-camp-earth mt-1">{{ weather()?.current?.humidity }}%</span>
							</div>
							<div class="flex flex-col items-center p-2.5 rounded-xl bg-camp-cream/30">
								<span class="text-[9px] uppercase tracking-wider text-camp-olive/60 font-bold">Vento</span>
								<span class="text-xs font-bold text-camp-earth mt-1">{{ weather()?.current?.windSpeed }} <small class="text-[8px] uppercase">km/h</small></span>
							</div>
							<div class="flex flex-col items-center p-2.5 rounded-xl bg-camp-cream/30">
								<span class="text-[9px] uppercase tracking-wider text-camp-olive/60 font-bold">Pioggia</span>
								<span class="text-xs font-bold text-camp-earth mt-1">{{ weather()?.current?.precipitation }} <small class="text-[8px] uppercase">mm</small></span>
							</div>
						</div>
					</div>
				} @else {
					<div class="flex flex-col items-center justify-center my-auto py-8 animate-pulse">
						<div class="w-12 h-12 bg-camp-sand/40 rounded-full mb-3"></div>
						<div class="w-32 h-5 bg-camp-sand/40 rounded mb-4"></div>
						<div class="w-full grid grid-cols-3 gap-2">
							<div class="h-10 bg-camp-sand/30 rounded-xl"></div>
							<div class="h-10 bg-camp-sand/30 rounded-xl"></div>
							<div class="h-10 bg-camp-sand/30 rounded-xl"></div>
						</div>
					</div>
				}
			</app-camp-card>
		</a>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex-direction: column;
				height: 100%;
				width: 100%;
			}
		`
	]
})
export class WeatherCardComponent {
	weather = input<WeatherData | null>(null);

	workSuitability = computed(() => {
		const w = this.weather();
		if (!w?.current) {
			return { isSuitable: true, label: "Meteo Stabile" };
		}

		const wind = w.current.windSpeed ?? 0;
		const precip = w.current.precipitation ?? 0;

		if (wind > 20) {
			return { isSuitable: false, label: "Vento Forte: No Trattamenti" };
		}
		if (precip > 2) {
			return { isSuitable: false, label: "Pioggia: Trattamenti Rinvii" };
		}

		return { isSuitable: true, label: "Ottimo per Trattamenti" };
	});

	getWeatherIcon(code: number | undefined): string {
		if (code === undefined) return "🌡️";
		if (code === 0) return "☀️";
		if (code <= 3) return "🌤️";
		if (code <= 48) return "🌫️";
		if (code <= 55) return "🌦️";
		if (code <= 65) return "🌧️";
		if (code <= 75) return "❄️";
		if (code <= 82) return "⛈️";
		return "🌩️";
	}
}
