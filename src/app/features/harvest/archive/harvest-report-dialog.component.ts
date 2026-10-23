import { Component, computed, inject, input, output, signal } from "@angular/core";
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexPlotOptions, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ApexMarkers } from "ng-apexcharts";
import { CampDialogComponent } from "../../../shared/components/camp-dialog/camp-dialog.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { Harvest, HarvestService } from "../../../core/services/harvest.service";
import { ReportExportService } from "../../../core/services/report-export.service";
import { FarmStore } from "../../../core/services/farm-store.service";
import { ExpensesService } from "../../../core/services/expenses.service";
import { ToastService } from "../../../core/services/toast.service";
import { formatDateIt } from "../../../core/constants/domain";
import { GRADE_META, buildHarvestReportDocument, fmtEuro, fmtNum, reportFileName, reportKpis } from "./harvest-report";

/** Report di bontà del raccolto: KPI, voto, osservazioni e confronto con gli ultimi 5 anni. */
@Component({
	selector: "app-harvest-report-dialog",
	standalone: true,
	imports: [CampDialogComponent, ChipComponent, NgApexchartsModule],
	template: `
		<app-camp-dialog [title]="'Raccolta del ' + formatDate(harvest().date)" subtitle="Report raccolta" icon="📊" maxWidth="max-w-4xl" (close)="close.emit()">
			@if (current().report; as r) {
				<div class="space-y-6">
					<div class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-camp-sand/40 bg-camp-cream/50">
						<div class="w-20 h-20 shrink-0 rounded-full border-4 flex flex-col items-center justify-center bg-white" [class]="scoreRing()">
							<span class="text-2xl font-serif text-camp-earth leading-none">{{ r.score }}</span>
							<span class="kpi-label">/ 100</span>
						</div>
						<div class="min-w-0">
							<app-chip [label]="r.grade" [icon]="grade().icon" [tone]="grade().tone" />
							<p class="text-sm text-camp-earth mt-2">
								<strong>{{ fmtNum(current().quintals) }} q</strong> di olive · <strong>{{ fmtNum(current().liters) }} L</strong> di olio · costo {{ fmtEuro(current().cost) }}
							</p>
							<p class="text-xs text-camp-olive mt-1">{{ plantCountLabel() }} · report generato il {{ formatDate(r.generated_at) }}</p>
						</div>
					</div>

					<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
						@for (k of kpis(); track k.label) {
							<div class="kpi">
								<p class="kpi-label">{{ k.label }}</p>
								<p class="kpi-value">{{ k.value }}</p>
								@if (k.hint) {
									<p class="kpi-hint">{{ k.hint }}</p>
								}
							</div>
						}
					</div>

					<section>
						<p class="eyebrow">Valutazione</p>
						<h3 class="section-title mb-3">Osservazioni</h3>
						<ul class="space-y-2">
							@for (i of r.insights; track $index) {
								<li class="flex gap-2 text-sm text-camp-earth leading-relaxed"><span class="text-camp-sage">•</span><span>{{ i }}</span></li>
							}
						</ul>
					</section>

					<section>
						<p class="eyebrow">Confronto</p>
						<h3 class="section-title mb-3">Ultimi 5 anni</h3>
						<div class="border border-camp-sand/60 rounded-xl p-2 bg-white">
							<apx-chart
								[series]="chartSeries()"
								[chart]="chart"
								[xaxis]="chartXAxis()"
								[yaxis]="yaxis"
								[stroke]="stroke"
								[plotOptions]="plotOptions"
								[dataLabels]="dataLabels"
								[colors]="colors"
								[legend]="legend"
								[grid]="grid"
								[markers]="markers"
								[tooltip]="tooltip"
							></apx-chart>
						</div>
						<div class="mt-3 overflow-x-auto">
							<table class="data-table min-w-[420px]">
								<thead>
									<tr>
										<th>Anno</th>
										<th class="text-right">Quintali</th>
										<th class="text-right">Litri</th>
										<th class="text-right">Resa</th>
										<th class="text-right">Costo</th>
									</tr>
								</thead>
								<tbody>
									@for (c of comparison(); track c.year) {
										<tr [class.font-bold]="c.year === year()" [class.bg-camp-cream]="c.year === year()">
											<td>{{ c.year }}</td>
											<td class="text-right">{{ c.quintals ? fmtNum(c.quintals) : "—" }}</td>
											<td class="text-right">{{ c.liters ? fmtNum(c.liters) : "—" }}</td>
											<td class="text-right">{{ c.quintals ? fmtNum(c.yieldPct) + "%" : "—" }}</td>
											<td class="text-right">{{ c.cost ? fmtEuro(c.cost) : "—" }}</td>
										</tr>
									}
								</tbody>
							</table>
						</div>
					</section>

					@if (current().notes) {
						<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3 text-xs text-camp-earth whitespace-pre-line"><strong>Note:</strong> {{ current().notes }}</div>
					}
				</div>
			} @else {
				<div class="empty-state">
					<span class="empty-state-icon">📄</span>
					<p class="text-muted">Il report di questa raccolta non è ancora stato generato.</p>
					<button type="button" (click)="regenerate()" [disabled]="busy()" class="btn btn-primary btn-sm mt-2">Genera report</button>
				</div>
			}

			<div footer class="dialog-footer">
				@if (current().report) {
					<button type="button" (click)="regenerate()" [disabled]="busy()" class="btn btn-secondary">Rigenera</button>
					<button type="button" (click)="download()" class="btn btn-secondary">Scarica</button>
					<button type="button" (click)="print()" class="btn btn-primary">Stampa / PDF</button>
				} @else {
					<button type="button" (click)="close.emit()" class="btn btn-secondary">Chiudi</button>
				}
			</div>
		</app-camp-dialog>
	`
})
export class HarvestReportDialogComponent {
	readonly farm = inject(FarmStore);
	private harvests = inject(HarvestService);
	private expenses = inject(ExpensesService);
	private exporter = inject(ReportExportService);
	private toast = inject(ToastService);

