import { Component, computed, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TONE_CLASS, Tone } from "../../../core/constants/domain";
import { WeatherData } from "../../../core/services/weather.service";
import { AgroAlert, DaySnapshot, weatherCodeInfo, windDirectionLabel } from "../../../core/utils/agronomy";

export type WeatherState = "loading" | "ready" | "error" | "no-coords" | "no-farm";

interface Metric {
	label: string;
	value: string;
	hint?: string;
	tone?: "good" | "bad";
}

/** Meteo agronomico di oggi per la home del diario. */
@Component({
	selector: "app-journal-weather-card",
	standalone: true,
	imports: [RouterLink],
	template: `
		<section class="camp-card card-body h-full flex flex-col">
			<div class="section-head">
				<div>
					<p class="eyebrow">⛅ Meteo agronomico</p>
					<h2 class="section-title">Meteo di oggi</h2>
				</div>
				<a routerLink="/meteo" class="btn btn-ghost btn-sm">Dettagli →</a>
			</div>

			@switch (state()) {
				@case ("loading") {
					<div class="space-y-3">
						<div class="h-20 bg-camp-sand/30 animate-pulse rounded-camp"></div>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							@for (i of [1, 2, 3, 4, 5, 6]; track i) {
								<div class="h-14 bg-camp-sand/20 animate-pulse rounded-xl"></div>
							}
						</div>
					</div>
				}
				@case ("no-farm") {
					<div class="empty-state flex-1 justify-center">
						<p class="empty-state-icon">🗺️</p>
						<p class="text-muted">Registra il tuo terreno per vedere il meteo agronomico.</p>
						<a routerLink="/onboarding" class="btn btn-primary btn-sm mt-2">Inizia</a>
					</div>
				}
				@case ("no-coords") {
					<div class="empty-state flex-1 justify-center">
						<p class="empty-state-icon">📍</p>
						<p class="text-muted">Il terreno non ha coordinate: aggiungi latitudine e longitudine per ricevere le previsioni.</p>
					</div>
				}
				@case ("error") {
					<div class="empty-state flex-1 justify-center">
						<p class="empty-state-icon">🌫️</p>
						<p class="text-muted">Non è stato possibile caricare il meteo.</p>
						<button type="button" (click)="retry.emit()" class="btn btn-secondary btn-sm mt-2">Riprova</button>
					</div>
				}
				@default {
					@if (day(); as d) {
						<div class="flex items-center gap-4 mb-4">
							<span class="text-5xl leading-none">{{ info().icon }}</span>
							<div class="min-w-0">
								<p class="text-3xl font-serif text-camp-earth leading-tight">
									{{ round(d.tNow ?? d.tMax) }}°
									@if (d.apparent !== undefined) {
										<span class="text-muted font-sans">percepiti {{ round(d.apparent) }}°</span>
									}
								</p>
								<p class="text-sm text-camp-bark">{{ info().label }} · min {{ round(d.tMin) }}° / max {{ round(d.tMax) }}°</p>
							</div>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							@for (m of metrics(); track m.label) {
								<div class="bg-camp-cream/40 border border-camp-sand/40 rounded-xl px-3 py-2">
									<p class="kpi-label">{{ m.label }}</p>
									<p class="text-sm font-semibold" [class.text-camp-success]="m.tone === 'good'" [class.text-camp-error]="m.tone === 'bad'" [class.text-camp-earth]="!m.tone">{{ m.value }}</p>
									@if (m.hint) {
										<p class="kpi-hint leading-tight">{{ m.hint }}</p>
									}
								</div>
							}
						</div>

						@if (spray(); as s) {
							<div
								class="mt-4 rounded-xl border px-3 py-2.5 flex gap-2.5 items-start"
								[class]="alertClass(s.level)"
							>
								<span class="text-lg leading-none">{{ s.icon }}</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">{{ s.title }}</p>
									<p class="text-[11px] text-camp-bark leading-snug">{{ s.text }}</p>
								</div>
							</div>
						}

						@if (risks().length) {
							<ul class="mt-2 space-y-2">
								@for (r of risks(); track r.title) {
									<li class="rounded-xl border px-3 py-2 flex gap-2.5 items-start" [class]="alertClass(r.level)">
										<span class="text-lg leading-none">{{ r.icon }}</span>
										<div>
											<p class="text-xs font-bold text-camp-earth">{{ r.title }}</p>
											<p class="text-[11px] text-camp-bark leading-snug">{{ r.text }}</p>
										</div>
									</li>
								}
							</ul>
						}
					} @else {
						<p class="text-muted">Dati meteo di oggi non disponibili.</p>
					}
				}
			}
		</section>
	`
})
export class JournalWeatherCardComponent {
	readonly state = input<WeatherState>("loading");
	readonly weather = input<WeatherData | null>(null);
	readonly day = input<DaySnapshot | null>(null);
	readonly spray = input<AgroAlert | null>(null);
	readonly risks = input<AgroAlert[]>([]);
	readonly retry = output<void>();

