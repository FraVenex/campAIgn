import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";
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
			class="block h-full group"
		>
			<app-camp-card
				title="Meteo & Previsioni"
				subtitle="In Tempo Reale"
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
					<div class="flex flex-col items-center space-y-4 my-1.5">
						<div class="flex items-center gap-6">
							<span class="text-6xl drop-shadow-sm">{{ getWeatherIcon(weather()?.current?.weatherCode) }}</span>
							<div class="flex items-center gap-4">
								<span class="text-5xl font-serif text-camp-earth tracking-tighter">{{ weather()?.current?.temperature }}°</span>
								<div class="flex flex-col">
									<span class="text-sm font-bold text-camp-earth capitalize leading-none mb-1">{{ weather()?.current?.time | date: "EEEE, d MMM" }}</span>
									<span class="text-[10px] font-bold uppercase tracking-widest text-camp-olive/40 leading-none">Attualmente</span>
								</div>
							</div>
						</div>

						<div class="flex gap-8">
							<div class="flex flex-col items-center">
								<span class="text-[9px] uppercase tracking-[0.2em] text-camp-olive/40 font-bold mb-1.5">Umidità</span>
								<span class="text-sm font-bold text-camp-earth">{{ weather()?.current?.humidity }}%</span>
							</div>
							<div class="flex flex-col items-center border-x border-camp-sand/40 px-8">
								<span class="text-[9px] uppercase tracking-[0.2em] text-camp-olive/40 font-bold mb-1.5">Vento</span>
								<span class="text-sm font-bold text-camp-earth">{{ weather()?.current?.windSpeed }} <small class="text-[8px] opacity-40 uppercase">km/h</small></span>
							</div>
							<div class="flex flex-col items-center">
								<span class="text-[9px] uppercase tracking-[0.2em] text-camp-olive/40 font-bold mb-1.5">Pioggia</span>
								<span class="text-sm font-bold text-camp-earth">{{ weather()?.current?.precipitation }} <small class="text-[8px] opacity-40 uppercase">mm</small></span>
							</div>
						</div>
					</div>
				} @else {
					<div class="flex flex-col items-center py-12 animate-pulse">
						<div class="w-16 h-16 bg-camp-sand/40 rounded-full mb-4"></div>
						<div class="w-32 h-6 bg-camp-sand/40 rounded mb-8"></div>
						<div class="flex gap-12">
							<div class="w-12 h-16 bg-camp-sand/40 rounded"></div>
							<div class="w-12 h-16 bg-camp-sand/40 rounded"></div>
							<div class="w-12 h-16 bg-camp-sand/40 rounded"></div>
						</div>
					</div>
				}
			</app-camp-card>
		</a>
	`
})
export class WeatherCardComponent {
	weather = input<WeatherData | null>(null);

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
