import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { ChipComponent } from "../../shared/components/chip/chip.component";
import { MeteoChartComponent } from "./meteo-chart.component";
import { HourlySeries, precipitationChart, soilChart, temperatureChart, vpdDewChart, waterBalanceChart, windChart } from "./meteo-charts";
import { FarmStore } from "../../core/services/farm-store.service";
import { WeatherData, WeatherService } from "../../core/services/weather.service";
import { AgroAlert, DaySnapshot, agronomicRisks, daySnapshot, oliveSeasonPhase, sprayWindow, weatherCodeInfo, windDirectionLabel } from "../../core/utils/agronomy";
import { TONE_CLASS, Tone } from "../../core/constants/domain";

type LoadState = "loading" | "ready" | "error" | "no-farm" | "no-coords";

interface DayView {
	offset: number;
	snap: DaySnapshot;
	label: string;
	dateLabel: string;
	info: { label: string; icon: string };
	spray: AgroAlert;
}

interface AgroMetric {
	icon: string;
	title: string;
	value: string;
	detail: string;
	explain: string;
	tone: Tone;
}

const FORECAST_DAYS = 5;

const ALERT_TONE: Record<AgroAlert["level"], Tone> = { ok: "success", info: "info", warning: "warning", danger: "danger" };
const SPRAY_SHORT: Record<AgroAlert["level"], string> = { ok: "Trattamenti ok", info: "Solo al mattino", warning: "Sconsigliati", danger: "Sconsigliati" };

