import { Injectable, computed, inject, signal } from "@angular/core";
import { LandService, Farm } from "./land.service";
import { PlantsService, Plant } from "./plants.service";
import { alignToGrid, findFreeSlotsFromBottomRight } from "../utils/farm-grid";

export type NewPlantInput = Pick<Plant, "name" | "species" | "status"> & Partial<Pick<Plant, "variety" | "planting_year" | "description">>;

/**
 * Stato condiviso di terreno e piante: unica fonte di verità per mappa, lista piante,
 * interventi e raccolta, così ogni modifica è subito visibile in tutte le viste.
 */
@Injectable({ providedIn: "root" })
export class FarmStore {
	private landService = inject(LandService);
	private plantsService = inject(PlantsService);

	readonly farms = signal<Farm[]>([]);
	readonly farm = signal<Farm | null>(null);
	readonly plants = signal<Plant[]>([]);
	readonly isLoading = signal(false);
	readonly loaded = signal(false);
	readonly error = signal<string | null>(null);

	readonly plantsById = computed(() => new Map(this.plants().map(p => [p.id!, p])));
	readonly healthStats = computed(() => {
		const list = this.plants();
		const count = (s: string) => list.filter(p => (p.status || "Non Valutato") === s).length;
		return {
			total: list.length,
			ottimo: count("Ottimo"),
			attenzione: count("Attenzione"),
			stressato: count("Stressato"),
			nonValutato: count("Non Valutato"),
			healthyPct: list.length ? Math.round((count("Ottimo") / list.length) * 100) : 0
		};
	});

	private loading: Promise<void> | null = null;

	/** Carica terreno e piante una sola volta (le chiamate concorrenti condividono la stessa promise). */
	ensureLoaded(): Promise<void> {
		if (this.loaded()) return Promise.resolve();
		if (!this.loading) {
			this.loading = this.reload().finally(() => (this.loading = null));
		}
		return this.loading;
	}

	async reload(): Promise<void> {
		this.isLoading.set(true);
		this.error.set(null);
		try {
			const farms = await this.landService.getFarms();
			this.farms.set(farms);
			const farm = farms[0] ?? null;
			this.farm.set(farm);
			if (farm?.id) {
				let plants = await this.plantsService.getPlantsByFarm(farm.id);
				if (!plants.length && farm.plants_count > 0) {
					plants = await this.plantsService.createPlants(this.plantsService.generateGridPlants(farm.id, farm.main_crop, farm.plants_count));
				}
				this.plants.set(plants);
			} else {
				this.plants.set([]);
			}
			this.loaded.set(true);
		} catch (err: any) {
			console.error("[FarmStore]", err);
			this.error.set(err?.message || "Impossibile caricare il terreno.");
		} finally {
			this.isLoading.set(false);
		}
	}

	getPlant(id: string): Plant | undefined {
		return this.plantsById().get(id);
	}

	/** Aggiunge piante parcheggiandole nei nodi liberi in basso a destra della mappa. */
	async addPlants(inputs: NewPlantInput[]): Promise<Plant[]> {
		const farm = this.farm();
		if (!farm?.id) throw new Error("Nessun terreno disponibile");
		const slots = findFreeSlotsFromBottomRight(this.plants(), inputs.length);
		const payload = inputs.map((input, i) => ({
			...input,
			farm_id: farm.id!,
			position_x: slots[i]?.x ?? 95,
			position_y: slots[i]?.y ?? 95
		}));
		const created = payload.length === 1 ? [await this.plantsService.createPlant(payload[0])] : await this.plantsService.createPlants(payload);
		this.plants.update(list => [...list, ...created]);
		return created;
	}

	async updatePlant(id: string, patch: Partial<Plant>): Promise<Plant> {
		const previous = this.getPlant(id);
		this.patchLocal([id], patch);
		try {
			const saved = await this.plantsService.updatePlant(id, patch);
			this.plants.update(list => list.map(p => (p.id === id ? { ...p, ...saved } : p)));
			return saved;
		} catch (err) {
			if (previous) this.plants.update(list => list.map(p => (p.id === id ? previous : p)));
			throw err;
		}
	}

	async updatePlants(ids: string[], patch: Partial<Plant>): Promise<void> {
		if (!ids.length) return;
		await this.plantsService.updatePlants(ids, patch);
		this.patchLocal(ids, patch);
	}

	async movePlant(id: string, x: number, y: number): Promise<void> {
		await this.updatePlant(id, { position_x: x, position_y: y });
	}

	async alignAll(): Promise<void> {
		const updates = alignToGrid(this.plants());
		this.plants.update(list =>
			list.map(p => {
				const u = updates.find(item => item.id === p.id);
				return u ? { ...p, position_x: u.x, position_y: u.y } : p;
			})
		);
		await Promise.all(updates.map(u => this.plantsService.updatePlant(u.id, { position_x: u.x, position_y: u.y })));
	}

	async deletePlants(ids: string[]): Promise<void> {
		if (!ids.length) return;
		await this.plantsService.deletePlants(ids);
		const toRemove = new Set(ids);
		this.plants.update(list => list.filter(p => !toRemove.has(p.id!)));
	}

	private patchLocal(ids: string[], patch: Partial<Plant>) {
		const set = new Set(ids);
		this.plants.update(list => list.map(p => (set.has(p.id!) ? { ...p, ...patch } : p)));
	}
}
