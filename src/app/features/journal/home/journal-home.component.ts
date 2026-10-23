import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { Note, NotesService } from "../../../core/services/notes.service";
import { WeatherData, WeatherService } from "../../../core/services/weather.service";
import { AuthService } from "../../../core/services/auth.service";
import { JOURNAL_TABS } from "../../../core/constants/navigation";
import { NOTE_COLOR_CLASS, TONE_CLASS, formatDateIt, toLocalDateKey } from "../../../core/constants/domain";
import { agronomicRisks, daySnapshot, oliveSeasonPhase, sprayWindow } from "../../../core/utils/agronomy";
import { buildDailyBriefing } from "./daily-briefing";
import { JournalWeatherCardComponent, WeatherState } from "./journal-weather-card.component";
import { JournalTodayActivitiesComponent } from "./journal-today-activities.component";

@Component({
	selector: "app-journal-home",
	standalone: true,
	imports: [RouterLink, PageHeaderComponent, JournalWeatherCardComponent, JournalTodayActivitiesComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Diario del contadino" title="Il tuo diario" description="Il punto della giornata, il meteo agronomico e le cose da fare nel tuo oliveto." [tabs]="tabs" />

			<!-- Il punto del giorno -->
			<section class="camp-card card-body bg-gradient-to-br from-camp-cream via-camp-beige to-camp-beige">
				<div class="mb-5 min-w-0">
					<p class="eyebrow mb-1">☀️ Il punto del giorno</p>
					<h2 class="text-2xl sm:text-3xl font-serif text-camp-earth tracking-tight">{{ briefing().greeting }}</h2>
					<p class="text-sm text-camp-bark mt-1 first-letter:uppercase">{{ briefing().summary }}</p>
					<p class="text-xs text-camp-olive mt-2">
						🌿 <strong class="text-camp-bark">{{ season.phase }}</strong> — {{ season.description }}
					</p>
				</div>

				@if (loadingBriefing()) {
					<div class="grid sm:grid-cols-2 gap-3">
						@for (i of [1, 2, 3, 4]; track i) {
							<div class="h-20 bg-white/60 animate-pulse rounded-xl"></div>
						}
					</div>
				} @else {
					<ul class="grid sm:grid-cols-2 gap-3">
						@for (item of briefing().items; track item.title; let first = $first) {
							<li class="bg-white/80 border rounded-xl p-3.5 flex gap-3 items-start" [class]="first ? 'sm:col-span-2 border-camp-sage/30 shadow-camp-sm' : 'border-camp-sand/50'">
								<span class="w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center text-lg" [class]="toneClass[item.tone]">{{ item.icon }}</span>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-semibold text-camp-earth leading-snug">{{ item.title }}</p>
									<p class="text-xs text-camp-bark leading-relaxed mt-0.5">{{ item.text }}</p>
									@if (item.link) {
										<a [routerLink]="item.link" class="btn btn-ghost btn-sm -ml-3 mt-1">{{ item.linkLabel || "Apri" }} →</a>
									}
								</div>
							</li>
						}
					</ul>
				}
			</section>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
				<app-journal-weather-card [state]="weatherState()" [weather]="weather()" [day]="today()" [spray]="spray()" [risks]="risks()" (retry)="loadWeather(true)" />

				<div class="space-y-5">
					@if (noteCards().items.length) {
						<section class="camp-card card-body">
							<div class="section-head">
								<div>
									<p class="eyebrow">📌 Bacheca</p>
									<h2 class="section-title">{{ noteCards().title }}</h2>
								</div>
								<a routerLink="/journal/notes" class="btn btn-ghost btn-sm">Vai alla bacheca →</a>
							</div>
							<div class="grid sm:grid-cols-2 gap-3">
								@for (n of noteCards().items; track n.id; let odd = $odd) {
									<button
										type="button"
										(click)="openNote(n)"
										class="text-left border rounded-lg p-3 shadow-camp-sm hover:shadow-camp hover:rotate-0 transition-all cursor-pointer"
										[class]="noteColor(n) + (odd ? ' rotate-[0.6deg]' : ' -rotate-[0.6deg]')"
									>
										@if (n.title) {
											<p class="text-sm font-serif font-semibold text-camp-earth line-clamp-1">{{ n.pinned ? "📌 " : "" }}{{ n.title }}</p>
										}
										<p class="text-xs text-camp-bark line-clamp-3 whitespace-pre-line">{{ !n.title && n.pinned ? "📌 " : "" }}{{ n.content }}</p>
										@if (n.reminder_date) {
											<p class="mt-2 text-[11px] font-semibold" [class]="n.reminder_date <= todayKey ? 'text-camp-error' : 'text-camp-olive'">
												⏰ {{ n.reminder_date < todayKey ? "Scaduto il " + formatDate(n.reminder_date) : n.reminder_date === todayKey ? "Oggi" : formatDate(n.reminder_date) }}
											</p>
										}
									</button>
								}
							</div>
						</section>
					}

					<app-journal-today-activities />
				</div>
			</div>
		</div>
	`
})
export class JournalHomeComponent implements OnInit {
	private farmStore = inject(FarmStore);
	private ops = inject(OperationsStore);
	private notes = inject(NotesService);
	private weatherService = inject(WeatherService);
	private auth = inject(AuthService);
	private router = inject(Router);

	readonly tabs = JOURNAL_TABS;
	readonly toneClass = TONE_CLASS;
	readonly todayKey = toLocalDateKey(new Date());
	readonly season = oliveSeasonPhase(new Date().getMonth() + 1);

	readonly weather = signal<WeatherData | null>(null);
	readonly weatherState = signal<WeatherState>("loading");

	readonly today = computed(() => {
		const w = this.weather();
		return w ? daySnapshot(w, 0) : null;
	});
	readonly tomorrow = computed(() => {
		const w = this.weather();
		return w ? daySnapshot(w, 1) : null;
	});
	readonly spray = computed(() => {
		const d = this.today();
		return d ? sprayWindow(d) : null;
	});
	readonly risks = computed(() => {
		const d = this.today();
		return d ? agronomicRisks(d, new Date().getMonth() + 1) : [];
	});

	readonly loadingBriefing = computed(() => (!this.ops.loaded() || !this.farmStore.loaded()) && !this.farmStore.error());

	readonly briefing = computed(() =>
		buildDailyBriefing({
			now: new Date(),
			userName: this.auth.profile()?.full_name || "",
			events: this.ops.events(),
			today: this.ops.today(),
			upcoming: this.ops.upcoming(),
			effectiveStatus: e => this.ops.effectiveStatus(e),
			season: this.season,
			day: this.today(),
			tomorrow: this.tomorrow(),
			health: this.farmStore.healthStats(),
			dueReminders: this.notes.generalNotes().filter(n => n.reminder_date && n.reminder_date <= this.todayKey).length
		})
	);

	/** Promemoria (scaduti o fissati); in assenza, le ultime note generali. */
	readonly noteCards = computed(() => {
		const reminders = this.notes.reminders();
		if (reminders.length) return { title: "Promemoria", items: reminders.slice(0, 4) };
		const latest = [...this.notes.generalNotes()].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 3);
		return { title: "Dalle tue note", items: latest };
	});

	async ngOnInit() {
		this.ops.load();
		this.notes.load();
		await this.farmStore.ensureLoaded();
		this.loadWeather();
	}

	async loadWeather(force = false) {
		const farm = this.farmStore.farm();
		if (!farm) {
			this.weatherState.set(this.farmStore.error() ? "error" : "no-farm");
			return;
		}
		if (farm.latitude === null || farm.latitude === undefined || farm.longitude === null || farm.longitude === undefined) {
			this.weatherState.set("no-coords");
			return;
		}
		if (this.weather() && !force) return;
		this.weatherState.set("loading");
		try {
			this.weather.set(await this.weatherService.getWeatherCached(Number(farm.latitude), Number(farm.longitude)));
			this.weatherState.set("ready");
		} catch (err) {
			console.error("[JournalHome] meteo", err);
			this.weatherState.set("error");
		}
	}

	openNote(note: Note) {
		this.router.navigate(["/journal/notes"], { queryParams: { note: note.id } });
	}

	noteColor(n: Note): string {
		return NOTE_COLOR_CLASS[n.color] || NOTE_COLOR_CLASS.yellow;
	}

	formatDate = (v?: string | null) => formatDateIt(v && v.length === 10 ? `${v}T00:00:00` : v, { day: "numeric", month: "short" });
}
