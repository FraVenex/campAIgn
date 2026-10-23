import { Harvest, HarvestReport, YearComparison } from "../../../core/services/harvest.service";
import { ReportDocument, ReportExportService, escapeHtml } from "../../../core/services/report-export.service";
import { Tone, formatCurrency, formatDateIt } from "../../../core/constants/domain";

export const GRADE_META: Record<HarvestReport["grade"], { tone: Tone; icon: string }> = {
	Eccellente: { tone: "success", icon: "🏆" },
	Buona: { tone: "info", icon: "👍" },
	Discreta: { tone: "warning", icon: "👌" },
	Scarsa: { tone: "danger", icon: "⚠️" }
};

export interface ReportKpi {
	label: string;
	value: string;
	hint?: string;
}

export function fmtNum(value: number | null | undefined, digits = 1): string {
	if (value === null || value === undefined || isNaN(value)) return "—";
	return value.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtEuro(value: number | null | undefined): string {
	return value === null || value === undefined ? "—" : formatCurrency(value);
}

export function fmtSigned(value: number | null | undefined, unit: string): string {
	if (value === null || value === undefined) return "—";
	return `${value > 0 ? "+" : ""}${fmtNum(value)}${unit}`;
}

/** KPI principali del report, comuni a dialog ed export. */
export function reportKpis(h: Harvest, r: HarvestReport): ReportKpi[] {
	return [
		{ label: "Resa in olio", value: `${fmtNum(r.yieldPct)}%`, hint: r.deltaYieldVsAvg !== null ? `${fmtSigned(r.deltaYieldVsAvg, " pt")} vs media` : undefined },
		{ label: "Costo raccolta €/L", value: fmtEuro(r.costPerLiter) },
		{ label: "Costo €/quintale", value: fmtEuro(r.costPerQuintal) },
		{ label: "Costo pieno €/L", value: fmtEuro(r.fullCostPerLiter), hint: "incluse spese annuali" },
		{ label: "Litri per pianta", value: r.litersPerPlant !== null ? `${fmtNum(r.litersPerPlant, 2)} L` : "—", hint: r.kgPerPlant !== null ? `${fmtNum(r.kgPerPlant)} kg di olive` : undefined },
		{ label: "Produzione vs media", value: fmtSigned(r.deltaLitersVsAvg, "%"), hint: r.deltaLitersVsAvg === null ? "primo anno registrato" : `litri ${new Date(h.date).getFullYear()}` }
	];
}


/** Documento esportabile (HTML/PDF) per una raccolta. */
export function buildHarvestReportDocument(h: Harvest, comparison: YearComparison[], exporter: ReportExportService, plantCount: number): ReportDocument {
	const r = h.report!;
	const year = new Date(h.date).getFullYear();
	const kpis = reportKpis(h, r);
	const kpiHtml = `<div class="kpis">${kpis
		.map(k => `<div class="kpi"><span>${escapeHtml(k.label)}</span><b>${escapeHtml(k.value)}</b>${k.hint ? `<small style="color:#A5A58D;font-size:11px">${escapeHtml(k.hint)}</small>` : ""}</div>`)
		.join("")}</div>`;

	const summary = [
		`| Voce | Valore |`,
		`|---|---|`,
		`| Data raccolta | ${formatDateIt(h.date, { day: "numeric", month: "long", year: "numeric" })} |`,
		`| Olive raccolte | ${fmtNum(h.quintals)} q |`,
		`| Olio ottenuto | ${fmtNum(h.liters)} L |`,
		`| Costo raccolta | ${fmtEuro(h.cost)} |`,
		`| Piante coinvolte | ${h.plant_ids?.length || plantCount || "—"} |`
	].join("\n");

	const table = [
		`| Anno | Quintali | Litri | Resa % | Costo |`,
		`|---|---|---|---|---|`,
		...comparison.map(c => `| ${c.year === year ? `**${c.year}**` : c.year} | ${fmtNum(c.quintals)} | ${fmtNum(c.liters)} | ${c.quintals ? fmtNum(c.yieldPct) + "%" : "—"} | ${fmtEuro(c.cost)} |`)
	].join("\n");

	const chart = exporter.barChartSvg(
		comparison.map(c => ({ label: String(c.year), value: c.liters, highlight: c.year === year })),
		" L"
	);

	const sections = [
		{ heading: "Riepilogo", markdown: summary },
		{ heading: `Valutazione: ${r.grade} (${r.score}/100)`, html: kpiHtml },
		{ heading: "Osservazioni", markdown: r.insights.map(i => `- ${i}`).join("\n") },
		{ heading: "Litri di olio negli ultimi 5 anni", html: chart },
		{ heading: "Confronto pluriennale", markdown: table }
	];
	if (h.notes?.trim()) sections.push({ heading: "Note", markdown: h.notes.trim() });

	return {
		title: `Report raccolta ${formatDateIt(h.date, { day: "numeric", month: "long", year: "numeric" })}`,
		subtitle: `${fmtNum(h.quintals)} q di olive · ${fmtNum(h.liters)} L di olio · voto ${r.grade} (${r.score}/100)`,
		sections
	};
}

export function reportFileName(h: Harvest): string {
	return `report-raccolta-${h.date.slice(0, 10)}`;
}
