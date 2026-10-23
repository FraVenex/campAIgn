import { Injectable, inject } from "@angular/core";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { TableRepository, isColumnMissingError } from "./table-repository";
import { GRID_X_MIN, GRID_Y_MIN, PLANT_X_SPACING, PLANT_Y_SPACING } from "../utils/farm-grid";

export interface Plant {
	id?: string;
	farm_id: string;
	user_id: string;
	name: string;
	species: string;
	position_x: number;
	position_y: number;
	status: string;
	last_treatment_at?: string | null;
	last_treatment_type?: string | null;
	variety?: string | null;
	planting_year?: number | null;
	description?: string | null;
	created_at?: string;
	updated_at?: string;
}

@Injectable({
	providedIn: "root"
})
export class PlantsService {
	private supabase: SupabaseClient;
	private authService = inject(AuthService);
	private supabaseService = inject(SupabaseService);

	private repo: TableRepository<Plant>;

	constructor() {
		this.supabase = this.supabaseService.client;
		this.repo = new TableRepository<Plant>(this.supabase, "plants", () => this.authService.currentUser()?.id ?? null, [
			"variety",
			"planting_year",
			"description"
		]);
	}

	async getPlantsByFarm(farmId: string): Promise<Plant[]> {
		const { data, error } = await this.supabase
			.from("plants")
			.select("*")
			.eq("farm_id", farmId);

		if (error) {
			throw error;
		}
		return this.repo.mergeExtras(data as Plant[]);
	}

	async createPlant(plant: Omit<Plant, "user_id">): Promise<Plant> {
		return this.repo.insert(plant);
	}

	async createPlants(plants: Omit<Plant, "user_id">[]): Promise<Plant[]> {
		const user = this.authService.currentUser();
		if (!user) {
			throw new Error("Utente non autenticato");
		}

		const payload = plants.map(p => ({ ...p, user_id: user.id }));
		const { data, error } = await this.supabase
			.from("plants")
			.insert(payload)
			.select();

		if (error && isColumnMissingError(error)) {
			// Colonne anagrafiche non ancora migrate: salva il nucleo e conserva gli extra in locale
			const split = payload.map(p => this.repo.splitOptional(p));
			const retry = await this.supabase
				.from("plants")
				.insert(split.map(s => s.core))
				.select();
			if (retry.error) throw retry.error;
			const created = retry.data as Plant[];
			created.forEach((row, i) => row.id && this.repo.rememberExtras(row.id, split[i].extra));
			return this.repo.mergeExtras(created);
		}
		if (error) {
			throw error;
		}
		return data as Plant[];
	}

	generateGridPlants(farmId: string, mainCrop: string, count: number): Omit<Plant, "user_id">[] {
		const speciesMap: { [key: string]: string } = {
			ULIVI: "Olivo",
			AGRUMI: "Agrume",
			VIGNETO: "Vite",
			ALTRO: "Pianta"
		};
		const species = speciesMap[mainCrop] || "Pianta";

		const plants: Omit<Plant, "user_id">[] = [];
		const gridCols = 16;
		const gridRows = 12;
		const xMin = GRID_X_MIN;
		const xStep = PLANT_X_SPACING;
		const yMin = GRID_Y_MIN;
		const yStep = PLANT_Y_SPACING;

		// Se le piante sono poche rispetto al campo, distanzia i filari
		const colStride = count <= 48 ? 2 : 1;
		let col = 0;
		let row = 0;

		for (let i = 0; i < count; i++) {
			const x = parseFloat((xMin + col * xStep).toFixed(2));
			const y = parseFloat((yMin + row * yStep).toFixed(2));

			plants.push({
				farm_id: farmId,
				name: `${species} ${i + 1}`,
				species: species,
				position_x: x,
				position_y: y,
				status: "Non Valutato"
			});

			col += colStride;
			if (col >= gridCols) {
				col = 0;
				row++;
				if (row >= gridRows) row = 0;
			}
		}
		return plants;
	}

	async getPlantById(id: string): Promise<Plant> {
		const { data, error } = await this.supabase
			.from("plants")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			throw error;
		}
		return this.repo.mergeExtras([data as Plant])[0];
	}

	async updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
		return this.repo.update(id, updates);
	}

	async updatePlants(ids: string[], updates: Partial<Plant>): Promise<Plant[]> {
		let { data, error } = await this.supabase
			.from("plants")
			.update(updates)
			.in("id", ids)
			.select();

		if (error && isColumnMissingError(error)) {
			const { core, extra } = this.repo.splitOptional(updates);
			ids.forEach(id => this.repo.rememberExtras(id, extra));
			({ data, error } = await this.supabase.from("plants").update(core).in("id", ids).select());
		}
		if (error) {
			throw error;
		}
		return this.repo.mergeExtras(data as Plant[]);
	}

	async deletePlants(ids: string[]): Promise<void> {
		const { error } = await this.supabase
			.from("plants")
			.delete()
			.in("id", ids);

		if (error) {
			throw error;
		}
	}
}
