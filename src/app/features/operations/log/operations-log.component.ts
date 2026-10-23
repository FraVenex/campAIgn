import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { OperationFormDialogComponent } from "../../../shared/components/operation-form-dialog/operation-form-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { EffectiveWorkStatus, OperationsStore } from "../../../core/services/operations.store";
import { ToastService } from "../../../core/services/toast.service";
import { ReportExportService, escapeHtml } from "../../../core/services/report-export.service";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { OPERATIONS_TABS } from "../../../core/constants/navigation";
import { EVENT_TYPE_META, EventType, OPERATION_TYPES, WORK_STATUS_META, WorkStatus, formatDateIt, toLocalDateKey } from "../../../core/constants/domain";
import { parseOperationDescription } from "../../../core/utils/operation-details";
import { formatEventDate, isOpenStatus, mdCell, urgencyRank } from "../operations-utils";

type StatusFilter = "all" | EffectiveWorkStatus;
type PeriodFilter = "month" | "3months" | "year" | "all";
type GroupKey = "overdue" | "today" | "week" | "later" | "past";

interface LogRow {
	event: CalendarEvent;
	status: EffectiveWorkStatus;
	product: string;
	dose: string;
	notes: string;
	plants: string;
	plantNames: string[];
}

interface LogGroup {
	key: GroupKey;
	label: string;
	icon: string;
	rows: LogRow[];
}

const ALL_TYPES: EventType[] = [...OPERATION_TYPES, "harvest"];
const DAY_MS = 86_400_000;
const PAST_PAGE = 30;

