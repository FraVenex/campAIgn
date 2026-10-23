import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { TableRepository, RepoRow } from "./table-repository";

/** Densità media dell'olio extravergine (kg/L) usata per calcolare la resa in olio. */
export const OIL_DENSITY = 0.916;

export interface YearComparison {
	year: number;
	quintals: number;
	liters: number;
	yieldPct: number;
	cost: number;
}

export interface HarvestReport {
	generated_at: string;
	yieldPct: number;
	costPerLiter: number;
	costPerQuintal: number;
	fullCostPerLiter: number | null;
	litersPerPlant: number | null;
	kgPerPlant: number | null;
	deltaLitersVsAvg: number | null;
	deltaYieldVsAvg: number | null;
	score: number;
	grade: "Eccellente" | "Buona" | "Discreta" | "Scarsa";
	comparison: YearComparison[];
	insights: string[];
}

export interface Harvest extends RepoRow {
	farm_id?: string | null;
	date: string;
	quintals: number;
	liters: number;
	cost: number;
	plant_ids?: string[] | null;
	notes?: string | null;
	report?: HarvestReport | null;
}

export type HarvestInput = Omit<Harvest, "id" | "user_id" | "created_at" | "updated_at" | "report">;

/** Archivio raccolte con generazione automatica del report di bontà del raccolto. */
@Injectable({ providedIn: "root" })
export class HarvestService {
	private auth = inject(AuthService);
	private repo = new TableRepository<Harvest>(inject(SupabaseService).client, "harvests", () => this.auth.currentUser()?.id ?? null);

	readonly harvests = signal<Harvest[]>([]);
	readonly loaded = signal(false);

	async load(force = false): Promise<void> {
		if (this.loaded() && !force) return;
		try {
			this.harvests.set(this.sort(await this.repo.list(q => q.order("date", { ascending: false }))));
		} catch (err) {
			console.error("[HarvestService]", err);
			this.harvests.set([]);
		}
		this.loaded.set(true);
	}

	/** Registra una raccolta e genera subito il report, salvato nella riga stessa. */
	async add(input: HarvestInput, context: { totalPlants: number; annualExpenses: number }): Promise<Harvest> {
		const draft: Harvest = { ...input, id: "draft" };
		const report = this.computeReport(draft, [...this.harvests(), draft], context);
		const saved = await this.repo.insert({ ...input, report });
		this.harvests.update(list => this.sort([saved, ...list]));
		return saved;
	}

	async update(id: string, patch: Partial<HarvestInput>, context: { totalPlants: number; annualExpenses: number }): Promise<Harvest> {
		const current = this.harvests().find(h => h.id === id);
		if (!current) throw new Error("Raccolta non trovata");
		const merged: Harvest = { ...current, ...patch };
		const report = this.computeReport(merged, this.harvests().map(h => (h.id === id ? merged : h)), context);
		const saved = await this.repo.update(id, { ...patch, report });
		this.harvests.update(list => this.sort(list.map(h => (h.id === id ? { ...h, ...saved } : h))));
		return saved;
	}

	async regenerateReport(id: string, context: { totalPlants: number; annualExpenses: number }): Promise<Harvest> {
		return this.update(id, {}, context);
	}

	async remove(id: string): Promise<void> {
		await this.repo.remove(id);
		this.harvests.update(list => list.filter(h => h.id !== id));
	}

