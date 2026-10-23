import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { Harvest, HarvestService, OIL_DENSITY } from "../../../core/services/harvest.service";
import { ExpensesService } from "../../../core/services/expenses.service";
import { ReportExportService } from "../../../core/services/report-export.service";
import { ToastService } from "../../../core/services/toast.service";
import { HARVEST_TABS } from "../../../core/constants/navigation";
import { formatDateIt } from "../../../core/constants/domain";
import { HarvestFormDialogComponent, HarvestPrefill } from "./harvest-form-dialog.component";
import { HarvestReportDialogComponent } from "./harvest-report-dialog.component";
import { GRADE_META, buildHarvestReportDocument, fmtEuro, fmtNum, reportFileName } from "./harvest-report";

@Component({
	selector: "app-harvest-archive",
	standalone: true,
	imports: [PageHeaderComponent, ChipComponent, ConfirmDialogComponent, HarvestFormDialogComponent, HarvestReportDialogComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Raccolta" title="Archivio raccolta" description="Tutte le raccolte registrate, con report automatico di bontà del raccolto e confronto tra gli anni." [tabs]="tabs">
				<ng-container actions>
					<button type="button" (click)="openAdd()" class="btn btn-primary">Aggiungi raccolta</button>
				</ng-container>
			</app-page-header>

			<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div class="kpi">
					<p class="kpi-label">Litri {{ currentYear }}</p>
					<p class="kpi-value">{{ fmtNum(summary().litersThisYear) }} L</p>
					@if (summary().litersLastYear) {
						<p class="kpi-hint">{{ fmtNum(summary().litersLastYear) }} L nel {{ currentYear - 1 }}</p>
					}
				</div>
				<div class="kpi">
					<p class="kpi-label">Resa media</p>
					<p class="kpi-value text-camp-sage">{{ summary().avgYield !== null ? fmtNum(summary().avgYield) + "%" : "—" }}</p>
					<p class="kpi-hint">media Italia 13-17%</p>
				</div>
				<div class="kpi">
					<p class="kpi-label">Quintali totali</p>
					<p class="kpi-value">{{ fmtNum(summary().totalQuintals) }} q</p>
					<p class="kpi-hint">{{ harvests().length }} {{ harvests().length === 1 ? "raccolta" : "raccolte" }}</p>
				</div>
				<div class="kpi">
					<p class="kpi-label">Anno migliore</p>
					<p class="kpi-value text-camp-success">{{ summary().bestYear?.year ?? "—" }}</p>
					@if (summary().bestYear; as b) {
						<p class="kpi-hint">{{ fmtNum(b.liters) }} L di olio</p>
					}
				</div>
			</div>

			@if (!service.loaded()) {
				<div class="h-64 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
			} @else if (!harvests().length) {
				<div class="camp-card card-body">
					<div class="empty-state">
						<span class="empty-state-icon">🫒</span>
						<p class="section-title">Nessuna raccolta registrata</p>
						<p class="text-muted max-w-md">Registra quintali, litri e costi: il report di bontà del raccolto viene generato in automatico.</p>
						<button type="button" (click)="openAdd()" class="btn btn-primary btn-sm mt-2">Aggiungi raccolta</button>
					</div>
				</div>
			} @else {
				<!-- Desktop: tabella -->
				<section class="camp-card card-body hidden md:block">
					<div class="section-head">
						<div>
							<p class="eyebrow">Archivio</p>
							<h2 class="section-title">Raccolte registrate</h2>
						</div>
					</div>
					<div class="overflow-x-auto">
						<table class="data-table">
							<thead>
								<tr>
									<th>Data</th>
									<th class="text-right">Quintali</th>
									<th class="text-right">Litri</th>
									<th class="text-right">Costo</th>
									<th class="text-right">Resa</th>
									<th class="text-right">€/L</th>
									<th>Voto</th>
									<th class="text-right">Azioni</th>
								</tr>
							</thead>
							<tbody>
								@for (h of harvests(); track h.id) {
									<tr>
										<td>
											<p class="font-semibold">{{ formatDate(h.date) }}</p>
											@if (h.notes) {
												<p class="text-xs text-camp-olive truncate max-w-[220px]" [title]="h.notes">{{ h.notes }}</p>
											}
										</td>
										<td class="text-right">{{ fmtNum(h.quintals) }} q</td>
										<td class="text-right">{{ fmtNum(h.liters) }} L</td>
										<td class="text-right">{{ fmtEuro(h.cost) }}</td>
										<td class="text-right">{{ fmtNum(yieldOf(h)) }}%</td>
										<td class="text-right">{{ h.liters ? fmtEuro(h.cost / h.liters) : "—" }}</td>
										<td>
											@if (h.report; as r) {
												<button type="button" (click)="reportFor.set(h)" class="cursor-pointer" title="Apri report" aria-label="Apri report">
													<app-chip [label]="r.grade + ' · ' + r.score" [icon]="grade(h).icon" [tone]="grade(h).tone" />
												</button>
											} @else {
												<span class="text-xs text-camp-olive">—</span>
											}
										</td>
										<td>
											<div class="flex justify-end gap-1">
												<button type="button" (click)="reportFor.set(h)" title="Vedi report" aria-label="Vedi report" class="btn btn-ghost btn-icon btn-sm">📊</button>
												<button type="button" (click)="download(h)" title="Scarica report" aria-label="Scarica report" class="btn btn-ghost btn-icon btn-sm">⬇️</button>
												<button type="button" (click)="editing.set(h)" title="Modifica" aria-label="Modifica" class="btn btn-ghost btn-icon btn-sm">✏️</button>
												<button type="button" (click)="deleting.set(h)" title="Elimina" aria-label="Elimina" class="btn btn-ghost btn-icon btn-sm hover:bg-camp-error-light">🗑️</button>
											</div>
										</td>
									</tr>
								}
							</tbody>
						</table>
					</div>
				</section>

				<!-- Mobile: card -->
				<div class="md:hidden space-y-3">
					@for (h of harvests(); track h.id) {
						<div class="camp-card card-body">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="section-title leading-tight">{{ formatDate(h.date) }}</p>
									<p class="text-xs text-camp-olive mt-0.5">{{ fmtNum(h.quintals) }} q · {{ fmtNum(h.liters) }} L</p>
								</div>
								@if (h.report; as r) {
									<app-chip [label]="r.grade + ' · ' + r.score" [icon]="grade(h).icon" [tone]="grade(h).tone" />
								}
							</div>
							<div class="grid grid-cols-3 gap-2 mt-3 text-center">
								<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 py-2">
									<p class="kpi-label">Resa</p>
									<p class="text-sm font-semibold text-camp-earth">{{ fmtNum(yieldOf(h)) }}%</p>
								</div>
								<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 py-2">
									<p class="kpi-label">Costo</p>
									<p class="text-sm font-semibold text-camp-earth">{{ fmtEuro(h.cost) }}</p>
								</div>
								<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 py-2">
									<p class="kpi-label">€/L</p>
									<p class="text-sm font-semibold text-camp-earth">{{ h.liters ? fmtEuro(h.cost / h.liters) : "—" }}</p>
								</div>
							</div>
							@if (h.notes) {
								<p class="text-xs text-camp-olive mt-2 line-clamp-2">{{ h.notes }}</p>
							}
							<div class="flex flex-wrap gap-1.5 mt-3">
								<button type="button" (click)="reportFor.set(h)" class="btn btn-secondary btn-sm flex-1">Report</button>
								<button type="button" (click)="download(h)" class="btn btn-secondary btn-sm flex-1">Scarica</button>
								<button type="button" (click)="editing.set(h)" class="btn btn-secondary btn-sm flex-1">Modifica</button>
								<button type="button" (click)="deleting.set(h)" class="btn btn-danger-soft btn-sm flex-1">Elimina</button>
							</div>
						</div>
					}
				</div>
			}

			@if (adding(); as pre) {
				<app-harvest-form-dialog [prefill]="pre" (close)="adding.set(null)" (saved)="reportFor.set($event)" />
			}

			@if (editing(); as h) {
				<app-harvest-form-dialog [harvest]="h" (close)="editing.set(null)" />
			}

			@if (reportFor(); as h) {
				<app-harvest-report-dialog [harvest]="h" (close)="reportFor.set(null)" />
			}

			@if (deleting(); as h) {
				<app-confirm-dialog
					title="Eliminare la raccolta?"
					[message]="'La raccolta del ' + formatDate(h.date) + ' (' + fmtNum(h.liters) + ' L) e il suo report verranno eliminati definitivamente.'"
					(confirm)="remove(h)"
					(cancel)="deleting.set(null)"
				/>
			}
		</div>
	`
})
export class HarvestArchiveComponent implements OnInit {
	readonly service = inject(HarvestService);
	private farm = inject(FarmStore);
	private expenses = inject(ExpensesService);
	private exporter = inject(ReportExportService);
	private toast = inject(ToastService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	readonly tabs = HARVEST_TABS;
	readonly currentYear = new Date().getFullYear();
	readonly harvests = this.service.harvests;

	readonly adding = signal<HarvestPrefill | null>(null);
	readonly editing = signal<Harvest | null>(null);
	readonly reportFor = signal<Harvest | null>(null);
	readonly deleting = signal<Harvest | null>(null);

	readonly summary = computed(() => {
		const list = this.harvests();
		const byYear = new Map<number, { liters: number; quintals: number }>();
		for (const h of list) {
			const y = new Date(h.date).getFullYear();
			const row = byYear.get(y) || { liters: 0, quintals: 0 };
			row.liters += Number(h.liters) || 0;
			row.quintals += Number(h.quintals) || 0;
			byYear.set(y, row);
		}
		const totalQuintals = list.reduce((s, h) => s + (Number(h.quintals) || 0), 0);
		const totalLiters = list.reduce((s, h) => s + (Number(h.liters) || 0), 0);
		let bestYear: { year: number; liters: number } | null = null;
		for (const [year, row] of byYear) if (row.liters > 0 && (!bestYear || row.liters > bestYear.liters)) bestYear = { year, liters: row.liters };
		return {
			litersThisYear: byYear.get(this.currentYear)?.liters || 0,
			litersLastYear: byYear.get(this.currentYear - 1)?.liters || 0,
			totalQuintals,
			avgYield: totalQuintals > 0 ? ((totalLiters * OIL_DENSITY) / (totalQuintals * 100)) * 100 : null,
			bestYear
		};
	});

	readonly fmtNum = fmtNum;
	readonly fmtEuro = fmtEuro;
	formatDate = (v?: string | null) => formatDateIt(v);

	ngOnInit() {
		this.service.load();
		this.expenses.load();
		this.farm.ensureLoaded().then(() => this.readQueryParams());
	}

	/** Prefill dalla mappa raccolta: ?register=1&date=YYYY-MM-DD&plants=id1,id2 */
	private readQueryParams() {
		const params = this.route.snapshot.queryParamMap;
		if (params.get("register") !== "1") return;
		const date = params.get("date") || undefined;
		const plantIds = (params.get("plants") || "").split(",").filter(Boolean);
		this.adding.set({ date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined, plantIds });
		this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
	}

	openAdd() {
		this.adding.set({});
	}

	yieldOf(h: Harvest): number {
		if (h.report) return h.report.yieldPct;
		const q = Number(h.quintals);
		return q > 0 ? ((Number(h.liters) * OIL_DENSITY) / (q * 100)) * 100 : 0;
	}

	grade(h: Harvest) {
		return GRADE_META[h.report?.grade || "Discreta"];
	}

	download(h: Harvest) {
		if (!h.report) {
			this.reportFor.set(h);
			this.toast.info("Genera prima il report di questa raccolta");
			return;
		}
		const year = new Date(h.date).getFullYear();
		const comparison = this.service.yearlyComparison(this.harvests(), year);
		this.exporter.download(buildHarvestReportDocument(h, comparison, this.exporter, this.farm.plants().length), reportFileName(h));
	}

	async remove(h: Harvest) {
		this.deleting.set(null);
		if (!h.id) return;
		try {
			await this.service.remove(h.id);
			this.toast.success("Raccolta eliminata");
		} catch {
			this.toast.error("Impossibile eliminare la raccolta");
		}
	}
}