	readonly harvest = input.required<Harvest>();
	readonly close = output<void>();
	readonly busy = signal(false);

	/** Versione aggiornata dallo store (dopo una rigenerazione). */
	readonly current = computed(() => this.harvests.harvests().find(h => h.id === this.harvest().id) ?? this.harvest());
	readonly year = computed(() => new Date(this.current().date).getFullYear());
	readonly comparison = computed(() => this.harvests.yearlyComparison(this.harvests.harvests(), this.year()));
	readonly kpis = computed(() => (this.current().report ? reportKpis(this.current(), this.current().report!) : []));
	readonly grade = computed(() => GRADE_META[this.current().report?.grade || "Discreta"]);
	readonly scoreRing = computed(() => {
		const tone = this.grade().tone;
		return tone === "success" ? "border-camp-success" : tone === "info" ? "border-camp-sage" : tone === "warning" ? "border-camp-amber" : "border-camp-error";
	});
	readonly plantCountLabel = computed(() => {
		const n = this.current().plant_ids?.length || this.farm.plants().length;
		return `${n} ${n === 1 ? "pianta" : "piante"}`;
	});

	readonly chartSeries = computed<ApexAxisChartSeries>(() => [
		{ name: "Litri di olio", type: "column", data: this.comparison().map(c => c.liters) },
		{ name: "Resa %", type: "line", data: this.comparison().map(c => (c.quintals ? c.yieldPct : null)) as any }
	]);
	readonly chartXAxis = computed<ApexXAxis>(() => ({
		categories: this.comparison().map(c => String(c.year)),
		labels: { style: { colors: "#A5A58D", fontSize: "11px" } },
		axisBorder: { color: "#E8E4D9" },
		axisTicks: { show: false }
	}));

	readonly chart: ApexChart = { type: "line", height: 280, toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif", zoom: { enabled: false } };
	readonly yaxis: ApexYAxis[] = [
		{ title: { text: "Litri", style: { color: "#6B705C", fontWeight: 600 } }, labels: { style: { colors: "#A5A58D" }, formatter: v => fmtNum(v, 0) } },
		{ opposite: true, min: 0, title: { text: "Resa %", style: { color: "#C9A96E", fontWeight: 600 } }, labels: { style: { colors: "#A5A58D" }, formatter: v => (v === null || v === undefined ? "" : `${fmtNum(v)}%`) } }
	];
	readonly stroke: ApexStroke = { width: [0, 3], curve: "smooth" };
	readonly plotOptions: ApexPlotOptions = { bar: { columnWidth: "45%", borderRadius: 6 } };
	readonly dataLabels: ApexDataLabels = { enabled: false };
	readonly colors = ["#6B705C", "#C9A96E"];
	readonly legend: ApexLegend = { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: "#3F4238" } };
	readonly grid: ApexGrid = { borderColor: "#F3F0E6", strokeDashArray: 3 };
	readonly markers: ApexMarkers = { size: 4, strokeWidth: 0 };
	readonly tooltip: ApexTooltip = { shared: true, intersect: false };

	readonly fmtNum = fmtNum;
	readonly fmtEuro = fmtEuro;
	formatDate = (v?: string | null) => formatDateIt(v, { day: "numeric", month: "long", year: "numeric" });

	async regenerate() {
		const h = this.current();
		if (!h.id) return;
		this.busy.set(true);
		try {
			await this.expenses.load();
			await this.harvests.regenerateReport(h.id, { totalPlants: this.farm.plants().length, annualExpenses: this.expenses.totalForYear(this.year()) });
			this.toast.success("Report rigenerato");
		} catch {
			this.toast.error("Impossibile rigenerare il report");
		} finally {
			this.busy.set(false);
		}
	}

	download() {
		const h = this.current();
		if (!h.report) return;
		this.exporter.download(buildHarvestReportDocument(h, this.comparison(), this.exporter, this.farm.plants().length), reportFileName(h));
	}

	print() {
		const h = this.current();
		if (!h.report) return;
		this.exporter.print(buildHarvestReportDocument(h, this.comparison(), this.exporter, this.farm.plants().length));
	}
}