@Component({
	selector: "app-operations-log",
	standalone: true,
	imports: [FormsModule, NgTemplateOutlet, PageHeaderComponent, ChipComponent, ConfirmDialogComponent, OperationFormDialogComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Manutenzioni e trattamenti" title="Registro interventi" description="Tutti gli interventi passati e programmati, raggruppati per urgenza. Aggiorna lo stato con un tocco." [tabs]="tabs">
				<ng-container actions>
					<div class="relative">
						<button type="button" (click)="exportOpen.set(!exportOpen())" class="btn btn-secondary" [attr.aria-expanded]="exportOpen()">Esporta</button>
						@if (exportOpen()) {
							<div class="fixed inset-0 z-30" (click)="exportOpen.set(false)"></div>
							<div class="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 z-40 w-56 bg-white border border-camp-sand/60 rounded-camp shadow-camp-xl overflow-hidden animate-scale-in p-1">
								<button type="button" (click)="exportCsv()" class="btn btn-ghost w-full justify-start">Scarica CSV</button>
								<button type="button" (click)="exportReport(false)" class="btn btn-ghost w-full justify-start">Scarica report</button>
								<button type="button" (click)="exportReport(true)" class="btn btn-ghost w-full justify-start">Stampa / PDF</button>
							</div>
						}
					</div>
					<button type="button" (click)="newOperation()" class="btn btn-primary">Nuovo intervento</button>
				</ng-container>
			</app-page-header>

			<!-- KPI -->
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
				@for (k of kpiCards(); track k.key) {
					<button type="button" (click)="toggleStatusFilter(k.key)" class="kpi" [class.is-active]="statusFilter() === k.key" [attr.aria-pressed]="statusFilter() === k.key">
						<p class="kpi-label">{{ k.icon }} {{ k.label }}</p>
						<p class="kpi-value" [class]="k.value ? k.color : 'text-camp-earth'">{{ k.value }}</p>
						@if (k.hint) {
							<p class="kpi-hint">{{ k.hint }}</p>
						}
					</button>
				}
			</div>

			<!-- Filtri -->
			<div class="camp-card card-body space-y-3">
				<div class="flex flex-col md:flex-row md:items-center gap-3">
					<input type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca titolo, prodotto, pianta…" aria-label="Cerca interventi" class="camp-input-sm md:w-80" />
					<div class="segmented max-w-full overflow-x-auto" role="group" aria-label="Periodo">
						@for (p of periods; track p.key) {
							<button type="button" (click)="period.set(p.key)" class="segmented-item flex-1" [class.is-active]="period() === p.key">{{ p.label }}</button>
						}
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="eyebrow mr-1">Stato</span>
					@for (s of statusOptions; track s) {
						<button type="button" (click)="statusFilter.set(s)" class="filter-chip" [class.is-active]="statusFilter() === s">
							{{ s === "all" ? "Tutti" : workMeta[s].icon + " " + workMeta[s].label }}
						</button>
					}
				</div>
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="eyebrow mr-1">Tipo</span>
					@for (t of allTypes; track t) {
						<button type="button" (click)="toggleType(t)" class="filter-chip" [class.is-active]="types().has(t)">
							{{ typeMeta[t].icon }} {{ typeMeta[t].label }}
						</button>
					}
					@if (hasActiveFilters()) {
						<button type="button" (click)="resetFilters()" class="btn btn-ghost btn-sm ml-auto">Azzera filtri</button>
					}
				</div>
			</div>

			@if (ops.isLoading() && !ops.loaded()) {
				<div class="space-y-3">
					@for (i of [1, 2, 3, 4]; track i) {
						<div class="h-20 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
					}
				</div>
			} @else if (!filtered().length) {
				<div class="camp-card empty-state">
					<p class="empty-state-icon">📒</p>
					@if (baseRows().length) {
						<p class="text-muted">Nessun intervento corrisponde ai filtri selezionati.</p>
						<button type="button" (click)="resetFilters()" class="btn btn-secondary btn-sm mt-2">Azzera filtri</button>
					} @else {
						<p class="text-muted">Il registro è vuoto. Programma il primo intervento dalla mappa o da qui.</p>
						<button type="button" (click)="newOperation()" class="btn btn-primary btn-sm mt-2">Nuovo intervento</button>
					}
				</div>
			} @else {
				<div class="space-y-5">
					@for (g of groups(); track g.key) {
						<section class="camp-card overflow-hidden">
							<button
								type="button"
								(click)="toggleGroup(g.key)"
								class="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-camp-sand/40 text-left cursor-pointer"
								[class]="g.key === 'overdue' ? 'bg-camp-amber/10' : 'bg-camp-cream/40'"
								[attr.aria-expanded]="!isCollapsed(g.key)"
							>
								<span class="flex items-center gap-2">
									<span aria-hidden="true">{{ g.icon }}</span>
									<span class="section-title text-lg">{{ g.label }}</span>
									<span class="px-2 py-0.5 rounded-full bg-white border border-camp-sand text-[11px] font-bold text-camp-bark">{{ g.rows.length }}</span>
								</span>
								<span class="text-camp-olive text-xs transition-transform" [class.rotate-180]="!isCollapsed(g.key)">▾</span>
							</button>

							@if (!isCollapsed(g.key)) {
								<!-- Desktop: tabella -->
								<div class="hidden lg:block">
									<table class="data-table">
										<thead>
											<tr>
												<th class="!pl-6">Intervento</th>
												<th>Data</th>
												<th>Piante</th>
												<th>Prodotto / dose</th>
												<th>Stato</th>
												<th class="!pr-6 text-right">Azioni</th>
											</tr>
										</thead>
										<tbody>
											@for (r of visibleRows(g); track r.event.id) {
												<tr>
													<td class="!pl-6 max-w-xs !align-top">
														<div class="flex items-start gap-2.5">
															<span class="text-lg leading-none mt-0.5" [title]="typeMeta[r.event.type].label">{{ typeMeta[r.event.type].icon }}</span>
															<div class="min-w-0">
																<p class="font-semibold text-camp-earth">
																	{{ r.event.title }}
																	@if (r.event.source === "arnaldo") {
																		<span class="ml-1 align-middle"><app-chip label="Arnaldo" icon="✨" tone="accent" /></span>
																	}
																</p>
																<p class="text-[11px] text-camp-olive">{{ typeMeta[r.event.type].label }}</p>
																@if (r.notes) {
																	<p class="text-xs text-camp-bark mt-1 line-clamp-2">{{ excerpt(r.notes) }}</p>
																}
															</div>
														</div>
													</td>
													<td class="whitespace-nowrap !align-top">{{ eventDate(r.event) }}</td>
													<td class="max-w-[12rem] !align-top"><span class="line-clamp-2" [title]="r.plantNames.join(', ')">{{ r.plants }}</span></td>
													<td class="!align-top">
														{{ r.product || "—" }}
														@if (r.dose) {
															<span class="block text-[11px] text-camp-olive">{{ r.dose }}</span>
														}
													</td>
													<td class="!align-top"><app-chip [label]="workMeta[r.status].label" [icon]="workMeta[r.status].icon" [tone]="workMeta[r.status].tone" /></td>
													<td class="!pr-6 !align-top"><div class="flex justify-end gap-1"><ng-container *ngTemplateOutlet="actions; context: { $implicit: r }"></ng-container></div></td>
												</tr>
											}
										</tbody>
									</table>
								</div>

								<!-- Mobile / tablet: card -->
								<ul class="lg:hidden divide-y divide-camp-sand/30">
									@for (r of visibleRows(g); track r.event.id) {
										<li class="px-4 py-3.5 space-y-2">
											<div class="flex items-start justify-between gap-3">
												<div class="flex items-start gap-2.5 min-w-0">
													<span class="text-xl leading-none mt-0.5">{{ typeMeta[r.event.type].icon }}</span>
													<div class="min-w-0">
														<p class="font-semibold text-camp-earth text-sm leading-snug">{{ r.event.title }}</p>
														<p class="text-[11px] text-camp-olive mt-0.5">{{ eventDate(r.event) }}</p>
													</div>
												</div>
												<app-chip [label]="workMeta[r.status].label" [icon]="workMeta[r.status].icon" [tone]="workMeta[r.status].tone" />
											</div>
											<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-camp-bark pl-8">
												<span>🌳 {{ r.plants }}</span>
												@if (r.product || r.dose) {
													<span>🧴 {{ r.product }}{{ r.product && r.dose ? " · " : "" }}{{ r.dose }}</span>
												}
												@if (r.event.source === "arnaldo") {
													<app-chip label="Arnaldo" icon="✨" tone="accent" />
												}
											</div>
											@if (r.notes) {
												<p class="text-xs text-camp-olive pl-8 line-clamp-2">{{ excerpt(r.notes) }}</p>
											}
											<div class="flex flex-wrap gap-1 pl-8"><ng-container *ngTemplateOutlet="actions; context: { $implicit: r }"></ng-container></div>
										</li>
									}
								</ul>

								@if (g.rows.length > visibleRows(g).length) {
									<div class="px-4 py-3 border-t border-camp-sand/30 text-center">
										<button type="button" (click)="pastLimit.set(pastLimit() + pastPage)" class="btn btn-ghost btn-sm">
											Mostra altri ({{ g.rows.length - visibleRows(g).length }})
										</button>
									</div>
								}
							}
						</section>
					}
				</div>
			}

			<ng-template #actions let-r>
				<!-- Mobile: pulsanti con testo; desktop: solo icona -->
				@if (isOpen(r.status)) {
					<button type="button" (click)="setStatus(r.event, 'done')" [disabled]="busyId() === r.event.id" title="Segna come svolta" aria-label="Segna come svolta" class="btn btn-secondary btn-sm row-action text-camp-success"><span class="row-icon" aria-hidden="true">✅</span><span class="row-label">Svolta</span></button>
					@if (r.status !== "in_progress") {
						<button type="button" (click)="setStatus(r.event, 'in_progress')" [disabled]="busyId() === r.event.id" title="Segna in corso" aria-label="Segna in corso" class="btn btn-secondary btn-sm row-action"><span class="row-icon" aria-hidden="true">🔄</span><span class="row-label">In corso</span></button>
					}
					<button type="button" (click)="setStatus(r.event, 'skipped')" [disabled]="busyId() === r.event.id" title="Segna come saltata" aria-label="Segna come saltata" class="btn btn-secondary btn-sm row-action"><span class="row-icon" aria-hidden="true">⏭️</span><span class="row-label">Salta</span></button>
				} @else {
					<button type="button" (click)="setStatus(r.event, 'todo')" [disabled]="busyId() === r.event.id" title="Riapri come da svolgere" aria-label="Riapri come da svolgere" class="btn btn-secondary btn-sm row-action"><span class="row-icon" aria-hidden="true">↩️</span><span class="row-label">Riapri</span></button>
				}
				<button type="button" (click)="editing.set(r.event)" title="Modifica" aria-label="Modifica intervento" class="btn btn-secondary btn-sm row-action"><span class="row-icon" aria-hidden="true">✏️</span><span class="row-label">Modifica</span></button>
				<button type="button" (click)="deleting.set(r.event)" title="Elimina" aria-label="Elimina intervento" class="btn btn-danger-soft btn-sm row-action"><span class="row-icon" aria-hidden="true">🗑️</span><span class="row-label">Elimina</span></button>
			</ng-template>

			@if (creating()) {
				<app-operation-form-dialog (close)="creating.set(false)" />
			}
			@if (editing(); as e) {
				<app-operation-form-dialog [event]="e" [plantIds]="e.plant_ids || []" [types]="e.type === 'harvest' ? allTypes : operationTypes" [defaultType]="e.type" (close)="editing.set(null)" />
			}
			@if (deleting(); as e) {
				<app-confirm-dialog title="Eliminare l'intervento?" [message]="deleteMessage(e)" (confirm)="confirmDelete(e)" (cancel)="deleting.set(null)" />
			}
		</div>
	`,
	styles: [
		`
			/* Azioni di riga: testo su mobile, solo icona (btn-icon) da desktop */
			.row-icon {
				display: none;
			}
			@media (min-width: 1024px) {
				.row-action {
					padding: 0;
					width: 2rem;
					height: 2rem;
				}
				.row-icon {
					display: inline;
				}
				.row-label {
					display: none;
				}
			}
		`
	]
})
export class OperationsLogComponent implements OnInit {
	readonly ops = inject(OperationsStore);
	private farm = inject(FarmStore);
	private toast = inject(ToastService);
	private report = inject(ReportExportService);

	readonly tabs = OPERATIONS_TABS;
	readonly typeMeta = EVENT_TYPE_META;
	readonly workMeta = WORK_STATUS_META;
	readonly allTypes = ALL_TYPES;
	readonly operationTypes = OPERATION_TYPES;
	readonly pastPage = PAST_PAGE;
	readonly statusOptions: StatusFilter[] = ["all", "todo", "in_progress", "overdue", "done", "skipped"];
	readonly periods: { key: PeriodFilter; label: string }[] = [
		{ key: "month", label: "Questo mese" },
		{ key: "3months", label: "3 mesi" },
		{ key: "year", label: "Anno" },
		{ key: "all", label: "Tutto" }
	];
	private readonly year = new Date().getFullYear();

	readonly search = signal("");
	readonly statusFilter = signal<StatusFilter>("all");
	readonly types = signal<Set<EventType>>(new Set(OPERATION_TYPES));
	readonly period = signal<PeriodFilter>("all");
	readonly collapsed = signal<Set<GroupKey>>(new Set(["past"]));
	readonly pastLimit = signal(PAST_PAGE);
	readonly exportOpen = signal(false);
	readonly busyId = signal<string | null>(null);
	readonly creating = signal(false);
	readonly editing = signal<CalendarEvent | null>(null);
	readonly deleting = signal<CalendarEvent | null>(null);

	/** Righe arricchite per i tipi selezionati (base per KPI e filtri). */
	readonly baseRows = computed<LogRow[]>(() => {
		const types = this.types();
		const byId = this.farm.plantsById();
		return this.ops
			.sorted()
			.filter(e => types.has(e.type))
			.map(e => {
				const d = parseOperationDescription(e.description);
				const names = (e.plant_ids || []).map(id => byId.get(id)?.name).filter((n): n is string => !!n);
				const count = e.plant_ids?.length || 0;
				const plants = !count ? "Tutto il terreno" : count <= 3 && names.length === count ? names.join(", ") : `${count} piante`;
				return { event: e, status: this.ops.effectiveStatus(e), product: d.product, dose: d.dose, notes: d.notes, plants, plantNames: names };
			});
	});

	readonly kpis = computed(() => {
		const yearStart = new Date(this.year, 0, 1).getTime();
		let todo = 0;
		let inProgress = 0;
		let overdue = 0;
		let doneYear = 0;
		let skipped = 0;
		for (const r of this.baseRows()) {
			if (r.status === "todo") todo++;
			else if (r.status === "in_progress") inProgress++;
			else if (r.status === "overdue") overdue++;
			else if (r.status === "skipped") skipped++;
			else if (r.status === "done" && new Date(r.event.start).getTime() >= yearStart) doneYear++;
		}
		return { todo, inProgress, overdue, doneYear, skipped };
	});

	readonly kpiCards = computed(() => {
		const k = this.kpis();
		return [
			{ key: "todo" as StatusFilter, label: "Da svolgere", icon: "⏳", value: k.todo, color: "text-camp-earth", hint: k.inProgress ? `+ ${k.inProgress} in corso` : "" },
			{ key: "overdue" as StatusFilter, label: "In ritardo", icon: "⚠️", value: k.overdue, color: "text-camp-amber", hint: "" },
			{ key: "done" as StatusFilter, label: `Svolti nel ${this.year}`, icon: "✅", value: k.doneYear, color: "text-camp-success", hint: "" },
			{ key: "skipped" as StatusFilter, label: "Saltati", icon: "⏭️", value: k.skipped, color: "text-camp-error", hint: "" }
		];
	});

	readonly filtered = computed(() => {
		const q = this.search().toLowerCase().trim();
		const status = this.statusFilter();
		const range = this.periodRange();
		return this.baseRows().filter(r => {
			if (status !== "all" && r.status !== status) return false;
			if (range) {
				const t = new Date(r.event.start).getTime();
				if (t < range.from || t > range.to) return false;
			}
			if (q && ![r.event.title, r.product, r.dose, r.notes, ...r.plantNames].some(v => (v || "").toLowerCase().includes(q))) return false;
			return true;
		});
	});

	readonly groups = computed<LogGroup[]>(() => {
		const todayKey = toLocalDateKey(new Date());
		const weekEnd = toLocalDateKey(new Date(Date.now() + 7 * DAY_MS));
		const buckets: Record<GroupKey, LogRow[]> = { overdue: [], today: [], week: [], later: [], past: [] };
		for (const r of this.filtered()) {
			const startKey = toLocalDateKey(r.event.start);
			const endKey = toLocalDateKey(r.event.end || r.event.start);
			if (r.status === "overdue") buckets.overdue.push(r);
			else if ((startKey <= todayKey && endKey >= todayKey) || (r.status === "in_progress" && startKey < todayKey)) buckets.today.push(r);
			else if (startKey > todayKey && startKey <= weekEnd) buckets.week.push(r);
			else if (startKey > weekEnd) buckets.later.push(r);
			else buckets.past.push(r);
		}
		const asc = (a: LogRow, b: LogRow) => a.event.start.localeCompare(b.event.start);
		buckets.overdue.sort(asc);
		buckets.today.sort((a, b) => urgencyRank(a.status) - urgencyRank(b.status) || asc(a, b));
		buckets.week.sort(asc);
		buckets.later.sort(asc);
		// "past" resta in ordine decrescente (già ordinato dallo store)
		const meta: { key: GroupKey; label: string; icon: string }[] = [
			{ key: "overdue", label: "In ritardo", icon: "⚠️" },
			{ key: "today", label: "Oggi", icon: "📍" },
			{ key: "week", label: "Prossimi 7 giorni", icon: "🗓️" },
			{ key: "later", label: "Più avanti", icon: "🔭" },
			{ key: "past", label: "Passati", icon: "📚" }
		];
		return meta.map(m => ({ ...m, rows: buckets[m.key] })).filter(g => g.rows.length);
	});

	readonly hasActiveFilters = computed(() => !!this.search().trim() || this.statusFilter() !== "all" || this.period() !== "all" || this.types().size !== OPERATION_TYPES.length || this.types().has("harvest"));

	ngOnInit() {
		this.farm.ensureLoaded();
		this.ops.load();
	}

	private periodRange(): { from: number; to: number } | null {
		const now = new Date();
		switch (this.period()) {
			case "month":
				return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1 };
			case "3months":
				return { from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).getTime(), to: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate() + 1).getTime() - 1 };
			case "year":
				return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: new Date(now.getFullYear() + 1, 0, 1).getTime() - 1 };
			default:
				return null;
		}
	}

	periodLabel(): string {
		return this.periods.find(p => p.key === this.period())?.label || "Tutto";
	}

	toggleType(t: EventType) {
		const next = new Set(this.types());
		next.has(t) ? next.delete(t) : next.add(t);
		this.types.set(next.size ? next : new Set(OPERATION_TYPES));
	}

	toggleStatusFilter(s: StatusFilter) {
		this.statusFilter.set(this.statusFilter() === s ? "all" : s);
	}

	resetFilters() {
		this.search.set("");
		this.statusFilter.set("all");
		this.period.set("all");
		this.types.set(new Set(OPERATION_TYPES));
	}

	toggleGroup(key: GroupKey) {
		const next = new Set(this.collapsed());
		next.has(key) ? next.delete(key) : next.add(key);
		this.collapsed.set(next);
	}

	isCollapsed(key: GroupKey): boolean {
		return this.collapsed().has(key);
	}

	visibleRows(g: LogGroup): LogRow[] {
		return g.key === "past" ? g.rows.slice(0, this.pastLimit()) : g.rows;
	}

	isOpen(status: EffectiveWorkStatus): boolean {
		return isOpenStatus(status);
	}

	newOperation() {
		this.creating.set(true);
	}

	async setStatus(e: CalendarEvent, status: WorkStatus) {
		if (!e.id) return;
		this.busyId.set(e.id);
		try {
			await this.ops.setWorkStatus(e.id, status);
			// Allinea l'ultimo trattamento delle piante, come fa il dialog di modifica
			if (status === "done" && e.type === "treatment" && e.plant_ids?.length) {
				const { product } = parseOperationDescription(e.description);
				await this.farm.updatePlants(e.plant_ids, { last_treatment_type: product || e.title, last_treatment_at: e.start });
			}
			this.toast.success(`«${e.title}»: ${WORK_STATUS_META[status].label.toLowerCase()}`);
		} catch (err) {
			console.error(err);
			this.toast.error("Impossibile aggiornare lo stato");
		} finally {
			this.busyId.set(null);
		}
	}

	async confirmDelete(e: CalendarEvent) {
		this.deleting.set(null);
		if (!e.id) return;
		try {
			await this.ops.remove(e.id);
			this.toast.success("Intervento eliminato");
		} catch (err) {
			console.error(err);
			this.toast.error("Impossibile eliminare l'intervento");
		}
	}

	exportCsv() {
		this.exportOpen.set(false);
		const rows = this.filtered();
		if (!rows.length) {
			this.toast.info("Nessun intervento da esportare");
			return;
		}
		const header = ["Data", "Ora", "Tipo", "Titolo", "Stato", "Piante", "Prodotto", "Dose", "Note", "Origine"];
		const lines = rows.map(r => {
			const d = new Date(r.event.start);
			return [
				toLocalDateKey(d),
				r.event.all_day ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
				EVENT_TYPE_META[r.event.type]?.label || r.event.type,
				r.event.title,
				WORK_STATUS_META[r.status].label,
				r.plantNames.length ? r.plantNames.join(", ") : r.plants,
				r.product,
				r.dose,
				r.notes,
				r.event.source === "arnaldo" ? "Arnaldo" : "Utente"
			];
		});
		this.report.downloadCsv(header, lines, `registro-interventi-${toLocalDateKey(new Date())}`);
		this.toast.success(`Esportati ${rows.length} interventi`);
	}

	exportReport(print: boolean) {
		this.exportOpen.set(false);
		const rows = this.filtered();
		if (!rows.length) {
			this.toast.info("Nessun intervento da esportare");
			return;
		}
		const count = (s: EffectiveWorkStatus) => rows.filter(r => r.status === s).length;
		const kpis = [
			{ label: "Interventi", value: rows.length },
			{ label: "Da svolgere", value: count("todo") + count("in_progress") },
			{ label: "In ritardo", value: count("overdue") },
			{ label: "Svolti", value: count("done") },
			{ label: "Saltati", value: count("skipped") }
		];
		const byType = OPERATION_TYPES.concat("harvest")
			.map(t => ({ t, n: rows.filter(r => r.event.type === t).length }))
			.filter(x => x.n)
			.map(x => `- **${EVENT_TYPE_META[x.t].label}**: ${x.n}`)
			.join("\n");
		const table = [
			"| Data | Tipo | Intervento | Piante | Prodotto / dose | Stato |",
			"|---|---|---|---|---|---|",
			...rows.map(r =>
				[formatEventDate(r.event, true), EVENT_TYPE_META[r.event.type]?.label, r.event.title, r.plants, [r.product, r.dose].filter(Boolean).join(" · "), WORK_STATUS_META[r.status].label].map(mdCell).join(" | ")
			).map(line => `| ${line} |`)
		].join("\n");
		const filtersDesc = [
			`Periodo: ${this.periodLabel()}`,
			`Stato: ${this.statusFilter() === "all" ? "tutti" : WORK_STATUS_META[this.statusFilter() as EffectiveWorkStatus].label}`,
			`Tipi: ${[...this.types()].map(t => EVENT_TYPE_META[t].label).join(", ")}`
		].join(" · ");
		const doc = {
			title: "Registro interventi",
			subtitle: `${this.farm.farm()?.name || "Il mio terreno"} · ${formatDateIt(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" })} · ${filtersDesc}`,
			sections: [
				{ heading: "Riepilogo", html: `<div class="kpis">${kpis.map(k => `<div class="kpi"><span>${escapeHtml(k.label)}</span><b>${k.value}</b></div>`).join("")}</div>` },
				{ heading: "Per tipo", markdown: byType },
				{ heading: "Dettaglio interventi", markdown: table }
			]
		};
		if (print) this.report.print(doc);
		else this.report.download(doc, `registro-interventi-${toLocalDateKey(new Date())}`);
	}

	deleteMessage(e: CalendarEvent): string {
		return `L'intervento «${e.title}» verrà rimosso dal registro e dal calendario.`;
	}

	excerpt(text: string): string {
		const t = text.replace(/\s+/g, " ").trim();
		return t.length > 110 ? t.slice(0, 107) + "…" : t;
	}

	eventDate = (e: CalendarEvent) => formatEventDate(e);
}
