import { Injectable, inject } from "@angular/core";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";

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

	constructor() {
		this.supabase = this.supabaseService.client;
	}

	async getPlantsByFarm(farmId: string): Promise<Plant[]> {
		const { data, error } = await this.supabase
			.from("plants")
			.select("*")
			.eq("farm_id", farmId);

		if (error) {
			throw error;
		}
		return data as Plant[];
	}

	async createPlant(plant: Omit<Plant, "user_id">): Promise<Plant> {
		const user = this.authService.currentUser();
		if (!user) {
			throw new Error("Utente non autenticato");
		}

		const { data, error } = await this.supabase
			.from("plants")
			.insert([{ ...plant, user_id: user.id }])
			.select()
			.single();

		if (error) {
			throw error;
		}
		return data as Plant;
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
		const cols = Math.ceil(Math.sqrt(count));
		const rows = Math.ceil(count / cols);

		const xStep = 80 / (cols + 1);
		const yStep = 80 / (rows + 1);

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const x = 10 + (col + 1) * xStep;
			const y = 10 + (row + 1) * yStep;

			plants.push({
				farm_id: farmId,
				name: `${species} ${i + 1}`,
				species: species,
				position_x: parseFloat(x.toFixed(2)),
				position_y: parseFloat(y.toFixed(2)),
				status: "Non Valutato"
			});
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
		return data as Plant;
	}

	async updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
		const { data, error } = await this.supabase
			.from("plants")
			.update(updates)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			throw error;
		}
		return data as Plant;
	}

	async updatePlants(ids: string[], updates: Partial<Plant>): Promise<Plant[]> {
		const { data, error } = await this.supabase
			.from("plants")
			.update(updates)
			.in("id", ids)
			.select();

		if (error) {
			throw error;
		}
		return data as Plant[];
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
