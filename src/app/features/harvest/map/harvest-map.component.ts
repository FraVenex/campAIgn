import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { FarmMapComponent, FarmMapMode, MapBadge } from "../../../shared/components/farm-map/farm-map.component";
import { PlantPopupCardComponent, PopupRowComponent } from "../../../shared/components/plant-popup/plant-popup.component";
import { SelectionBarComponent } from "../../../shared/components/selection-bar/selection-bar.component";
import { OperationFormDialogComponent } from "../../../shared/components/operation-form-dialog/operation-form-dialog.component";
import { CampDialogComponent } from "../../../shared/components/camp-dialog/camp-dialog.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { NotesService } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";
import { WeatherService } from "../../../core/services/weather.service";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { HARVEST_TABS } from "../../../core/constants/navigation";
import { EventType, PLANT_STATUSES, PLANT_STATUS_META, WORK_STATUS_META, WorkStatus, formatDateIt } from "../../../core/constants/domain";
import { DaySnapshot, daySnapshot, oliveSeasonPhase } from "../../../core/utils/agronomy";
import { toDateInput } from "../../../core/utils/operation-details";

type HarvestFilter = "all" | "todo" | "scheduled" | "harvested";

interface SeasonHint {
	phase: string;
	description: string;
	weather: string | null;
	tone: "good" | "warn" | "neutral";
}

const FILTERS: { key: HarvestFilter; label: string; icon: string }[] = [
	{ key: "all", label: "Tutte", icon: "🌳" },
	{ key: "todo", label: "Da raccogliere", icon: "⏳" },
	{ key: "scheduled", label: "Programmate", icon: "🫒" },
	{ key: "harvested", label: "Già raccolte", icon: "✅" }
];