@Component({
	selector: "app-meteo",
	standalone: true,
	imports: [RouterLink, PageHeaderComponent, ChipComponent, MeteoChartComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Meteo" title="Meteo agronomico" [description]="headerDescription()">
				<ng-container actions>
					@if (state() === "ready") {
						<button type="button" (click)="load(true)" [disabled]="refreshing()" class="btn btn-secondary">
							{{ refreshing() ? "Aggiornamento…" : "Aggiorna" }}
						</button>
					}
				</ng-container>
			</app-page-header>

			@switch (state()) {
				@case ("loading") {
					<div class="space-y-6">
						<div class="h-48 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
						<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
							@for (i of [1, 2, 3, 4, 5]; track i) {
								<div class="h-56 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
							}
						</div>
					</div>
				}
				@case ("no-farm") {
					<div class="camp-card empty-state">
						<span class="empty-state-icon">🗺️</span>
						<p class="text-muted">Registra il tuo terreno per vedere le previsioni meteo della tua zona.</p>
						<a routerLink="/onboarding" class="btn btn-primary btn-sm mt-2">Inizia onboarding</a>
					</div>
				}
				@case ("no-coords") {
					<div class="camp-card empty-state">
						<span class="empty-state-icon">📍</span>
						<p class="text-camp-earth font-semibold">Coordinate del terreno mancanti</p>
						<p class="text-muted max-w-md">Per calcolare le previsioni serve la posizione di «{{ farmStore.farm()?.name }}». Aggiungi latitudine e longitudine del terreno per attivare il meteo agronomico.</p>
					</div>
				}
				@case ("error") {
					<div class="camp-card empty-state">
						<span class="empty-state-icon">⛈️</span>
						<p class="text-camp-earth font-semibold">Previsioni non disponibili</p>
						<p class="text-muted">{{ errorMessage() }}</p>
						<button type="button" (click)="load(true)" class="btn btn-primary btn-sm mt-2">Riprova</button>
					</div>
				}
				@case ("ready") {
					@if (today(); as t) {
						<!-- Oggi -->
						<section class="camp-card card-body bg-gradient-to-br from-white to-camp-cream/50">
							<div class="flex flex-col lg:flex-row gap-6">
								<div class="flex items-center gap-4 sm:gap-5 lg:w-80 shrink-0">
									<span class="text-6xl sm:text-7xl leading-none">{{ todayInfo().icon }}</span>
									<div>
										<p class="eyebrow">Oggi · {{ todayLabel() }}</p>
										<p class="text-5xl font-serif text-camp-earth leading-tight">{{ round(t.tNow ?? t.tMax) }}°</p>
										<p class="text-sm font-semibold text-camp-bark">{{ todayInfo().label }}</p>
										<p class="text-xs text-camp-olive">Min {{ round(t.tMin) }}° · Max {{ round(t.tMax) }}°@if (t.apparent !== undefined) { · percepita {{ round(t.apparent) }}°}</p>
									</div>
								</div>
								<div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
									<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3">
										<p class="kpi-label">💧 Umidità</p>
										<p class="kpi-value text-xl">{{ t.humidityNow ?? "—" }}%</p>
										<p class="kpi-hint">Rugiada {{ t.dewPoint !== null ? round(t.dewPoint) + "°" : "—" }}</p>
									</div>
									<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3">
										<p class="kpi-label">💨 Vento</p>
										<p class="kpi-value text-xl">{{ round(t.windNow ?? t.wind) }} <span class="text-xs">km/h</span></p>
										<p class="kpi-hint">{{ windDir(weather()!.current.windDirection ?? t.windDir) }} · raffiche {{ round(weather()!.current.windGusts ?? t.gusts) }}</p>
									</div>
									<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3">
										<p class="kpi-label">🌧️ Pioggia</p>
										<p class="kpi-value text-xl">{{ num(t.precip) }} <span class="text-xs">mm</span></p>
										<p class="kpi-hint">Probabilità {{ t.precipProb }}%</p>
									</div>
									<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3">
										<p class="kpi-label">🌅 Sole</p>
										<p class="kpi-value text-xl">{{ time(t.sunrise) }} <span class="text-xs">→</span> {{ time(t.sunset) }}</p>
										<p class="kpi-hint">{{ num(t.sunshine) }} h di sole · UV {{ num(t.uv) }}</p>
									</div>
									<div class="col-span-2 sm:col-span-4 rounded-xl border px-3 py-2.5 flex items-start gap-2" [class]="toneClass(sprayTone(todaySpray().level))">
										<span class="text-lg leading-none">{{ todaySpray().icon }}</span>
										<p class="text-xs leading-snug"><strong>{{ todaySpray().title }}.</strong> {{ todaySpray().text }}</p>
									</div>
								</div>
							</div>
						</section>

						<!-- Previsioni 5 giorni -->
						<section>
							<div class="section-head">
								<div>
									<p class="eyebrow">Previsioni</p>
									<h2 class="section-title">Prossimi {{ forecast().length }} giorni</h2>
								</div>
							</div>
							<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
								@for (d of forecast(); track d.snap.date) {
									<article class="camp-card p-4 flex flex-col">
										<div class="flex items-start justify-between gap-2">
											<div>
												<p class="text-sm font-bold text-camp-earth capitalize">{{ d.label }}</p>
												<p class="text-xs text-camp-olive">{{ d.dateLabel }}</p>
											</div>
											<span class="text-3xl leading-none" [title]="d.info.label">{{ d.info.icon }}</span>
										</div>
										<p class="text-xs text-camp-bark mt-1">{{ d.info.label }}</p>
										<p class="mt-2 text-lg font-serif text-camp-earth"><span class="text-camp-terracotta">{{ round(d.snap.tMax) }}°</span> <span class="text-camp-olive">/</span> <span class="text-camp-sage">{{ round(d.snap.tMin) }}°</span></p>
										<dl class="mt-2 space-y-1 text-xs text-camp-bark flex-1">
											<div class="flex justify-between gap-2"><dt>🌧️ Pioggia</dt><dd class="font-semibold text-right">{{ num(d.snap.precip) }} mm · {{ d.snap.precipProb }}%</dd></div>
											<div class="flex justify-between gap-2"><dt>💨 Vento</dt><dd class="font-semibold text-right">{{ round(d.snap.wind) }} / {{ round(d.snap.gusts) }} km/h</dd></div>
											<div class="flex justify-between gap-2"><dt>🧭 Direzione</dt><dd class="font-semibold text-right">{{ windDir(d.snap.windDir) }}</dd></div>
											<div class="flex justify-between gap-2"><dt>🌱 ET0</dt><dd class="font-semibold text-right">{{ num(d.snap.et0) }} mm</dd></div>
										</dl>
										<div class="mt-3" [title]="d.spray.title + ': ' + d.spray.text">
											<app-chip [label]="sprayShort(d.spray.level)" [tone]="sprayTone(d.spray.level)" [icon]="d.spray.icon" />
										</div>
									</article>
								}
							</div>
						</section>

						<!-- Grafici -->
						<section>
							<div class="section-head">
								<div>
									<p class="eyebrow">Da oggi ai prossimi {{ forecast().length }} giorni</p>
									<h2 class="section-title">Andamento</h2>
								</div>
							</div>
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
								<app-meteo-chart title="Temperature minime e massime" subtitle="°C giornalieri" hint="Le minime vicine a 0 °C indicano rischio gelate; massime oltre 35 °C causano stress da calore." [options]="charts().temperature" />
								<app-meteo-chart title="Precipitazioni" subtitle="Pioggia prevista (mm) e probabilità (%)" hint="Con probabilità superiore al 60% o più di 2 mm di pioggia i trattamenti fogliari rischiano il dilavamento." [options]="charts().precipitation" />
								<app-meteo-chart title="Vento e raffiche" subtitle="Velocità massima giornaliera (km/h)" hint="Oltre 20 km/h di vento (o raffiche oltre 35 km/h) la deriva dei prodotti irrorati è eccessiva." [options]="charts().wind" />
								<app-meteo-chart title="Bilancio idrico" subtitle="Pioggia contro evapotraspirazione (ET0), mm al giorno" hint="Bilancio = pioggia − ET0. Valori negativi indicano che il terreno perde più acqua di quella che riceve." [options]="charts().water" />
								<app-meteo-chart title="Suolo: temperatura e umidità" subtitle="Valori orari a 6 cm (temperatura) e 3-9 cm (umidità volumetrica)" hint="Il suolo sotto i 10-12 °C rallenta l'assorbimento radicale; l'umidità volumetrica indica quanta acqua è disponibile nello strato superficiale." [options]="charts().soil" />
								<app-meteo-chart title="VPD e punto di rugiada" subtitle="Deficit di pressione di vapore (kPa) e temperatura dell'aria vs rugiada (°C)" hint="Quando la temperatura dell'aria si avvicina al punto di rugiada le foglie restano bagnate: favorisce le malattie fungine. Un VPD alto indica aria secca e forte traspirazione." [options]="charts().vpd" />
							</div>
						</section>

						<!-- Grandezze agronomiche -->
						<section>
							<div class="section-head">
								<div>
									<p class="eyebrow">Gli indicatori che un agronomo guarda ogni giorno</p>
									<h2 class="section-title">Grandezze agronomiche</h2>
								</div>
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
								@for (m of metrics(); track m.title) {
									<div class="kpi flex flex-col">
										<div class="flex items-center justify-between gap-2">
											<p class="kpi-label">{{ m.icon }} {{ m.title }}</p>
											<span class="w-5 h-5 shrink-0 rounded-full bg-camp-cream text-camp-olive text-[10px] font-bold flex items-center justify-center cursor-help" [title]="m.explain" [attr.aria-label]="m.explain">?</span>
										</div>
										<p class="kpi-value">{{ m.value }}</p>
										<p class="text-xs mt-1 inline-flex self-start px-2 py-0.5 rounded-full border font-semibold" [class]="toneClass(m.tone)">{{ m.detail }}</p>
										<p class="kpi-hint mt-2 leading-snug">{{ m.explain }}</p>
									</div>
								}
							</div>
						</section>

						<!-- Rischi e fase stagionale -->
						<div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
							<section class="camp-card card-body lg:col-span-3">
								<div class="section-head">
									<div>
										<p class="eyebrow">Olivo · oggi e prossimi giorni</p>
										<h2 class="section-title">Rischi agronomici</h2>
									</div>
								</div>
								@if (risks().length) {
									<ul class="space-y-2">
										@for (r of risks(); track r.alert.title) {
											<li class="rounded-xl border px-3 py-2.5 flex items-start gap-3" [class]="toneClass(alertTone(r.alert.level))">
												<span class="text-xl leading-none mt-0.5">{{ r.alert.icon }}</span>
												<div class="min-w-0">
													<p class="text-sm font-bold">{{ r.alert.title }} <span class="font-normal text-xs opacity-80">· {{ r.days.join(", ") }}</span></p>
													<p class="text-xs leading-snug">{{ r.alert.text }}</p>
												</div>
											</li>
										}
									</ul>
								} @else {
									<div class="rounded-xl border px-4 py-3 flex items-center gap-3" [class]="toneClass('success')">
										<span class="text-xl">✅</span>
										<p class="text-sm">Nessun rischio rilevante nei prossimi giorni.</p>
									</div>
								}
							</section>
							<section class="camp-card card-body lg:col-span-2">
								<p class="eyebrow">🫒 Fase stagionale dell'olivo</p>
								<h2 class="section-title mt-1">{{ season().phase }}</h2>
								<p class="text-sm text-camp-bark mt-1">{{ season().description }}</p>
								<p class="eyebrow mt-4 mb-1.5">Lavori del periodo</p>
								<ul class="space-y-1.5">
									@for (task of season().tasks; track task) {
										<li class="text-sm text-camp-earth flex items-start gap-2"><span class="text-camp-sage">•</span>{{ task }}</li>
									}
								</ul>
							</section>
						</div>

						<p class="text-xs text-camp-olive text-center">Dati meteo: Open-Meteo · aggiornati {{ updatedAt() }}</p>
					}
				}
			}
		</div>
	`
})
export class MeteoComponent implements OnInit {
	readonly farmStore = inject(FarmStore);
	private weatherService = inject(WeatherService);

	readonly state = signal<LoadState>("loading");
	readonly refreshing = signal(false);
	readonly errorMessage = signal("");
	readonly weather = signal<WeatherData | null>(null);
	readonly month = new Date().getMonth() + 1;

	readonly headerDescription = computed(() => {
		const farm = this.farmStore.farm();
		return farm?.name ? `Previsioni a 5 giorni e indicatori agronomici per «${farm.name}».` : "Previsioni a 5 giorni e indicatori agronomici per il tuo terreno.";
	});

	readonly today = computed(() => {
		const w = this.weather();
		return w ? daySnapshot(w, 0) : null;
	});
	readonly todayInfo = computed(() => weatherCodeInfo(this.weather()?.current.weatherCode ?? this.today()?.code));
	readonly todayLabel = computed(() => (this.today() ? new Date(this.today()!.date + "T12:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : ""));
	readonly todaySpray = computed(() => sprayWindow(this.today()!));

	/** Oggi + prossimi 5 giorni (finestra usata dai grafici). */
	readonly windowDays = computed<DayView[]>(() => {
		const w = this.weather();
		if (!w) return [];
		const out: DayView[] = [];
		for (let offset = 0; offset <= FORECAST_DAYS; offset++) {
			const snap = daySnapshot(w, offset);
			if (!snap) continue;
			const date = new Date(snap.date + "T12:00");
			out.push({
				offset,
				snap,
				label: offset === 0 ? "Oggi" : offset === 1 ? "Domani" : date.toLocaleDateString("it-IT", { weekday: "long" }),
				dateLabel: date.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
				info: weatherCodeInfo(snap.code),
				spray: sprayWindow(snap)
			});
		}
		return out;
	});

	readonly forecast = computed(() => this.windowDays().filter(d => d.offset >= 1));

	readonly hourly = computed<HourlySeries>(() => {
		const w = this.weather();
		const empty: HourlySeries = { ts: [], dates: [], temperature: [], soilTemp: [], soilMoisture: [], vpd: [], dewPoint: [] };
		if (!w) return empty;
		const dates = new Set(this.windowDays().map(d => d.snap.date));
		const h = w.hourly;
		h.time.forEach((t, i) => {
			if (!dates.has(t.slice(0, 10))) return;
			empty.ts.push(new Date(t).getTime());
			empty.dates.push(t.slice(0, 10));
			empty.temperature.push(h.temperature?.[i] ?? null);
			empty.soilTemp.push(h.soilTemp?.[i] ?? null);
			empty.soilMoisture.push(typeof h.soilMoisture?.[i] === "number" ? Math.round(h.soilMoisture[i] * 1000) / 10 : null);
			empty.vpd.push(typeof h.vpd?.[i] === "number" ? Math.round(h.vpd[i] * 100) / 100 : null);
			empty.dewPoint.push(h.dewPoint?.[i] ?? null);
		});
		return empty;
	});

	readonly charts = computed(() => {
		const days = this.windowDays();
		const snaps = days.map(d => d.snap);
		const labels = days.map(d => (d.offset <= 1 ? d.label : `${d.label.slice(0, 3)} ${d.dateLabel.split(" ")[0]}`));
		const hourly = this.hourly();
		return {
			temperature: temperatureChart(snaps, labels),
			precipitation: precipitationChart(snaps, labels),
			wind: windChart(snaps, labels),
			water: waterBalanceChart(snaps, labels),
			soil: soilChart(hourly),
			vpd: vpdDewChart(hourly)
		};
	});

	readonly risks = computed(() => {
		const grouped = new Map<string, { alert: AgroAlert; days: string[] }>();
		for (const d of this.windowDays()) {
			for (const alert of agronomicRisks(d.snap, this.month)) {
				const label = d.offset <= 1 ? d.label.toLowerCase() : d.label.slice(0, 3) + " " + d.dateLabel.split(" ")[0];
				const hit = grouped.get(alert.title);
				if (hit) hit.days.push(label);
				else grouped.set(alert.title, { alert, days: [label] });
			}
		}
		const order: Record<AgroAlert["level"], number> = { danger: 0, warning: 1, info: 2, ok: 3 };
		return [...grouped.values()].sort((a, b) => order[a.alert.level] - order[b.alert.level]);
	});

	readonly season = computed(() => oliveSeasonPhase(this.month));

	readonly metrics = computed<AgroMetric[]>(() => {
		const t = this.today();
		const fc = this.forecast().map(d => d.snap);
		if (!t) return [];
		const sumOf = (fn: (d: DaySnapshot) => number) => fc.reduce((s, d) => s + (fn(d) || 0), 0);
		const et0Sum = sumOf(d => d.et0);
		const rainSum = sumOf(d => d.precip);
		const balance = rainSum - et0Sum;
		const gddSum = sumOf(d => d.gdd);
		const sunSum = sumOf(d => d.sunshine);
		const h = this.hourly();
		const fcDates = new Set(fc.map(d => d.date));
		let wetHours = 0;
		h.ts.forEach((_ts, i) => {
			const temp = h.temperature[i];
			const dew = h.dewPoint[i];
			if (fcDates.has(h.dates[i]) && temp !== null && dew !== null && temp - dew <= 2) wetHours++;
		});
		const dewSpread = t.dewPoint !== null && t.tNow !== undefined ? t.tNow - t.dewPoint : null;
		const uvInfo = uvLevel(t.uv);
		return [
			{
				icon: "🌱",
				title: "Evapotraspirazione (ET0)",
				value: `${this.num(t.et0)} mm`,
				detail: `${this.num(et0Sum)} mm nei prossimi ${fc.length} giorni`,
				explain: "Acqua persa in un giorno da un prato di riferimento per evaporazione e traspirazione (FAO-56). È la base per stimare il fabbisogno irriguo.",
				tone: t.et0 >= 5 ? "warning" : "neutral"
			},
			{
				icon: "💧",
				title: "Bilancio idrico",
				value: `${balance > 0 ? "+" : ""}${this.num(balance)} mm`,
				detail: balance >= 0 ? "Pioggia sufficiente" : balance > -10 ? "Leggero deficit" : "Deficit marcato: valuta l'irrigazione",
				explain: `Pioggia prevista (${this.num(rainSum)} mm) meno ET0 (${this.num(et0Sum)} mm) sui prossimi ${fc.length} giorni. Negativo = il terreno si sta asciugando.`,
				tone: balance >= 0 ? "success" : balance > -10 ? "warning" : "danger"
			},
			{
				icon: "🌡️",
				title: "Gradi giorno (base 10)",
				value: `${this.num(gddSum)} GDD`,
				detail: `Oggi ${this.num(t.gdd)} GDD`,
				explain: "Somma del calore utile alla crescita: (T max + T min)/2 − 10 °C per ogni giorno, cumulata sui prossimi giorni. Guida lo sviluppo fenologico e i cicli degli insetti.",
				tone: gddSum > 0 ? "accent" : "neutral"
			},
			{
				icon: "🌬️",
				title: "Deficit di pressione (VPD)",
				value: t.vpdMax !== null ? `${this.num(t.vpdMax)} kPa` : "—",
				detail: t.vpdMax === null ? "Dato non disponibile" : t.vpdMax < 0.4 ? "Aria umida" : t.vpdMax <= 1.6 ? "Ottimale" : t.vpdMax < 2.5 ? "Aria secca" : "Molto secca: stress",
				explain: "Quanto l'aria 'tira' acqua dalle foglie. Tra 0,4 e 1,6 kPa la pianta traspira bene; valori alti chiudono gli stomi, valori bassi favoriscono i funghi.",
				tone: t.vpdMax === null ? "neutral" : t.vpdMax < 0.4 ? "info" : t.vpdMax <= 1.6 ? "success" : t.vpdMax < 2.5 ? "warning" : "danger"
			},
			{
				icon: "🌫️",
				title: "Punto di rugiada",
				value: t.dewPoint !== null ? `${this.num(t.dewPoint)} °C` : "—",
				detail: wetHours ? `${wetHours} ore a rischio bagnatura fogliare` : "Nessuna bagnatura prevista",
				explain: `Temperatura a cui l'umidità condensa sulle foglie${dewSpread !== null ? ` (ora ${this.num(dewSpread)} °C sotto l'aria)` : ""}. Se l'aria scende entro 2 °C dal punto di rugiada le foglie si bagnano: rischio occhio di pavone e altre malattie fungine.`,
				tone: wetHours >= 12 ? "danger" : wetHours > 0 ? "warning" : "success"
			},
			{
				icon: "🟫",
				title: "Suolo",
				value: `${this.num(t.soilTemp)} °C${t.soilMoisture !== null ? " · " + t.soilMoisture + "%" : ""}`,
				detail: t.soilMoisture === null ? "Umidità non disponibile" : t.soilMoisture < 15 ? "Terreno secco" : t.soilMoisture <= 35 ? "Umidità adeguata" : "Terreno saturo",
				explain: "Temperatura media a 6 cm e umidità volumetrica tra 3 e 9 cm. Sotto i 10-12 °C l'attività radicale rallenta; un terreno saturo non va lavorato né calpestato coi mezzi.",
				tone: t.soilMoisture === null ? "neutral" : t.soilMoisture < 15 ? "warning" : t.soilMoisture <= 35 ? "success" : "info"
			},
			{
				icon: "🕶️",
				title: "Indice UV",
				value: this.num(t.uv),
				detail: uvInfo.label,
				explain: "Intensità della radiazione ultravioletta massima del giorno. Con UV alto lavora nelle ore fresche e proteggiti; evita trattamenti fotosensibili nelle ore centrali.",
				tone: uvInfo.tone
			},
			{
				icon: "☀️",
				title: "Ore di sole",
				value: `${this.num(t.sunshine)} h`,
				detail: `${this.num(sunSum)} h nei prossimi ${fc.length} giorni`,
				explain: "Ore di insolazione effettiva. La luce guida fotosintesi e maturazione delle drupe; in autunno favorisce l'accumulo di olio.",
				tone: "accent"
			}
		];
	});

	readonly updatedAt = computed(() => {
		const t = this.weather()?.current.time;
		return t ? new Date(t).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
	});

	ngOnInit() {
		this.load();
	}

	async load(force = false) {
		if (force && this.state() === "ready") this.refreshing.set(true);
		else this.state.set("loading");
		try {
			await this.farmStore.ensureLoaded();
			const farm = this.farmStore.farm();
			if (!farm) {
				if (this.farmStore.error()) {
					this.errorMessage.set(this.farmStore.error()!);
					this.state.set("error");
				} else {
					this.state.set("no-farm");
				}
				return;
			}
			if (farm.latitude === null || farm.latitude === undefined || farm.longitude === null || farm.longitude === undefined) {
				this.state.set("no-coords");
				return;
			}
			const w = await this.weatherService.getWeatherCached(farm.latitude, farm.longitude, force);
			this.weather.set(w);
			this.state.set("ready");
		} catch (err: any) {
			console.error("[Meteo]", err);
			this.errorMessage.set("Il servizio meteo non risponde. Controlla la connessione e riprova tra qualche minuto.");
			if (!this.weather()) this.state.set("error");
		} finally {
			this.refreshing.set(false);
		}
	}

	sprayShort = (level: AgroAlert["level"]) => SPRAY_SHORT[level];
	sprayTone = (level: AgroAlert["level"]) => ALERT_TONE[level];
	alertTone = (level: AgroAlert["level"]) => ALERT_TONE[level];
	toneClass = (tone: Tone) => TONE_CLASS[tone];
	windDir = (deg?: number) => windDirectionLabel(deg);
	round = (v: number | null | undefined) => (v === null || v === undefined || isNaN(v) ? "—" : Math.round(v));
	num = (v: number | null | undefined, digits = 1) => (v === null || v === undefined || isNaN(v) ? "—" : (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString("it-IT"));
	time = (iso?: string) => (iso ? iso.slice(11, 16) : "—");
}

function uvLevel(uv: number): { label: string; tone: Tone } {
	if (uv < 3) return { label: "Basso", tone: "success" };
	if (uv < 6) return { label: "Moderato", tone: "info" };
	if (uv < 8) return { label: "Alto", tone: "warning" };
	if (uv < 11) return { label: "Molto alto", tone: "danger" };
	return { label: "Estremo", tone: "danger" };
}
