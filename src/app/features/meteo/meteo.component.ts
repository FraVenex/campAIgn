import { Component, inject, signal, OnInit, computed, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WeatherService, WeatherData } from "../../core/services/weather.service";
import { LandService, Farm } from "../../core/services/land.service";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { RouterLink } from "@angular/router";
import { NgApexchartsModule } from "ng-apexcharts";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";

import {
	ApexAxisChartSeries,
	ApexChart,
	ApexXAxis,
	ApexDataLabels,
	ApexStroke,
	ApexYAxis,
	ApexTitleSubtitle,
	ApexLegend,
	ApexMarkers,
	ApexGrid,
	ApexFill,
	ApexTooltip,
	ApexTheme
} from "ng-apexcharts";

export type ChartOptions = {
	series: ApexAxisChartSeries;
	chart: ApexChart;
	xaxis: ApexXAxis;
	stroke: ApexStroke;
	dataLabels: ApexDataLabels;
	yaxis: ApexYAxis;
	title: ApexTitleSubtitle;
	labels: string[];
	legend: ApexLegend;
	markers: ApexMarkers;
	grid: ApexGrid;
	fill: ApexFill;
	tooltip: ApexTooltip;
	theme: ApexTheme;
};

@Component({
	selector: "app-meteo",
	standalone: true,
	imports: [CommonModule, RouterLink, AppLayoutComponent, NgApexchartsModule, CampCardComponent, CampDialogComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		<app-layout>
			<div class="max-w-7xl mx-auto space-y-8 animate-fade-in relative pb-10">
				<!-- Header Section -->
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
							<a
								routerLink="/dashboard"
								class="hover:text-camp-sage transition-colors"
								>Dashboard</a
							>
							<span>/</span>
							<span class="text-camp-sage">Meteo</span>
						</nav>
						<h1 class="text-4xl font-serif text-camp-earth tracking-tight">Analisi Climatica</h1>
					</div>

					<div class="flex items-center gap-4 px-5 py-3 bg-white rounded-camp shadow-camp-sm border border-camp-sand/40">
						<div class="w-10 h-10 rounded-camp bg-camp-sage/10 flex items-center justify-center text-camp-sage shadow-inner">
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
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-[10px] uppercase tracking-wider text-camp-olive font-bold opacity-60">Terreno Attivo</p>
							<p class="text-base font-serif text-camp-earth">{{ selectedFarm()?.name || "Seleziona terreno" }}</p>
						</div>
					</div>
				</div>

				@if (isLoading()) {
					<div class="space-y-8">
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
							<div class="lg:col-span-2 h-64 bg-camp-sand/10 animate-pulse rounded-camp"></div>
							<div class="h-64 bg-camp-sand/10 animate-pulse rounded-camp"></div>
						</div>
						<div class="h-80 bg-camp-sand/10 animate-pulse rounded-camp"></div>
					</div>
				} @else {
					@if (weatherData(); as data) {
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
							<!-- Real-time Card -->
							<div class="lg:col-span-12 flex">
								<app-camp-card
									variant="dark"
									subtitle="In Tempo Reale"
									[icon]="getWeatherIcon(data.current.weatherCode)"
									class="w-full"
								>
									<div class="flex items-start justify-between">
										<div>
											<h2 class="text-5xl font-light mt-2 flex items-baseline gap-2">{{ data.current.temperature.toFixed(1) }}<span class="text-2xl opacity-40">°C</span></h2>
											<p class="text-white/60 text-base mt-2 font-medium tracking-wide">
												{{ getConditionText(data.current.weatherCode) }}
											</p>
										</div>
										<div class="text-right">
											<p class="text-xl font-serif text-white/90">{{ data.daily.dates[1] | date: "EEEE d" }}</p>
											<p class="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1">{{ data.daily.dates[1] | date: "MMMM yyyy" }}</p>
										</div>
									</div>

									<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
										@for (
											stat of [
												{ label: "Vento", val: data.current.windSpeed, unit: "km/h" },
												{ label: "Umidità", val: data.current.humidity, unit: "%" },
												{ label: "Pioggia", val: data.current.precipitation, unit: "mm" },
												{ label: "Visibilità", val: "Ottima", unit: "" }
											];
											track stat.label
										) {
											<div class="p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
												<p class="text-white/40 text-[9px] uppercase font-bold tracking-[0.15em] mb-1">{{ stat.label }}</p>
												<p class="text-lg font-serif font-bold tracking-tight">
													{{ stat.val }} <small class="text-[10px] opacity-50 uppercase ml-0.5">{{ stat.unit }}</small>
												</p>
											</div>
										}
									</div>
								</app-camp-card>
							</div>

							<!-- Forecast Section -->
							<div class="lg:col-span-12">
								<app-camp-card
									title="Prossimi 5 Giorni"
									subtitle="Tendenza Settimanale"
									padding="small"
								>
									<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-camp-sand/20 -mx-6 -mb-6">
										@for (day of forecastDays(); track day.date) {
											<div class="p-8 flex flex-col items-center text-center hover:bg-camp-beige/30 transition-all group cursor-default">
												<p class="text-[10px] font-bold text-camp-olive uppercase tracking-[0.2em] mb-1.5 opacity-60">{{ day.date | date: "EEEE" }}</p>
												<p class="text-[10px] text-camp-olive font-bold mb-8 opacity-30">{{ day.date | date: "d MMMM" }}</p>
												<span class="text-5xl mb-8 transform group-hover:scale-110 transition-transform duration-300">{{ getWeatherIcon(day.code) }}</span>
												<div class="flex items-baseline gap-2 mb-10">
													<span class="text-3xl font-serif text-camp-earth leading-none">{{ day.maxTemp }}°</span>
													<span class="text-sm font-bold text-camp-olive/40 leading-none">{{ day.minTemp }}°</span>
												</div>
												<div class="w-full space-y-4">
													<div class="flex items-center justify-between text-[10px] text-camp-olive font-bold uppercase tracking-widest">
														<span class="opacity-40">Umidità</span>
														<span>{{ day.humidity }}%</span>
													</div>
													<div class="flex items-center justify-between text-[10px] text-camp-olive font-bold uppercase tracking-widest">
														<span class="opacity-40">Vento</span>
														<span>{{ day.wind }} km/h</span>
													</div>
													<div class="flex items-center justify-between text-[10px] text-camp-olive font-bold uppercase tracking-widest mt-2">
														<span class="opacity-40">Pioggia</span>
														<span [class.text-camp-sage]="day.precip > 0">{{ day.precip }} mm</span>
													</div>
													<div class="w-full h-1 bg-camp-sand/30 rounded-full overflow-hidden mt-1">
														<div
															class="h-full bg-camp-sage/40 transition-all duration-1000"
															[style.width.%]="Math.min(day.precip * 10, 100)"
														></div>
													</div>
												</div>
											</div>
										}
									</div>
								</app-camp-card>
							</div>

							<!-- Technical Indicators -->
							<div class="lg:col-span-4">
								<app-camp-card
									title="Indicatori Tecnici"
									subtitle="Dati Agronomici"
								>
									<div class="space-y-10 py-4">
										<div class="flex items-start gap-5">
											<div class="w-12 h-12 rounded-camp bg-camp-sage/10 flex items-center justify-center text-camp-sage shrink-0 border border-camp-sage/5 shadow-sm">
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
														d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
													/>
												</svg>
											</div>
											<div>
												<p class="text-[10px] uppercase tracking-wider text-camp-olive font-bold opacity-60 mb-1">Evapotraspirazione (ET0)</p>
												<p class="text-3xl font-serif text-camp-earth">{{ data.daily.et0?.[0] || "2.4" }} <small class="text-xs font-sans font-bold opacity-40 uppercase">mm/giorno</small></p>
												<p class="text-xs text-camp-olive/70 mt-2 font-medium leading-relaxed">Dispersione idrica del suolo stimata.</p>
											</div>
										</div>
										<div class="flex items-start gap-5">
											<div class="w-12 h-12 rounded-camp bg-camp-terracotta/10 flex items-center justify-center text-camp-terracotta shrink-0 border border-camp-terracotta/5 shadow-sm">
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
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													/>
												</svg>
											</div>
											<div>
												<p class="text-[10px] uppercase tracking-wider text-camp-olive font-bold opacity-60 mb-1">Temp. Radicale (6cm)</p>
												<p class="text-3xl font-serif text-camp-earth">{{ data.daily.soilTemp?.[0] }}<small class="text-xs font-sans font-bold opacity-40">°C</small></p>
												<p class="text-xs text-camp-olive/70 mt-2 font-medium leading-relaxed">Temperatura alla profondità delle radici.</p>
											</div>
										</div>
									</div>
								</app-camp-card>
							</div>

							<!-- Hourly Trend -->
							<div class="lg:col-span-8">
								<app-camp-card
									title="Andamento delle Ultime 24 Ore"
									subtitle="Analisi Oraria"
								>
									<div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
										@for (metric of sparklineData(); track metric.name) {
											<div
												(click)="openChart(metric.name)"
												class="flex flex-col cursor-pointer group"
											>
												<div class="flex items-center justify-between mb-4">
													<span class="text-[10px] font-bold uppercase tracking-widest text-camp-olive opacity-60 group-hover:text-camp-sage transition-colors">{{ getMetricLabel(metric.name) }}</span>
													<span class="text-sm font-serif font-bold text-camp-earth">{{ getMetricCurrentValue(metric.name) }}{{ getMetricUnit(metric.name) }}</span>
												</div>
												<div class="h-32 w-full relative bg-camp-cream/5 rounded-camp border border-camp-sand/10 overflow-hidden group-hover:border-camp-sage/30 transition-colors">
													<apx-chart
														[series]="metric.options.series"
														[chart]="metric.options.chart"
														[stroke]="metric.options.stroke"
														[fill]="metric.options.fill"
														[tooltip]="metric.options.tooltip"
														[theme]="metric.options.theme"
													></apx-chart>
												</div>
											</div>
										}
									</div>
								</app-camp-card>
							</div>
						</div>

						<!-- Metric Dialog -->
						@if (showDialog()) {
							<app-camp-dialog
								[title]="getMetricLabel(selectedMetric())"
								subtitle="Analisi Temporale Dettagliata"
								[icon]="selectedMetric() === 'temperature' ? '🌡️' : selectedMetric() === 'humidity' ? '💧' : '🌬️'"
								(close)="closeDialog()"
							>
								<div class="h-full w-full min-h-[400px]">
									<apx-chart
										class="h-full w-full"
										[series]="chartOptions().series"
										[chart]="chartOptions().chart"
										[xaxis]="chartOptions().xaxis"
										[yaxis]="chartOptions().yaxis"
										[stroke]="chartOptions().stroke"
										[fill]="chartOptions().fill"
										[grid]="chartOptions().grid"
										[markers]="chartOptions().markers"
										[tooltip]="chartOptions().tooltip"
										[dataLabels]="chartOptions().dataLabels"
										[theme]="chartOptions().theme"
									></apx-chart>
								</div>
							</app-camp-dialog>
						}
					}
				}
			</div>
		</app-layout>
	`,
	styles: [
		`
			:host {
				display: block;
			}
		`
	]
})
export class MeteoComponent implements OnInit {
	private weatherService = inject(WeatherService);
	private landService = inject(LandService);

	public readonly Math = Math;
	public readonly metrics = ["temperature", "humidity", "windSpeed"] as const;

	public weatherData = signal<WeatherData | null>(null);
	public selectedFarm = signal<Farm | null>(null);
	public isLoading = signal(true);
	public showDialog = signal(false);
	public selectedMetric = signal<"temperature" | "humidity" | "windSpeed">("temperature");

	forecastDays = computed(() => {
		const w = this.weatherData();
		if (!w) return [];
		return w.daily.dates.slice(1, 6).map((date, i) => {
			const idx = i + 1;
			const noonIndex = idx * 24 + 12; // Approssimazione di mezzogiorno
			const humidity = w.hourly.humidity[noonIndex] || 0;
			return {
				date: date,
				maxTemp: w.daily.maxTemps[idx],
				minTemp: w.daily.minTemps[idx],
				precip: w.daily.precipSums[idx],
				wind: w.daily.windSpeeds[idx],
				code: w.daily.weatherCodes[idx],
				humidity: humidity
			};
		});
	});

	public sparklineData = computed(() => {
		return this.metrics.map(m => ({
			name: m,
			options: this.getSparklineOptions(m)
		}));
	});

	public chartOptions = computed<any>(() => {
		const w = this.weatherData();
		const metric = this.selectedMetric();
		if (!w) return this.getDefaultChartOptions();

		const data = (w.hourly as any)[metric] || [];
		const timestamps = w.hourly.time || [];
		const color = this.getMetricColor(metric);

		const todayStart = new Date(timestamps[0]).getTime();
		const todayEnd = new Date(timestamps[24] || timestamps[timestamps.length - 1]).getTime();

		return {
			series: [
				{
					name: this.getMetricLabel(metric),
					data: data
				}
			],
			chart: {
				type: "area",
				height: "100%",
				width: "100%",
				fontFamily: "Outfit, sans-serif",
				toolbar: {
					show: true,
					tools: {
						download: false,
						selection: false,
						zoom: true,
						zoomin: true,
						zoomout: true,
						pan: true,
						reset: true
					},
					autoSelected: "pan"
				},
				animations: {
					enabled: true,
					easing: "easeinout",
					speed: 800
				},
				background: "transparent"
			},
			grid: {
				show: true,
				borderColor: "rgba(107, 112, 92, 0.1)",
				strokeDashArray: 4,
				padding: {
					top: 20,
					right: 20,
					bottom: 10,
					left: 20
				}
			},
			dataLabels: { enabled: false },
			stroke: {
				curve: "smooth",
				width: 3,
				colors: [color]
			},
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.45,
					opacityTo: 0.05,
					stops: [0, 90, 100],
					colorStops: [
						{ offset: 0, color: color, opacity: 0.4 },
						{ offset: 100, color: color, opacity: 0 }
					]
				}
			},
			xaxis: {
				type: "datetime",
				categories: timestamps,
				min: todayStart,
				max: todayEnd,
				tickAmount: 12,
				labels: {
					format: "HH:mm",
					style: {
						colors: "#6B705C",
						fontSize: "10px",
						fontWeight: 600
					},
					datetimeFormatter: {
						year: "yyyy",
						month: "MMM",
						day: "dd MMM",
						hour: "HH:mm"
					}
				},
				axisBorder: { show: false },
				axisTicks: { show: false },
				tooltip: { enabled: false }
			},
			yaxis: {
				labels: {
					style: {
						colors: "#6B705C",
						fontSize: "10px",
						fontWeight: 600
					},
					formatter: (val: number) => val.toFixed(1) + this.getMetricUnit(metric)
				}
			},
			markers: {
				size: 0,
				colors: [color],
				strokeColors: "#fff",
				strokeWidth: 2,
				hover: { size: 6 }
			},
			tooltip: {
				theme: "light",
				x: { format: "dd MMM yyyy, HH:mm" },
				y: {
					formatter: (val: number) => val + this.getMetricUnit(metric)
				},
				style: { fontSize: "12px" },
				marker: { show: true }
			},
			theme: { mode: "light" }
		};
	});

	private getDefaultChartOptions() {
		return {
			series: [],
			chart: { type: "area", height: "100%", width: "100%" },
			xaxis: { type: "datetime" },
			stroke: { curve: "smooth" },
			dataLabels: { enabled: false },
			tooltip: { enabled: true },
			yaxis: { labels: { formatter: (v: any) => v } },
			fill: { opacity: 0.5 },
			theme: { mode: "light" },
			markers: { size: 0 },
			grid: { show: true }
		};
	}

	public getSparklineOptions(metric: "temperature" | "humidity" | "windSpeed"): any {
		const w = this.weatherData();
		if (!w) return this.getDefaultChartOptions();

		const data = (w.hourly as any)[metric]?.slice(24, 48) || [];
		const color = this.getMetricColor(metric);

		return {
			series: [
				{
					name: this.getMetricLabel(metric),
					data: data
				}
			],
			chart: {
				type: "area",
				height: 120,
				sparkline: { enabled: true },
				animations: { enabled: false },
				background: "transparent"
			},
			stroke: {
				curve: "smooth",
				width: 2,
				colors: [color]
			},
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.4,
					opacityTo: 0,
					stops: [0, 100],
					colorStops: [
						{ offset: 0, color: color, opacity: 0.2 },
						{ offset: 100, color: color, opacity: 0 }
					]
				}
			},
			tooltip: { enabled: false },
			theme: { mode: "light" }
		};
	}

	constructor() {}

	async ngOnInit() {
		try {
			this.isLoading.set(true);
			const farms = await this.landService.getFarms();
			if (farms?.length) {
				this.selectedFarm.set(farms[0]);
				if (farms[0].latitude && farms[0].longitude) {
					this.weatherService.getWeather(farms[0].latitude, farms[0].longitude).subscribe({
						next: data => {
							this.weatherData.set(data);
							this.isLoading.set(false);
						},
						error: () => this.isLoading.set(false)
					});
				} else this.isLoading.set(false);
			} else this.isLoading.set(false);
		} catch {
			this.isLoading.set(false);
		}
	}

	public openChart(metric: "temperature" | "humidity" | "windSpeed") {
		this.selectedMetric.set(metric);
		this.showDialog.set(true);
	}

	public closeDialog() {
		this.showDialog.set(false);
	}

	public getSparklinePoints(metric: string): string {
		const w = this.weatherData();
		if (!w) return "";
		const data = (w.hourly as any)[metric]?.slice(24, 48) || [];
		if (!data.length) return "";
		const min = Math.min(...data),
			max = Math.max(...data),
			range = max - min || 1;
		return data.map((val: number, i: number) => `${(i / (data.length - 1)) * 100},${100 - ((val - min) / range) * 100}`).join(" ");
	}

	public getWeatherIcon(code?: number): string {
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

	public getConditionText(code?: number): string {
		if (code === undefined) return "N/D";
		if (code === 0) return "Cielo Sereno";
		if (code <= 3) return "Parzialmente Nuvoloso";
		if (code <= 48) return "Nebbia o Foschia";
		if (code <= 55) return "Pioviggine";
		if (code <= 65) return "Pioggia Moderata";
		if (code <= 75) return "Neve";
		if (code <= 82) return "Rovescio Temporalesco";
		return "Temporale Intenso";
	}

	public getMetricUnit(metric: string): string {
		return metric === "temperature" ? "°C" : metric === "humidity" ? "%" : " km/h";
	}

	public getMetricColor(m?: string): string {
		const metric = m || this.selectedMetric();
		return metric === "temperature" ? "#6B705C" : metric === "humidity" ? "#4A7A5B" : "#C9A96E";
	}

	public getMetricLabel(metric: string): string {
		return metric === "temperature" ? "Temperatura" : metric === "humidity" ? "Umidità" : "Velocità Vento";
	}

	public getMetricCurrentValue(metric: string): string | number {
		const current = this.weatherData()?.current;
		if (!current) return "--";
		if (metric === "temperature") return current.temperature;
		if (metric === "humidity") return current.humidity;
		if (metric === "windSpeed") return current.windSpeed;
		return "--";
	}

	public getMetricExtreme(metric: string) {
		const w = this.weatherData();
		if (!w) return { min: 0, max: 0, mid: 0 };
		const data = (w.hourly as any)[metric]?.slice(24, 48) || [];
		if (!data.length) return { min: 0, max: 0, mid: 0 };
		const min = Math.min(...data),
			max = Math.max(...data);
		return { min: Math.floor(min), max: Math.ceil(max), mid: Math.round((min + max) / 2) };
	}
}