	readonly info = computed(() => {
		const w = this.weather();
		return weatherCodeInfo(w?.current.weatherCode ?? this.day()?.code);
	});

	readonly metrics = computed<Metric[]>(() => {
		const d = this.day();
		if (!d) return [];
		const cur = this.weather()?.current;
		const fmt = (v: number | null | undefined, unit: string, digits = 1) => (v === null || v === undefined ? "—" : `${Number(v.toFixed(digits))} ${unit}`.trim());
		const time = (iso?: string) => (iso && iso.length >= 16 ? iso.slice(11, 16) : "—");
		const windNow = d.windNow ?? d.wind;
		return [
			{ label: "Umidità", value: fmt(d.humidityNow, "%", 0) },
			{ label: "Punto di rugiada", value: fmt(d.dewPoint, "°C") },
			{ label: "Vento", value: `${fmt(windNow, "km/h", 0)} ${windDirectionLabel(cur?.windDirection ?? d.windDir)}`, hint: `Raffiche fino a ${fmt(d.gusts, "km/h", 0)}` },
			{ label: "Pioggia", value: fmt(d.precip, "mm"), hint: `Probabilità ${d.precipProb}%` },
			{ label: "ET0", value: fmt(d.et0, "mm"), hint: "Evapotraspirazione" },
			{ label: "Bilancio idrico", value: `${d.waterBalance > 0 ? "+" : ""}${fmt(d.waterBalance, "mm")}`, hint: "Pioggia − ET0", tone: d.waterBalance < -3 ? "bad" : d.waterBalance >= 0 ? "good" : undefined },
			{ label: "Suolo (6 cm)", value: fmt(d.soilTemp, "°C") },
			{ label: "Umidità suolo", value: fmt(d.soilMoisture, "%", 0), tone: d.soilMoisture !== null && d.soilMoisture < 15 ? "bad" : undefined },
			{ label: "VPD max", value: fmt(d.vpdMax, "kPa"), tone: d.vpdMax !== null && d.vpdMax >= 2.5 ? "bad" : undefined },
			{ label: "Indice UV", value: fmt(d.uv, "", 0), tone: d.uv >= 8 ? "bad" : undefined },
			{ label: "Soleggiamento", value: fmt(d.sunshine, "h") },
			{ label: "Alba / tramonto", value: `${time(d.sunrise)} · ${time(d.sunset)}` },
			{ label: "Gradi giorno", value: fmt(d.gdd, "GDD"), hint: "Base 10 °C" },
			{ label: "Nuvolosità", value: fmt(cur?.cloudCover, "%", 0) },
			{ label: "Pressione", value: fmt(cur?.pressure, "hPa", 0) }
		];
	});

	/** Riquadro di avviso con i colori dei toni condivisi (TONE_CLASS). */
	alertClass(level: AgroAlert["level"]): string {
		const tone: Tone = level === "ok" ? "success" : level === "danger" ? "danger" : level === "warning" ? "warning" : "info";
		return TONE_CLASS[tone];
	}

	round(v: number): number {
		return Math.round(v);
	}
}
