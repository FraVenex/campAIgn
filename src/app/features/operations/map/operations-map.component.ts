import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { FarmMapComponent, FarmMapMode, MapBadge } from "../../../shared/components/farm-map/farm-map.component";
import { PlantPopupCardComponent, PopupRowComponent } from "../../../shared/components/plant-popup/plant-popup.component";
import { SelectionBarComponent } from "../../../shared/components/selection-bar/selection-bar.component";
import { OperationFormDialogComponent } from "../../../shared/components/operation-form-dialog/operation-form-dialog.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { Plant } from "../../../core/services/plants.service";
import { OPERATIONS_TABS } from "../../../core/constants/navigation";
import { EVENT_TYPE_META, EventType, OPERATION_TYPES, PLANT_STATUSES, PLANT_STATUS_META, WORK_STATUS_META, formatDateIt } from "../../../core/constants/domain";
import { parseOperationDescription } from "../../../core/utils/operation-details";
import { BADGE_LEGEND, PlantOpsSummary, buildBadges, formatEventDate, isOpenStatus, isOperationType, urgencyRank } from "../operations-utils";

type OpsFilter = "all" | "open" | "overdue" | "never";

const EMPTY_SUMMARY: PlantOpsSummary = { open: [], overdue: 0, inProgress: 0, openTypes: new Set(), lastTreatment: null, lastMaintenance: null, doneThisYear: 0 };