	computeReport(harvest: Harvest, all: Harvest[], context: { totalPlants: number; annualExpenses: number }): HarvestReport {
		const quintals = Number(harvest.quintals) || 0;
		const liters = Number(harvest.liters) || 0;
		const cost = Number(harvest.cost) || 0;
		const year = new Date(harvest.date).getFullYear();

		const yieldPct = quintals > 0 ? ((liters * OIL_DENSITY) / (quintals * 100)) * 100 : 0;
		const costPerLiter = liters > 0 ? cost / liters : 0;
		const costPerQuintal = quintals > 0 ? cost / quintals : 0;
		const plantCount = harvest.plant_ids?.length || context.totalPlants || 0;
		const litersPerPlant = plantCount ? liters / plantCount : null;
		const kgPerPlant = plantCount ? (quintals * 100) / plantCount : null;

		const comparison = this.yearlyComparison(all, year);
		const yearRow = comparison.find(c => c.year === year);
		const yearLiters = yearRow?.liters || liters;
		const fullCostPerLiter = yearLiters > 0 ? (cost + context.annualExpenses * (liters / yearLiters)) / liters : null;

		const previous = comparison.filter(c => c.year < year && c.liters > 0);
		const avgLiters = previous.length ? previous.reduce((s, c) => s + c.liters, 0) / previous.length : null;
		const avgYield = previous.length ? previous.reduce((s, c) => s + c.yieldPct, 0) / previous.length : null;
		const deltaLitersVsAvg = avgLiters ? ((yearLiters - avgLiters) / avgLiters) * 100 : null;
		const deltaYieldVsAvg = avgYield !== null ? yieldPct - avgYield : null;

		const clamp = (v: number) => Math.max(0, Math.min(100, v));
		const yieldScore = clamp(((yieldPct - 10) / 10) * 100);
		const costScore = liters > 0 ? clamp(((15 - costPerLiter) / 10) * 100) : 50;
		const trendScore = deltaLitersVsAvg === null ? 60 : clamp(50 + deltaLitersVsAvg * 1.5);
		const score = Math.round(yieldScore * 0.5 + costScore * 0.3 + trendScore * 0.2);
		const grade = score >= 80 ? "Eccellente" : score >= 65 ? "Buona" : score >= 45 ? "Discreta" : "Scarsa";

		const insights: string[] = [];
		if (yieldPct >= 17) insights.push(`Resa in olio del ${yieldPct.toFixed(1)}%: olive ben mature e sane, ottimo lavoro.`);
		else if (yieldPct >= 13) insights.push(`Resa in olio del ${yieldPct.toFixed(1)}%: nella media per l'olivo in Italia (13-17%).`);
		else if (yieldPct > 0) insights.push(`Resa in olio del ${yieldPct.toFixed(1)}%: bassa. Valuta epoca di raccolta, carico idrico delle drupe e tempi di molitura.`);
		if (costPerLiter > 0) {
			insights.push(
				costPerLiter <= 6
					? `Costo di raccolta contenuto: ${costPerLiter.toFixed(2)} €/L.`
					: costPerLiter <= 10
						? `Costo di raccolta di ${costPerLiter.toFixed(2)} €/L: accettabile, margini di ottimizzazione su manodopera e mezzi.`
						: `Costo di raccolta elevato (${costPerLiter.toFixed(2)} €/L): valuta agevolatori o scuotitori per ridurre le ore di lavoro.`
			);
		}
		if (fullCostPerLiter) insights.push(`Includendo le spese di gestione dell'anno, il costo pieno stimato è ${fullCostPerLiter.toFixed(2)} €/L.`);
		if (deltaLitersVsAvg !== null) {
			insights.push(
				deltaLitersVsAvg >= 0
					? `Produzione ${year} superiore del ${deltaLitersVsAvg.toFixed(0)}% rispetto alla media degli anni precedenti.`
					: `Produzione ${year} inferiore del ${Math.abs(deltaLitersVsAvg).toFixed(0)}% rispetto alla media: possibile anno di scarica (alternanza produttiva).`
			);
		} else {
			insights.push("Primo raccolto registrato: dal prossimo anno potrai confrontare l'andamento.");
		}
		if (litersPerPlant !== null) insights.push(`Produzione media di ${litersPerPlant.toFixed(2)} L di olio per pianta (${kgPerPlant!.toFixed(1)} kg di olive).`);

		return {
			generated_at: new Date().toISOString(),
			yieldPct: round(yieldPct),
			costPerLiter: round(costPerLiter),
			costPerQuintal: round(costPerQuintal),
			fullCostPerLiter: fullCostPerLiter !== null ? round(fullCostPerLiter) : null,
			litersPerPlant: litersPerPlant !== null ? round(litersPerPlant) : null,
			kgPerPlant: kgPerPlant !== null ? round(kgPerPlant) : null,
			deltaLitersVsAvg: deltaLitersVsAvg !== null ? round(deltaLitersVsAvg) : null,
			deltaYieldVsAvg: deltaYieldVsAvg !== null ? round(deltaYieldVsAvg) : null,
			score,
			grade,
			comparison,
			insights
		};
	}

	/** Totali per anno (ultimi 5 anni fino all'anno indicato). */
	yearlyComparison(all: Harvest[], untilYear: number): YearComparison[] {
		const years = Array.from({ length: 5 }, (_, i) => untilYear - 4 + i);
		return years.map(year => {
			const rows = all.filter(h => new Date(h.date).getFullYear() === year);
			const quintals = rows.reduce((s, h) => s + (Number(h.quintals) || 0), 0);
			const liters = rows.reduce((s, h) => s + (Number(h.liters) || 0), 0);
			const cost = rows.reduce((s, h) => s + (Number(h.cost) || 0), 0);
			const yieldPct = quintals > 0 ? ((liters * OIL_DENSITY) / (quintals * 100)) * 100 : 0;
			return { year, quintals: round(quintals), liters: round(liters), cost: round(cost), yieldPct: round(yieldPct) };
		});
	}

	private sort(list: Harvest[]): Harvest[] {
		return [...list].sort((a, b) => b.date.localeCompare(a.date));
	}
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}
