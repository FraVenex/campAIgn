import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgApexchartsModule } from "ng-apexcharts";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { ConfirmDialogComponent } from "../../shared/components/confirm-dialog/confirm-dialog.component";
import { ExpenseFormDialogComponent } from "./expense-form-dialog.component";
import { Expense, ExpensesService } from "../../core/services/expenses.service";
import { HarvestService } from "../../core/services/harvest.service";
import { FarmStore } from "../../core/services/farm-store.service";
import { ReportDocument, ReportExportService, escapeHtml } from "../../core/services/report-export.service";
import { ToastService } from "../../core/services/toast.service";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_META, ExpenseCategory, formatCurrency, formatDateIt } from "../../core/constants/domain";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const FONT = "Inter, system-ui, sans-serif";

@Component({
	selector: "app-accounting",
	standalone: true,
	imports: [FormsModule, NgApexchartsModule, PageHeaderComponent, ConfirmDialogComponent, ExpenseFormDialogComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Contabilità" title="Spese del terreno" description="Tutto quello che spendi per gestire il terreno: prodotti, attrezzi, manutenzioni, manodopera e servizi.">
				<ng-container actions>
					<button type="button" (click)="openNew()" class="btn btn-primary">Nuova spesa</button>
				</ng-container>
			</app-page-header>

			@if (!expenses.loaded()) {
				<div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
					@for (i of [1, 2, 3, 4, 5, 6]; track i) {
						<div class="h-24 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
					}
				</div>
				<div class="h-72 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
			} @else {
				<!-- KPI -->
				<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
					<div class="kpi">
						<p class="kpi-label">Totale {{ year() }}</p>
						<p class="kpi-value">{{ money(kpis().total) }}</p>
						<p class="kpi-hint">{{ yearExpenses().length }} {{ yearExpenses().length === 1 ? "spesa" : "spese" }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Media mensile</p>
						<p class="kpi-value">{{ money(kpis().monthlyAvg) }}</p>
						<p class="kpi-hint">su {{ kpis().months }} {{ kpis().months === 1 ? "mese" : "mesi" }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Voce principale</p>
						@if (kpis().top; as top) {
							<p class="text-base font-semibold text-camp-earth mt-1 truncate" [title]="meta[top.category].label">{{ meta[top.category].icon }} {{ shortLabel(top.category) }}</p>
							<p class="kpi-hint">{{ money(top.total) }} · {{ top.pct }}%</p>
						} @else {
							<p class="kpi-value text-camp-olive">—</p>
						}
					</div>
					<div class="kpi">
						<p class="kpi-label">Costo per pianta</p>
						<p class="kpi-value">{{ kpis().perPlant !== null ? money(kpis().perPlant) : "—" }}</p>
						<p class="kpi-hint">{{ plantCount() }} {{ plantCount() === 1 ? "pianta" : "piante" }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Costo per litro</p>
						<p class="kpi-value">{{ kpis().perLiter !== null ? money(kpis().perLiter) : "—" }}</p>
						<p class="kpi-hint">{{ kpis().liters ? kpis().liters + " L di olio" : "Nessuna raccolta" }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Rispetto al {{ year() - 1 }}</p>
						@if (kpis().delta !== null) {
							<p class="kpi-value" [class.text-camp-error]="kpis().delta! > 0" [class.text-camp-success]="kpis().delta! <= 0">{{ kpis().delta! > 0 ? "+" : "" }}{{ kpis().delta }}%</p>
						} @else {
							<p class="kpi-value text-camp-olive">—</p>
						}
						<p class="kpi-hint">{{ money(kpis().previous) }} nel {{ year() - 1 }}</p>
					</div>
				</div>

				<!-- Filtri -->
				<section class="camp-card card-body space-y-3">
					<div class="flex flex-col lg:flex-row lg:items-center gap-3">
						<div class="flex items-center gap-2">
							<label for="acc-year" class="eyebrow">Anno</label>
							<select id="acc-year" [ngModel]="year()" (ngModelChange)="year.set(+$event)" class="camp-input-sm w-auto cursor-pointer">
								@for (y of years(); track y) {
									<option [value]="y">{{ y }}</option>
								}
							</select>
						</div>
						<input type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca descrizione, fornitore, note…" aria-label="Cerca spese" class="camp-input-sm lg:w-72" />
						<div class="flex flex-wrap gap-2 lg:ml-auto">
							<button type="button" (click)="exportCsv()" class="btn btn-secondary btn-sm">Esporta CSV</button>
							<button type="button" (click)="downloadReport()" class="btn btn-secondary btn-sm">Scarica report</button>
							<button type="button" (click)="printReport()" class="btn btn-secondary btn-sm">Stampa / PDF</button>
						</div>
					</div>
					<div class="flex flex-wrap gap-1.5">
						<button type="button" (click)="categoryFilter.set(emptySet())" class="filter-chip" [class.is-active]="!categoryFilter().size">Tutte</button>
						@for (c of categories; track c) {
							<button type="button" (click)="toggleCategory(c)" class="filter-chip" [class.is-active]="categoryFilter().has(c)">
								<span>{{ meta[c].icon }}</span>
								<span>{{ shortLabel(c) }}</span>
							</button>
						}
					</div>
				</section>

				<!-- Grafici -->
				<div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
					<section class="camp-card card-body lg:col-span-2">
						<div class="section-head">
							<div>
								<p class="eyebrow">Spese {{ year() }}{{ categoryFilter().size || search() ? " (filtrate)" : "" }}</p>
								<h2 class="section-title">Ripartizione per categoria</h2>
							</div>
						</div>
						@if (byCategory().length) {
							<apx-chart
								[chart]="donut().chart"
								[series]="donut().series"
								[labels]="donut().labels"
								[colors]="donut().colors"
								[legend]="donut().legend"
								[dataLabels]="donut().dataLabels"
								[plotOptions]="donut().plotOptions"
								[tooltip]="donut().tooltip"
								[stroke]="donut().stroke"
							/>
						} @else {
							<div class="empty-state h-64 justify-center">
								<span class="empty-state-icon">🍩</span>
								<p class="text-muted">Nessuna spesa da mostrare</p>
							</div>
						}
					</section>
					<section class="camp-card card-body lg:col-span-3">
						<div class="section-head">
							<div>
								<p class="eyebrow">Spese per mese nel {{ year() }}{{ categoryFilter().size || search() ? " (filtrate)" : "" }}</p>
								<h2 class="section-title">Andamento mensile</h2>
							</div>
						</div>
						<apx-chart
							[chart]="monthly().chart"
							[series]="monthly().series"
							[xaxis]="monthly().xaxis"
							[yaxis]="monthly().yaxis"
							[colors]="monthly().colors"
							[dataLabels]="monthly().dataLabels"
							[plotOptions]="monthly().plotOptions"
							[grid]="monthly().grid"
							[tooltip]="monthly().tooltip"
						/>
					</section>
				</div>

				<!-- Elenco spese -->
				<section class="camp-card card-body">
					<div class="section-head">
						<div>
							<p class="eyebrow">Registro</p>
							<h2 class="section-title">Spese {{ year() }}</h2>
						</div>
						<p class="text-muted">{{ filtered().length }} {{ filtered().length === 1 ? "voce" : "voci" }} · <strong class="text-camp-earth">{{ money(filteredTotal()) }}</strong></p>
					</div>

					@if (!filtered().length) {
						<div class="empty-state">
							<span class="empty-state-icon">💶</span>
							<p class="text-muted">{{ yearExpenses().length ? "Nessuna spesa corrisponde ai filtri." : "Nessuna spesa registrata per il " + year() + "." }}</p>
							@if (!yearExpenses().length) {
								<button type="button" (click)="openNew()" class="btn btn-primary btn-sm mt-2">Registra la prima spesa</button>
							}
						</div>
					} @else {
						<!-- Tabella desktop -->
						<div class="hidden md:block overflow-x-auto">
							<table class="data-table">
								<thead>
									<tr>
										<th>Data</th>
										<th>Categoria</th>
										<th>Descrizione</th>
										<th>Fornitore</th>
										<th class="text-right">Importo</th>
										<th><span class="sr-only">Azioni</span></th>
									</tr>
								</thead>
								<tbody>
									@for (e of filtered(); track e.id) {
										<tr>
											<td class="whitespace-nowrap text-camp-bark">{{ date(e.date) }}</td>
											<td>
												<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap" [style.borderColor]="metaOf(e.category).color + '55'" [style.color]="metaOf(e.category).color" [style.backgroundColor]="metaOf(e.category).color + '14'">
													{{ metaOf(e.category).icon }} {{ shortLabel(e.category) }}
												</span>
											</td>
											<td>
												<p class="font-medium">{{ e.description }}</p>
												@if (e.notes) {
													<p class="text-xs text-camp-olive line-clamp-1">{{ e.notes }}</p>
												}
											</td>
											<td class="text-camp-bark">{{ e.supplier || "—" }}</td>
											<td class="text-right font-semibold whitespace-nowrap">{{ money(e.amount) }}</td>
											<td class="text-right whitespace-nowrap">
												<button type="button" (click)="openEdit(e)" class="btn btn-ghost btn-icon btn-sm" title="Modifica" aria-label="Modifica spesa">✏️</button>
												<button type="button" (click)="deleting.set(e)" class="btn btn-ghost btn-icon btn-sm" title="Elimina" aria-label="Elimina spesa">🗑️</button>
											</td>
										</tr>
									}
								</tbody>
							</table>
						</div>

						<!-- Card mobile -->
						<ul class="md:hidden divide-y divide-camp-sand/30 -mx-4 sm:-mx-6">
							@for (e of filtered(); track e.id) {
								<li class="px-4 sm:px-6 py-4 flex gap-3">
									<div class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg" [style.backgroundColor]="metaOf(e.category).color + '1F'">{{ metaOf(e.category).icon }}</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2">
											<p class="font-medium text-camp-earth text-sm leading-snug">{{ e.description }}</p>
											<p class="font-semibold text-camp-earth text-sm whitespace-nowrap">{{ money(e.amount) }}</p>
										</div>
										<p class="text-xs text-camp-olive mt-0.5">{{ date(e.date) }} · {{ shortLabel(e.category) }}{{ e.supplier ? " · " + e.supplier : "" }}</p>
										@if (e.notes) {
											<p class="text-xs text-camp-bark mt-1 line-clamp-2">{{ e.notes }}</p>
										}
										<div class="flex gap-2 mt-2">
											<button type="button" (click)="openEdit(e)" class="btn btn-secondary btn-sm">Modifica</button>
											<button type="button" (click)="deleting.set(e)" class="btn btn-danger-soft btn-sm">Elimina</button>
										</div>
									</div>
								</li>
							}
						</ul>
					}
				</section>
			}

			@if (editing(); as state) {
				<app-expense-form-dialog [expense]="state.expense" (close)="editing.set(null)" (saved)="onSaved($event)" />
			}
			@if (deleting(); as e) {
				<app-confirm-dialog title="Eliminare la spesa?" [message]="'Stai per eliminare «' + e.description + '» (' + money(e.amount) + '). L\\'operazione non si può annullare.'" (cancel)="deleting.set(null)" (confirm)="confirmDelete(e)" />
			}
		</div>
	`
})
export class AccountingComponent implements OnInit {
	readonly expenses = inject(ExpensesService);
	private harvests = inject(HarvestService);
	private farmStore = inject(FarmStore);
	private reports = inject(ReportExportService);
	private toast = inject(ToastService);

	readonly categories = EXPENSE_CATEGORIES;
	readonly meta = EXPENSE_CATEGORY_META;

	readonly year = signal(new Date().getFullYear());
	readonly search = signal("");
	readonly categoryFilter = signal<Set<ExpenseCategory>>(new Set());
	readonly editing = signal<{ expense: Expense | null } | null>(null);
	readonly deleting = signal<Expense | null>(null);

	readonly plantCount = computed(() => this.farmStore.plants().length || this.farmStore.farm()?.plants_count || 0);

	readonly years = computed(() => {
		const set = new Set<number>([new Date().getFullYear(), this.year()]);
		for (const e of this.expenses.expenses()) {
			const y = new Date(e.date).getFullYear();
			if (!isNaN(y)) set.add(y);
		}
		return [...set].sort((a, b) => b - a);
	});

	readonly yearExpenses = computed(() => this.expenses.expenses().filter(e => new Date(e.date).getFullYear() === this.year()));

	readonly filtered = computed(() => {
		const q = this.search().toLowerCase().trim();
		const cats = this.categoryFilter();
		return this.yearExpenses()
			.filter(e => !cats.size || cats.has(e.category))
			.filter(e => !q || [e.description, e.supplier, e.notes, EXPENSE_CATEGORY_META[e.category]?.label].some(v => (v || "").toLowerCase().includes(q)))
			.sort((a, b) => b.date.localeCompare(a.date));
	});

	readonly filteredTotal = computed(() => sum(this.filtered()));

	readonly byCategory = computed(() =>
		EXPENSE_CATEGORIES.map(category => ({ category, total: sum(this.filtered().filter(e => e.category === category)) }))
			.filter(c => c.total > 0)
			.sort((a, b) => b.total - a.total)
	);

	readonly byMonth = computed(() => {
		const totals = Array(12).fill(0) as number[];
		for (const e of this.filtered()) {
			const m = new Date(e.date).getMonth();
			if (!isNaN(m)) totals[m] += Number(e.amount) || 0;
		}
		return totals.map(v => Math.round(v * 100) / 100);
	});

	readonly kpis = computed(() => {
		const year = this.year();
		const list = this.yearExpenses();
		const total = sum(list);
		const now = new Date();
		const months = year === now.getFullYear() ? now.getMonth() + 1 : year > now.getFullYear() ? 1 : 12;
		const cats = EXPENSE_CATEGORIES.map(category => ({ category, total: sum(list.filter(e => e.category === category)) })).sort((a, b) => b.total - a.total);
		const top = cats[0]?.total > 0 ? { ...cats[0], pct: Math.round((cats[0].total / total) * 100) } : null;
		const plants = this.plantCount();
		const liters = this.harvests
			.harvests()
			.filter(h => new Date(h.date).getFullYear() === year)
			.reduce((s, h) => s + (Number(h.liters) || 0), 0);
		const previous = this.expenses.totalForYear(year - 1);
		return {
			total,
			months,
			monthlyAvg: total / months,
			top,
			perPlant: plants ? total / plants : null,
			liters: Math.round(liters * 10) / 10,
			perLiter: liters > 0 ? total / liters : null,
			previous,
			delta: previous > 0 ? Math.round(((total - previous) / previous) * 1000) / 10 : null
		};
	});

	readonly donut = computed(() => {
		const data = this.byCategory();
		return {
			chart: { type: "donut" as const, height: 300, fontFamily: FONT, toolbar: { show: false } },
			series: data.map(d => Math.round(d.total * 100) / 100),
			labels: data.map(d => this.shortLabel(d.category)),
			colors: data.map(d => EXPENSE_CATEGORY_META[d.category].color),
			legend: { position: "bottom" as const, fontSize: "12px", labels: { colors: "#5C534A" } },
			dataLabels: { enabled: true, formatter: (v: number) => `${Math.round(v)}%`, dropShadow: { enabled: false } },
			stroke: { width: 2, colors: ["#fff"] },
			plotOptions: {
				pie: {
					donut: {
						size: "62%",
						labels: {
							show: true,
							value: { formatter: (v: string) => formatCurrency(Number(v)) },
							total: { show: true, label: "Totale", color: "#A5A58D", formatter: (w: any) => formatCurrency(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }
						}
					}
				}
			},
			tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
		};
	});

	readonly monthly = computed(() => ({
		chart: { type: "bar" as const, height: 300, fontFamily: FONT, toolbar: { show: false } },
		series: [{ name: "Spese", data: this.byMonth() }],
		xaxis: { categories: MONTHS, labels: { style: { colors: "#A5A58D" } }, axisBorder: { show: false }, axisTicks: { show: false } },
		yaxis: { labels: { style: { colors: "#A5A58D" }, formatter: (v: number) => `${Math.round(v).toLocaleString("it-IT")} €` } },
		colors: ["#6B705C"],
		dataLabels: { enabled: false },
		plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
		grid: { borderColor: "#E8E4D9", strokeDashArray: 4 },
		tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
	}));

	ngOnInit() {
		this.expenses.load();
		this.harvests.load();
		this.farmStore.ensureLoaded();
	}

	emptySet(): Set<ExpenseCategory> {
		return new Set();
	}

	toggleCategory(c: ExpenseCategory) {
		const next = new Set(this.categoryFilter());
		next.has(c) ? next.delete(c) : next.add(c);
		this.categoryFilter.set(next);
	}

	openNew() {
		this.editing.set({ expense: null });
	}

	openEdit(e: Expense) {
		this.editing.set({ expense: e });
	}

	onSaved(e: Expense) {
		const y = new Date(e.date).getFullYear();
		if (!isNaN(y) && y !== this.year()) this.year.set(y);
	}

	async confirmDelete(e: Expense) {
		this.deleting.set(null);
		try {
			await this.expenses.remove(e.id!);
			this.toast.success("Spesa eliminata");
		} catch (err) {
			console.error("[Accounting]", err);
			this.toast.error("Impossibile eliminare la spesa");
		}
	}

	exportCsv() {
		const rows = this.filtered();
		if (!rows.length) {
			this.toast.info("Nessuna spesa da esportare");
			return;
		}
		const header = ["Data", "Categoria", "Descrizione", "Fornitore", "Importo (EUR)", "Note"];
		this.reports.downloadCsv(
			header,
			rows.map(e => [e.date.slice(0, 10), EXPENSE_CATEGORY_META[e.category]?.label || e.category, e.description, e.supplier || "", Number(e.amount).toFixed(2).replace(".", ","), e.notes || ""]),
			`spese-${this.year()}`
		);
		this.toast.success("CSV esportato");
	}

	downloadReport() {
		this.reports.download(this.buildReport(), `contabilita-${this.year()}`);
	}

	printReport() {
		this.reports.print(this.buildReport());
	}

	private buildReport(): ReportDocument {
		const k = this.kpis();
		const year = this.year();
		const filtered = this.categoryFilter().size > 0 || !!this.search().trim();
		const kpi = (label: string, value: string) => `<div class="kpi"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
		const kpiHtml = `<div class="kpis">${[
			kpi(`Totale ${year}`, formatCurrency(k.total)),
			kpi("Media mensile", formatCurrency(k.monthlyAvg)),
			kpi("Costo per pianta", k.perPlant !== null ? formatCurrency(k.perPlant) : "—"),
			kpi("Costo per litro d'olio", k.perLiter !== null ? formatCurrency(k.perLiter) : "—"),
			kpi(`Rispetto al ${year - 1}`, k.delta !== null ? `${k.delta > 0 ? "+" : ""}${k.delta}%` : "—")
		].join("")}</div>`;
		const cats = this.byCategory();
		const catTotal = sum(this.filtered());
		const catTable = ["| Categoria | Totale | Quota |", "|---|---|---|", ...cats.map(c => `| ${md(EXPENSE_CATEGORY_META[c.category].label)} | ${formatCurrency(c.total)} | ${catTotal ? Math.round((c.total / catTotal) * 100) : 0}% |`)].join("\n");
		const list = ["| Data | Categoria | Descrizione | Fornitore | Importo |", "|---|---|---|---|---|", ...this.filtered().map(e => `| ${formatDateIt(e.date)} | ${md(this.shortLabel(e.category))} | ${md(e.description)} | ${md(e.supplier || "—")} | ${formatCurrency(e.amount)} |`)].join("\n");
		const month = new Date().getMonth();
		return {
			title: `Contabilità ${year}`,
			subtitle: `${this.farmStore.farm()?.name || "Il mio terreno"}${filtered ? " · elenco filtrato" : ""}`,
			sections: [
				{ heading: "Indicatori", html: kpiHtml },
				{ heading: "Spese per categoria", markdown: cats.length ? catTable : "Nessuna spesa registrata." },
				{ heading: "Andamento mensile", html: this.reports.barChartSvg(this.byMonth().map((v, i) => ({ label: MONTHS[i], value: Math.round(v), highlight: year === new Date().getFullYear() && i === month })), " €") },
				{ heading: `Registro spese (${this.filtered().length})`, markdown: this.filtered().length ? list : "Nessuna spesa." }
			]
		};
	}

	shortLabel(c: ExpenseCategory): string {
		return (EXPENSE_CATEGORY_META[c]?.label || c).replace(/\s*\(.*\)$/, "");
	}

	metaOf(c: ExpenseCategory) {
		return EXPENSE_CATEGORY_META[c] || EXPENSE_CATEGORY_META.other;
	}

	money = (v: number | null | undefined) => formatCurrency(v);
	date = (v?: string | null) => formatDateIt(v);
}

function sum(list: Expense[]): number {
	return list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

function md(text: string): string {
	return String(text).replace(/\|/g, "/").replace(/\r?\n/g, " ");
}