@Component({
	selector: "app-operations-map",
	standalone: true,
	imports: [FormsModule, RouterLink, PageHeaderComponent, FarmMapComponent, PlantPopupCardComponent, PopupRowComponent, SelectionBarComponent, OperationFormDialogComponent, ChipComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header
				section="Manutenzioni e trattamenti"
				title="Mappa interventi"
				description="Seleziona una o più piante per programmare trattamenti, manutenzioni e irrigazioni. I simboli sui marker indicano gli interventi aperti."
				[tabs]="tabs"
			>
				<ng-container actions>
					<button type="button" (click)="openDialog([], 'treatment')" class="btn btn-primary">Intervento su tutto il terreno</button>
				</ng-container>
			</app-page-header>

			@if (store.isLoading() && !store.loaded()) {
				<div class="h-96 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
			} @else if (!store.farm()) {
				<div class="camp-card empty-state">
					<p class="empty-state-icon">🗺️</p>
					<p class="text-muted">Non hai ancora registrato un terreno.</p>
					<a routerLink="/onboarding" class="btn btn-primary btn-sm mt-2">Inizia onboarding</a>
				</div>
			} @else {
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
					<button type="button" (click)="setFilter('open')" class="kpi" [class.is-active]="filter() === 'open'" [attr.aria-pressed]="filter() === 'open'">
						<p class="kpi-label">Con interventi aperti</p>
						<p class="kpi-value">{{ kpis().withOpen }}<span class="text-sm font-sans text-camp-olive"> / {{ kpis().total }}</span></p>
					</button>
					<button type="button" (click)="setFilter('overdue')" class="kpi" [class.is-active]="filter() === 'overdue'" [attr.aria-pressed]="filter() === 'overdue'">
						<p class="kpi-label">In ritardo</p>
						<p class="kpi-value" [class]="kpis().overdue ? 'text-camp-amber' : 'text-camp-earth'">{{ kpis().overdue }}</p>
					</button>
					<button type="button" (click)="setFilter('never')" class="kpi" [class.is-active]="filter() === 'never'" [attr.aria-pressed]="filter() === 'never'">
						<p class="kpi-label">Mai trattate</p>
						<p class="kpi-value">{{ kpis().never }}</p>
					</button>
					<div class="kpi">
						<p class="kpi-label">Svolti nel {{ year }}</p>
						<p class="kpi-value text-camp-success">{{ kpis().doneThisYear }}</p>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
					<div class="camp-card card-body space-y-4 min-w-0">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div class="segmented w-full sm:w-fit" role="group" aria-label="Modalità mappa">
								<button type="button" (click)="setMode('select')" class="segmented-item flex-1 sm:flex-none" [class.is-active]="mode() === 'select'" [attr.aria-pressed]="mode() === 'select'">☑️ Seleziona</button>
								<button type="button" (click)="setMode('view')" class="segmented-item flex-1 sm:flex-none" [class.is-active]="mode() === 'view'" [attr.aria-pressed]="mode() === 'view'">👁️ Esplora</button>
							</div>
							<input type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca pianta, varietà…" aria-label="Cerca piante" class="camp-input-sm sm:w-64" />
						</div>

						<div class="flex flex-wrap items-center gap-1.5">
							@for (f of filters; track f.key) {
								<button type="button" (click)="setFilter(f.key)" class="filter-chip" [class.is-active]="filter() === f.key">
									{{ f.label }}
								</button>
							}
							<span class="w-px h-4 bg-camp-sand mx-1 hidden sm:inline-block"></span>
							@for (s of statuses; track s) {
								<button type="button" (click)="toggleStatus(s)" class="filter-chip" [class.is-active]="statusFilter().has(s)">
									{{ statusMeta[s].emoji }} {{ s }}
								</button>
							}
						</div>

						@if (focusedEvent(); as fe) {
							<div class="bg-camp-sage/10 border border-camp-sage/25 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 animate-slide-up">
								<p class="text-xs text-camp-earth">Piante di <strong>{{ typeMeta(fe.type).icon }} {{ fe.title }}</strong> evidenziate</p>
								<div class="flex gap-1.5">
									@if (mode() === "select") {
										<button type="button" (click)="selectHighlighted()" class="btn btn-secondary btn-sm">Seleziona</button>
									}
									<button type="button" (click)="focusedEventId.set(null)" class="btn btn-ghost btn-sm">Mostra tutte</button>
								</div>
							</div>
						} @else if (highlightIds()) {
							<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-camp-olive">
								<span>{{ highlightCount() }} {{ highlightCount() === 1 ? "pianta corrisponde" : "piante corrispondono" }} ai filtri</span>
								<div class="flex gap-1.5">
									@if (mode() === "select" && highlightCount()) {
										<button type="button" (click)="selectHighlighted()" class="btn btn-secondary btn-sm">Seleziona filtrate</button>
									}
									<button type="button" (click)="resetFilters()" class="btn btn-ghost btn-sm">Azzera filtri</button>
								</div>
							</div>
						}

						<p class="text-xs text-camp-olive">
							@if (mode() === "select") {
								Tocca le piante per selezionarle, oppure usa <strong>⬚</strong> sulla mappa per selezionare un'area. Passa a <strong>Esplora</strong> per vedere la scheda interventi di una pianta.
							} @else {
								Tocca una pianta per vedere ultimi interventi e attività aperte, o per programmarne una nuova.
							}
						</p>

						<app-farm-map
							[plants]="store.plants()"
							[mode]="mode()"
							[selectedIds]="selected()"
							[badges]="badges()"
							[highlightIds]="highlightIds()"
							[popupTemplate]="popup"
							(selectionChange)="selected.set($event)"
						/>

						<div class="space-y-2 text-[11px] text-camp-olive">
							<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
								<span class="eyebrow">Simboli</span>
								@for (b of legend; track b.icon) {
									<span class="flex items-center gap-1.5">
										<span class="w-[18px] h-[18px] rounded-full border border-camp-sand shadow-sm flex items-center justify-center text-[10px] leading-none" [class]="b.tone">{{ b.icon }}</span>
										{{ b.label }}
									</span>
								}
							</div>
							<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
								<span class="eyebrow">Stato pianta</span>
								@for (s of statuses; track s) {
									<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full border-2" [class]="statusMeta[s].marker"></span>{{ s }}</span>
								}
							</div>
						</div>
					</div>

					<aside class="camp-card card-body space-y-3 lg:sticky lg:top-4">
						<div class="section-head">
							<div>
								<p class="eyebrow">Da fare</p>
								<h2 class="section-title">Prossimi interventi</h2>
							</div>
							<a routerLink="/operations/log" class="btn btn-ghost btn-sm">Registro →</a>
						</div>
						@if (ops.isLoading() && !ops.loaded()) {
							<div class="space-y-2">
								@for (i of [1, 2, 3]; track i) {
									<div class="h-14 bg-camp-sand/20 animate-pulse rounded-xl"></div>
								}
							</div>
						} @else if (!nextOps().length) {
							<div class="empty-state py-6">
								<p class="empty-state-icon text-2xl">🌿</p>
								<p class="text-muted">Nessun intervento aperto. Seleziona delle piante per programmarne uno.</p>
							</div>
						} @else {
							<ul class="space-y-2">
								@for (e of nextOps(); track e.id) {
									<li>
										<button
											type="button"
											(click)="focusEvent(e)"
											class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer"
											[class]="focusedEventId() === e.id ? 'border-camp-sage bg-camp-sage/10' : 'border-camp-sand/60 hover:bg-camp-cream/50'"
										>
											<div class="flex items-start gap-2.5">
												<span class="text-lg leading-none mt-0.5">{{ typeMeta(e.type).icon }}</span>
												<div class="min-w-0 flex-1">
													<p class="text-sm font-semibold text-camp-earth truncate">{{ e.title }}</p>
													<p class="text-[11px] text-camp-olive mt-0.5">{{ eventDate(e) }} · {{ plantsLabel(e) }}</p>
													<div class="mt-1.5"><app-chip [label]="workMeta[ops.effectiveStatus(e)].label" [icon]="workMeta[ops.effectiveStatus(e)].icon" [tone]="workMeta[ops.effectiveStatus(e)].tone" /></div>
												</div>
											</div>
										</button>
									</li>
								}
							</ul>
							@if (openCount() > nextOps().length) {
								<p class="text-[11px] text-camp-olive text-center">e altri {{ openCount() - nextOps().length }} nel registro</p>
							}
						}
					</aside>
				</div>
			}

			<ng-template #popup let-plant let-close="close">
				<app-plant-popup-card [plant]="plant" (close)="close()">
					@if (summaryOf(plant); as s) {
						<app-popup-row label="Ultimo trattamento">{{ lastTreatmentLabel(plant, s) }}</app-popup-row>
						<app-popup-row label="Ultima manutenzione">{{ s.lastMaintenance ? s.lastMaintenance.title + " · " + formatDate(s.lastMaintenance.start) : "—" }}</app-popup-row>
						<app-popup-row label="Svolti nel {{ year }}">{{ s.doneThisYear }}</app-popup-row>
						<div class="pt-1">
							<p class="eyebrow mb-1.5">Attività aperte</p>
							@if (s.open.length) {
								<ul class="space-y-1.5">
									@for (e of s.open.slice(0, 3); track e.id) {
										<li class="flex items-center justify-between gap-2">
											<span class="truncate text-camp-earth">{{ typeMeta(e.type).icon }} {{ e.title }} <span class="text-camp-olive">· {{ formatDate(e.start) }}</span></span>
											<app-chip [label]="workMeta[ops.effectiveStatus(e)].label" [tone]="workMeta[ops.effectiveStatus(e)].tone" />
										</li>
									}
								</ul>
								@if (s.open.length > 3) {
									<p class="text-[10px] text-camp-olive mt-1">+ altre {{ s.open.length - 3 }}</p>
								}
							} @else {
								<p class="text-camp-olive">Nessuna attività aperta</p>
							}
						</div>
					}
					<div popupActions>
						<button type="button" (click)="close(); openDialog([plant.id], 'treatment')" class="btn btn-primary btn-sm w-full">Programma intervento</button>
					</div>
				</app-plant-popup-card>
			</ng-template>

			<app-selection-bar [count]="selected().size" (selectAll)="selectAll()" (clear)="clearSelection()">
				@for (t of operationTypes; track t) {
					<button type="button" (click)="openDialog(selectedList(), t)" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white">
						<span aria-hidden="true">{{ typeMeta(t).icon }}</span>{{ typeMeta(t).label }}
					</button>
				}
			</app-selection-bar>

			@if (dialog(); as d) {
				<app-operation-form-dialog [plantIds]="d.plantIds" [defaultType]="d.type" (close)="dialog.set(null)" (saved)="onSaved()" />
			}
		</div>
	`
})
export class OperationsMapComponent implements OnInit {
	readonly store = inject(FarmStore);
	readonly ops = inject(OperationsStore);

	readonly tabs = OPERATIONS_TABS;
	readonly statuses = PLANT_STATUSES;
	readonly statusMeta = PLANT_STATUS_META;
	readonly workMeta = WORK_STATUS_META;
	readonly operationTypes = OPERATION_TYPES;
	readonly legend = BADGE_LEGEND;
	readonly year = new Date().getFullYear();
	readonly filters: { key: OpsFilter; label: string }[] = [
		{ key: "all", label: "Tutte" },
		{ key: "open", label: "Con interventi aperti" },
		{ key: "overdue", label: "⚠️ In ritardo" },
		{ key: "never", label: "Mai trattate" }
	];

	readonly mode = signal<FarmMapMode>("select");
	readonly selected = signal<Set<string>>(new Set());
	readonly search = signal("");
	readonly filter = signal<OpsFilter>("all");
	readonly statusFilter = signal<Set<string>>(new Set());
	readonly focusedEventId = signal<string | null>(null);
	readonly dialog = signal<{ plantIds: string[]; type: EventType } | null>(null);

	readonly selectedList = computed(() => [...this.selected()]);

	/** Interventi (esclusa raccolta) ordinati per data decrescente. */
	private readonly operationEvents = computed(() => this.ops.sorted().filter(e => isOperationType(e.type)));

	/** Riepilogo per pianta calcolato in un solo passaggio sugli eventi. */
	readonly summaries = computed(() => {
		const map = new Map<string, PlantOpsSummary>();
		const yearStart = new Date(this.year, 0, 1).getTime();
		const get = (id: string) => {
			let s = map.get(id);
			if (!s) {
				s = { open: [], overdue: 0, inProgress: 0, openTypes: new Set(), lastTreatment: null, lastMaintenance: null, doneThisYear: 0 };
				map.set(id, s);
			}
			return s;
		};
		for (const e of this.operationEvents()) {
			const status = this.ops.effectiveStatus(e);
			for (const pid of e.plant_ids || []) {
				const s = get(pid);
				if (isOpenStatus(status)) {
					s.open.push(e);
					s.openTypes.add(e.type);
					if (status === "overdue") s.overdue++;
					if (status === "in_progress") s.inProgress++;
				} else if (status === "done") {
					// eventi ordinati per data decrescente: il primo trovato è il più recente
					if (e.type === "treatment" && !s.lastTreatment) s.lastTreatment = e;
					if (e.type === "maintenance" && !s.lastMaintenance) s.lastMaintenance = e;
					if (new Date(e.start).getTime() >= yearStart) s.doneThisYear++;
				}
			}
		}
		for (const s of map.values()) s.open.sort((a, b) => urgencyRank(this.ops.effectiveStatus(a)) - urgencyRank(this.ops.effectiveStatus(b)) || a.start.localeCompare(b.start));
		return map;
	});

	readonly badges = computed(() => {
		const out: Record<string, MapBadge[]> = {};
		for (const [id, s] of this.summaries()) {
			const b = buildBadges(s);
			if (b.length) out[id] = b;
		}
		return out;
	});

	readonly kpis = computed(() => {
		const plants = this.store.plants();
		let withOpen = 0;
		let overdue = 0;
		let never = 0;
		for (const p of plants) {
			const s = this.summaries().get(p.id!);
			if (s?.open.length) withOpen++;
			if (s?.overdue) overdue++;
			if (this.isNeverTreated(p)) never++;
		}
		const yearStart = new Date(this.year, 0, 1).getTime();
		const doneThisYear = this.operationEvents().filter(e => e.work_status === "done" && new Date(e.start).getTime() >= yearStart).length;
		return { total: plants.length, withOpen, overdue, never, doneThisYear };
	});

	readonly openOps = computed(() =>
		this.operationEvents()
			.filter(e => isOpenStatus(this.ops.effectiveStatus(e)))
			.sort((a, b) => urgencyRank(this.ops.effectiveStatus(a)) - urgencyRank(this.ops.effectiveStatus(b)) || a.start.localeCompare(b.start))
	);
	readonly nextOps = computed(() => this.openOps().slice(0, 5));
	readonly openCount = computed(() => this.openOps().length);

	readonly focusedEvent = computed(() => {
		const id = this.focusedEventId();
		return id ? (this.ops.events().find(e => e.id === id) ?? null) : null;
	});

	readonly highlightIds = computed<Set<string> | null>(() => {
		const fe = this.focusedEvent();
		if (fe) return new Set(fe.plant_ids?.length ? fe.plant_ids : this.store.plants().map(p => p.id!));
		const q = this.search().toLowerCase().trim();
		const f = this.filter();
		const statuses = this.statusFilter();
		if (!q && f === "all" && !statuses.size) return null;
		return new Set(
			this.store
				.plants()
				.filter(p => {
					if (statuses.size && !statuses.has(p.status || "Non Valutato")) return false;
					if (q && ![p.name, p.species, p.variety].some(v => (v || "").toLowerCase().includes(q))) return false;
					const s = this.summaries().get(p.id!) ?? EMPTY_SUMMARY;
					if (f === "open") return s.open.length > 0;
					if (f === "overdue") return s.overdue > 0;
					if (f === "never") return this.isNeverTreated(p);
					return true;
				})
				.map(p => p.id!)
		);
	});

	readonly highlightCount = computed(() => this.highlightIds()?.size ?? 0);

	ngOnInit() {
		this.store.ensureLoaded();
		this.ops.load();
	}

	setMode(mode: FarmMapMode) {
		this.mode.set(mode);
	}

	setFilter(f: OpsFilter) {
		this.focusedEventId.set(null);
		this.filter.set(this.filter() === f ? "all" : f);
	}

	toggleStatus(status: string) {
		this.focusedEventId.set(null);
		const next = new Set(this.statusFilter());
		next.has(status) ? next.delete(status) : next.add(status);
		this.statusFilter.set(next);
	}

	resetFilters() {
		this.search.set("");
		this.filter.set("all");
		this.statusFilter.set(new Set());
		this.focusedEventId.set(null);
	}

	focusEvent(e: CalendarEvent) {
		this.focusedEventId.set(this.focusedEventId() === e.id ? null : (e.id ?? null));
	}

	selectHighlighted() {
		const ids = this.highlightIds();
		if (!ids) return;
		this.mode.set("select");
		this.selected.set(new Set(ids));
	}

	selectAll() {
		this.selected.set(new Set(this.store.plants().map(p => p.id!)));
	}

	clearSelection() {
		this.selected.set(new Set());
	}

	openDialog(plantIds: string[], type: EventType) {
		this.dialog.set({ plantIds, type });
	}

	onSaved() {
		this.clearSelection();
		this.focusedEventId.set(null);
	}

	summaryOf(plant: Plant): PlantOpsSummary {
		return this.summaries().get(plant.id!) ?? EMPTY_SUMMARY;
	}

	lastTreatmentLabel(plant: Plant, s: PlantOpsSummary): string {
		const e = s.lastTreatment;
		if (e) {
			const { product } = parseOperationDescription(e.description);
			return `${product || e.title} · ${formatDateIt(e.start)}`;
		}
		return plant.last_treatment_type ? `${plant.last_treatment_type} · ${formatDateIt(plant.last_treatment_at)}` : "Mai";
	}

	plantsLabel(e: CalendarEvent): string {
		const ids = e.plant_ids || [];
		if (!ids.length) return "Tutto il terreno";
		if (ids.length === 1) return this.store.getPlant(ids[0])?.name || "1 pianta";
		return `${ids.length} piante`;
	}

	private isNeverTreated(p: Plant): boolean {
		return !p.last_treatment_at && !this.summaries().get(p.id!)?.lastTreatment;
	}

	typeMeta = (t: EventType) => EVENT_TYPE_META[t] || EVENT_TYPE_META.other;
	eventDate = (e: CalendarEvent) => formatEventDate(e);
	formatDate = (v?: string | null) => formatDateIt(v);
}