@Component({
	selector: "app-harvest-map",
	standalone: true,
	imports: [RouterLink, PageHeaderComponent, FarmMapComponent, PlantPopupCardComponent, PopupRowComponent, SelectionBarComponent, OperationFormDialogComponent, CampDialogComponent, ChipComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Raccolta" title="Mappa della raccolta" description="Seleziona le piante da raccogliere e programma la raccolta: finirà nel calendario." [tabs]="tabs">
				<ng-container actions>
					<div class="segmented" role="group" aria-label="Modalità mappa">
						<button type="button" (click)="setMode('view')" class="segmented-item" [class.is-active]="mode() === 'view'">Esplora</button>
						<button type="button" (click)="setMode('select')" class="segmented-item" [class.is-active]="mode() === 'select'">Seleziona</button>
					</div>
				</ng-container>
			</app-page-header>

			@if (store.isLoading() && !store.loaded()) {
				<div class="h-96 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
			} @else if (!store.farm()) {
				<div class="camp-card card-body">
					<div class="empty-state">
						<span class="empty-state-icon">🗺️</span>
						<p class="text-muted">Non hai ancora registrato un terreno.</p>
						<a routerLink="/onboarding" class="btn btn-primary btn-sm mt-2">Inizia onboarding</a>
					</div>
				</div>
			} @else {
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
					<div class="kpi">
						<p class="kpi-label">Piante</p>
						<p class="kpi-value">{{ store.plants().length }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Da raccogliere</p>
						<p class="kpi-value text-camp-amber">{{ counts().todo }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Programmate</p>
						<p class="kpi-value text-camp-sage">{{ counts().scheduled }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Raccolte nel {{ currentYear }}</p>
						<p class="kpi-value text-camp-success">{{ counts().harvested }}</p>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
					<section class="lg:col-span-2 camp-card card-body space-y-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div class="flex flex-wrap gap-1.5">
								@for (f of filters; track f.key) {
									<button type="button" (click)="filter.set(f.key)" class="filter-chip" [class.is-active]="filter() === f.key">
										<span>{{ f.icon }}</span>{{ f.label }}
									</button>
								}
							</div>
							@if (mode() === "select") {
								<div class="flex flex-wrap gap-1.5">
									<button type="button" (click)="selectAll()" class="btn btn-secondary btn-sm">Seleziona tutte</button>
									<button type="button" (click)="selectTodo()" [disabled]="!counts().todo" class="btn btn-secondary btn-sm">Solo da raccogliere</button>
								</div>
							}
						</div>

						@if (mode() === "select") {
							<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3 text-xs text-camp-earth animate-slide-up">
								<strong class="text-camp-sage">Modalità selezione:</strong> tocca le piante o usa la selezione ad area (⬚), poi premi <strong>Programma raccolta</strong>.
							</div>
						}

						<app-farm-map
							[plants]="store.plants()"
							[mode]="mode()"
							[selectedIds]="selectedIds()"
							[badges]="badges()"
							[highlightIds]="highlightIds()"
							[popupTemplate]="popup"
							(selectionChange)="selectedIds.set($event)"
						/>

						<div class="space-y-1.5 text-[11px] text-camp-olive">
							<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
								<span class="kpi-label">Legenda</span>
								<span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-camp-amber-light border border-white shadow flex items-center justify-center text-[9px]">🫒</span>Raccolta programmata</span>
								<span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-camp-success-light border border-white shadow flex items-center justify-center text-[9px]">✅</span>Raccolta nel {{ currentYear }}</span>
							</div>
							<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
								<span class="kpi-label">Salute</span>
								@for (s of statuses; track s) {
									<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full border-2" [class]="statusMeta[s].marker"></span>{{ s }}</span>
								}
							</div>
						</div>
					</section>

					<div class="space-y-5">
						@if (seasonHint(); as hint) {
							<div
								class="rounded-camp-lg border p-5"
								[class]="hint.tone === 'good' ? 'bg-camp-success-light border-camp-success/20' : hint.tone === 'warn' ? 'bg-camp-amber/10 border-camp-amber/30' : 'bg-camp-cream/60 border-camp-sand/60'"
							>
								<p class="eyebrow">Stagione · {{ hint.phase }}</p>
								<p class="text-sm text-camp-earth mt-1.5 leading-relaxed">{{ hint.description }}</p>
								@if (hint.weather) {
									<p class="text-xs text-camp-earth mt-3 pt-3 border-t border-camp-sand/50 leading-relaxed">{{ hint.weather }}</p>
								}
							</div>
						}

						<section class="camp-card card-body">
							<div class="section-head">
								<div>
									<p class="eyebrow">Calendario</p>
									<h2 class="section-title">Raccolte programmate</h2>
								</div>
								<button type="button" (click)="openSchedule([])" class="btn btn-secondary btn-sm">Nuova raccolta</button>
							</div>
							@if (!openHarvests().length) {
								<p class="text-muted text-center py-4">Nessuna raccolta in programma. Passa a «Seleziona» e scegli le piante sulla mappa.</p>
							} @else {
								<ul class="space-y-3">
									@for (e of openHarvests(); track e.id) {
										<li class="border border-camp-sand/60 rounded-xl p-3 bg-camp-beige">
											<div class="flex items-start justify-between gap-2">
												<div class="min-w-0">
													<p class="text-sm font-semibold text-camp-earth truncate">{{ e.title }}</p>
													<p class="text-xs text-camp-olive mt-0.5">{{ eventDateLabel(e) }} · {{ plantsLabel(e) }}</p>
												</div>
												<app-chip [label]="statusMeta2(e).label" [icon]="statusMeta2(e).icon" [tone]="statusMeta2(e).tone" />
											</div>
											<div class="flex flex-wrap gap-1.5 mt-3">
												<button type="button" (click)="setStatus(e, 'in_progress')" [disabled]="e.work_status === 'in_progress'" class="btn btn-secondary btn-sm flex-1">In corso</button>
												<button type="button" (click)="setStatus(e, 'done')" class="btn btn-primary btn-sm flex-1">Svolta</button>
												<button type="button" (click)="setStatus(e, 'skipped')" class="btn btn-secondary btn-sm flex-1">Saltata</button>
												<button type="button" (click)="editEvent.set(e)" class="btn btn-secondary btn-sm flex-1">Modifica</button>
											</div>
											@if (e.plant_ids?.length) {
												<button type="button" (click)="showOnMap(e)" class="btn btn-ghost btn-sm mt-2">Mostra sulla mappa</button>
											}
										</li>
									}
								</ul>
							}

							@if (doneThisSeason().length) {
								<div class="mt-5 pt-4 border-t border-camp-sand/40">
									<p class="eyebrow mb-2">Svolte nel {{ currentYear }}</p>
									<ul class="space-y-2">
										@for (e of doneThisSeason(); track e.id) {
											<li class="flex items-center justify-between gap-2 text-xs">
												<span class="text-camp-earth truncate">✅ {{ e.title }} · {{ formatDate(e.start) }}</span>
												<button type="button" (click)="registerInArchive(e)" class="btn btn-ghost btn-sm shrink-0">Registra in archivio</button>
											</li>
										}
									</ul>
								</div>
							}
						</section>
					</div>
				</div>
			}

			<ng-template #popup let-plant let-close="close">
				<app-plant-popup-card [plant]="plant" (close)="close()">
					<app-popup-row label="Varietà">{{ plant.variety || "—" }}</app-popup-row>
					@if (nextHarvestFor(plant.id); as ev) {
						<app-popup-row label="Raccolta programmata">{{ formatDate(ev.start) }} · {{ statusMeta2(ev).icon }} {{ statusMeta2(ev).label }}</app-popup-row>
					} @else {
						<app-popup-row label="Raccolta programmata">Nessuna</app-popup-row>
					}
					<app-popup-row label="Ultima raccolta">{{ lastHarvestFor(plant.id) ? formatDate(lastHarvestFor(plant.id)!.start) : "—" }}</app-popup-row>
					<app-popup-row label="Raccolta {{ currentYear }}">{{ harvestedIds().has(plant.id) ? "✅ Sì" : "Non ancora" }}</app-popup-row>
					<div popupActions>
						<button type="button" (click)="close(); openSchedule([plant.id])" class="btn btn-secondary btn-sm w-full">Programma raccolta</button>
					</div>
				</app-plant-popup-card>
			</ng-template>

			<app-selection-bar [count]="selectedIds().size" (selectAll)="selectAll()" (clear)="selectedIds.set(emptySet())">
				<button type="button" (click)="scheduleSelected()" class="btn btn-sm bg-white text-camp-earth hover:bg-camp-cream">Programma raccolta</button>
			</app-selection-bar>

			@if (scheduleFor(); as ids) {
				<app-operation-form-dialog [plantIds]="ids" [types]="harvestTypes" defaultType="harvest" (close)="scheduleFor.set(null)" (saved)="onScheduled()" />
			}

			@if (editEvent(); as ev) {
				<app-operation-form-dialog [event]="ev" [plantIds]="ev.plant_ids || []" [types]="harvestTypes" defaultType="harvest" (close)="editEvent.set(null)" />
			}

			@if (registerPrompt(); as ev) {
				<app-camp-dialog title="Registra in archivio" subtitle="Raccolta svolta" icon="🗃️" maxWidth="max-w-md" (close)="registerPrompt.set(null)">
					<p class="text-sm text-camp-earth leading-relaxed">
						Ottimo lavoro! Vuoi registrare subito quintali, litri e costi di «{{ ev.title }}» nell'archivio? Il report di bontà del raccolto verrà generato automaticamente.
					</p>
					<div footer class="dialog-footer">
						<button type="button" (click)="registerPrompt.set(null)" class="btn btn-secondary">Più tardi</button>
						<button type="button" (click)="registerInArchive(ev)" class="btn btn-primary">Registra ora</button>
					</div>
				</app-camp-dialog>
			}
		</div>
	`
})
export class HarvestMapComponent implements OnInit {
	readonly store = inject(FarmStore);
	private ops = inject(OperationsStore);
	private notes = inject(NotesService);
	private toast = inject(ToastService);
	private weather = inject(WeatherService);
	private router = inject(Router);

	readonly tabs = HARVEST_TABS;
	readonly filters = FILTERS;
	readonly harvestTypes: EventType[] = ["harvest"];
	readonly statuses = PLANT_STATUSES;
	readonly statusMeta = PLANT_STATUS_META;
	readonly currentYear = new Date().getFullYear();

	readonly mode = signal<FarmMapMode>("view");
	readonly filter = signal<HarvestFilter>("all");
	readonly selectedIds = signal<Set<string>>(new Set());
	readonly scheduleFor = signal<string[] | null>(null);
	readonly editEvent = signal<CalendarEvent | null>(null);
	readonly registerPrompt = signal<CalendarEvent | null>(null);
	private readonly forecast = signal<DaySnapshot[] | null>(null);

	readonly harvestEvents = computed(() => this.ops.events().filter(e => e.type === "harvest"));

	/** Raccolte ancora aperte (da svolgere, in corso, in ritardo), dalla più vicina. */
	readonly openHarvests = computed(() =>
		this.harvestEvents()
			.filter(e => e.work_status !== "done" && e.work_status !== "skipped")
			.sort((a, b) => a.start.localeCompare(b.start))
	);

	readonly doneThisSeason = computed(() =>
		this.harvestEvents()
			.filter(e => e.work_status === "done" && new Date(e.start).getFullYear() === this.currentYear)
			.sort((a, b) => b.start.localeCompare(a.start))
	);

	/** Piante con raccolta programmata: eventi senza piante valgono per tutto il terreno. */
	readonly scheduledIds = computed(() => this.idsOf(this.openHarvests()));
	readonly harvestedIds = computed(() => this.idsOf(this.doneThisSeason()));

	readonly counts = computed(() => {
		const scheduled = this.scheduledIds();
		const harvested = this.harvestedIds();
		const plants = this.store.plants();
		return {
			scheduled: plants.filter(p => scheduled.has(p.id!)).length,
			harvested: plants.filter(p => harvested.has(p.id!)).length,
			todo: plants.filter(p => !scheduled.has(p.id!) && !harvested.has(p.id!)).length
		};
	});

	readonly badges = computed(() => {
		const scheduled = this.scheduledIds();
		const harvested = this.harvestedIds();
		const out: Record<string, MapBadge[]> = {};
		for (const p of this.store.plants()) {
			const list: MapBadge[] = [];
			if (scheduled.has(p.id!)) list.push({ icon: "🫒", title: "Raccolta programmata", tone: "bg-camp-amber-light" });
			if (harvested.has(p.id!)) list.push({ icon: "✅", title: `Raccolta nel ${this.currentYear}`, tone: "bg-camp-success-light" });
			if (list.length) out[p.id!] = list;
		}
		return out;
	});

	readonly highlightIds = computed<Set<string> | null>(() => {
		const f = this.filter();
		if (f === "all") return null;
		const scheduled = this.scheduledIds();
		const harvested = this.harvestedIds();
		return new Set(
			this.store
				.plants()
				.filter(p => (f === "scheduled" ? scheduled.has(p.id!) : f === "harvested" ? harvested.has(p.id!) : !scheduled.has(p.id!) && !harvested.has(p.id!)))
				.map(p => p.id!)
		);
	});

	readonly seasonHint = computed<SeasonHint>(() => {
		const month = new Date().getMonth() + 1;
		const phase = oliveSeasonPhase(month);
		const inSeason = month >= 9 || month === 1;
		const days = this.forecast();
		let weather: string | null = null;
		let tone: SeasonHint["tone"] = "neutral";
		if (inSeason && days?.length) {
			const today = days[0];
			const dry = days.filter(d => d.precip < 1 && d.precipProb < 40 && d.wind < 30);
			const dryLabels = dry.map(d => formatDateIt(d.date, { weekday: "short", day: "numeric" }));
			if (today.precip >= 1 || today.precipProb >= 60) {
				weather = `🌧️ Oggi è prevista pioggia (${today.precip.toFixed(1)} mm): evita di raccogliere olive bagnate, si conservano peggio prima della molitura.`;
				tone = "warn";
				if (dryLabels.length) weather += ` Giornate più asciutte: ${dryLabels.join(", ")}.`;
			} else if (dryLabels.length) {
				weather = `☀️ Giornate asciutte ideali per raccogliere: ${dryLabels.join(", ")}. Porta le olive al frantoio entro 24-48 ore.`;
				tone = "good";
			} else {
				weather = "🌦️ Settimana instabile: programma la raccolta nelle finestre senza pioggia e organizza la molitura rapida.";
				tone = "warn";
			}
		} else if (!inSeason) {
			weather = "La raccolta delle olive si concentra tra ottobre e dicembre: puoi già pianificare reti, cassette e frantoio.";
		}
		return { phase: phase.phase, description: phase.description, weather, tone };
	});

	ngOnInit() {
		this.store.ensureLoaded().then(() => this.loadWeather());
		this.ops.load();
		this.notes.load();
	}

	private async loadWeather() {
		const farm = this.store.farm();
		if (farm?.latitude == null || farm?.longitude == null) return;
		try {
			const data = await this.weather.getWeatherCached(Number(farm.latitude), Number(farm.longitude));
			const days = [0, 1, 2, 3, 4].map(o => daySnapshot(data, o)).filter((d): d is DaySnapshot => !!d);
			this.forecast.set(days);
		} catch {
			this.forecast.set(null);
		}
	}

	setMode(mode: FarmMapMode) {
		this.mode.set(mode);
		if (mode === "view") this.selectedIds.set(new Set());
	}

	selectAll() {
		this.mode.set("select");
		this.selectedIds.set(new Set(this.store.plants().map(p => p.id!)));
	}

	selectTodo() {
		const scheduled = this.scheduledIds();
		const harvested = this.harvestedIds();
		this.selectedIds.set(new Set(this.store.plants().filter(p => !scheduled.has(p.id!) && !harvested.has(p.id!)).map(p => p.id!)));
	}

	showOnMap(e: CalendarEvent) {
		this.mode.set("select");
		this.selectedIds.set(new Set(e.plant_ids || []));
	}

	scheduleSelected() {
		this.scheduleFor.set([...this.selectedIds()]);
	}

	openSchedule(ids: string[]) {
		this.scheduleFor.set(ids);
	}

	onScheduled() {
		this.selectedIds.set(new Set());
		this.mode.set("view");
	}

	async setStatus(e: CalendarEvent, status: WorkStatus) {
		if (!e.id) return;
		try {
			await this.ops.setWorkStatus(e.id, status);
			this.toast.success(`${e.title}: ${WORK_STATUS_META[status].label.toLowerCase()}`);
			if (status === "done") this.registerPrompt.set({ ...e, work_status: "done" });
		} catch {
			this.toast.error("Impossibile aggiornare lo stato");
		}
	}

	registerInArchive(e: CalendarEvent) {
		this.registerPrompt.set(null);
		const queryParams: Record<string, string> = { register: "1", date: toDateInput(e.start) };
		if (e.plant_ids?.length) queryParams["plants"] = e.plant_ids.join(",");
		this.router.navigate(["/harvest/archive"], { queryParams });
	}

	nextHarvestFor(plantId: string): CalendarEvent | null {
		return this.openHarvests().find(e => !e.plant_ids?.length || e.plant_ids.includes(plantId)) ?? null;
	}

	lastHarvestFor(plantId: string): CalendarEvent | null {
		return this.ops.forPlant(plantId, ["harvest"]).find(e => e.work_status === "done") ?? null;
	}

	statusMeta2(e: CalendarEvent) {
		return WORK_STATUS_META[this.ops.effectiveStatus(e)];
	}

	eventDateLabel(e: CalendarEvent): string {
		const start = toDateInput(e.start);
		const end = toDateInput(e.end || e.start);
		return start === end ? formatDateIt(e.start) : `${formatDateIt(e.start, { day: "numeric", month: "short" })} → ${formatDateIt(e.end)}`;
	}

	plantsLabel(e: CalendarEvent): string {
		const n = e.plant_ids?.length || 0;
		return n ? `${n} ${n === 1 ? "pianta" : "piante"}` : "tutto il terreno";
	}

	emptySet(): Set<string> {
		return new Set();
	}

	formatDate = (v?: string | null) => formatDateIt(v);

	private idsOf(events: CalendarEvent[]): Set<string> {
		const ids = new Set<string>();
		for (const e of events) {
			if (!e.plant_ids?.length) {
				this.store.plants().forEach(p => ids.add(p.id!));
				continue;
			}
			e.plant_ids.forEach(id => ids.add(id));
		}
		return ids;
	}
}
