import { Injectable, inject } from "@angular/core";
import { SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";
import { AuthService } from "./auth.service";
import { SupabaseService } from "./supabase.service";

export interface Farm {
	id?: string;
	user_id: string;
	name: string;
	latitude: number | null;
	longitude: number | null;
	main_crop: string;
	plants_count: number;
	layout_type: string;
	created_at?: string;
	updated_at?: string;
}

@Injectable({
	providedIn: "root"
})
export class LandService {
	private supabase: SupabaseClient;
	private authService = inject(AuthService);
	private _supabaseService = inject(SupabaseService);

	constructor() {
		this.supabase = this._supabaseService.client;
	}

	async createFarm(farmData: Omit<Farm, "user_id">) {
		const user = this.authService.currentUser();
		if (!user) throw new Error("Utente non autenticato");

		const { data, error } = await this.supabase
			.from("farms")
			.insert([
				{
					...farmData,
					user_id: user.id
				}
			])
			.select();

		if (error) throw error;
		return data[0];
	}

	async getFarms() {
		const user = this.authService.currentUser();
		if (!user) return [];

		const { data, error } = await this.supabase.from("farms").select("*").eq("user_id", user.id);

		if (error) throw error;
		return data as Farm[];
	}

	calculateSuggestedLayout(plantCount: number): string {
		if (plantCount <= 30) {
			return "loose";
		} else if (plantCount <= 120) {
			return "medium_grid";
		} else {
			return "dense_grid";
		}
	}
}
