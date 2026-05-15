import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({
	providedIn: "root"
})
export class SupabaseService {
	public readonly client: SupabaseClient;

	constructor() {
		console.log("[SupabaseService] Inizializzazione client unico (v2)...");
		this.client = createClient(environment.supabaseUrl, environment.supabaseKey, {
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: true,
				flowType: "pkce",
				storageKey: "camp-auth-token-v2",
				lockAcquireTimeout: 2000,
				lock: async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
					console.log(`[SupabaseService] Acquisizione lock: ${name}`);
					try {
						const result = await fn();
						console.log(`[SupabaseService] Lock completato: ${name}`);
						return result;
					} catch (e) {
						console.error(`[SupabaseService] Errore nel lock: ${name}`, e);
						throw e;
					}
				}
			}
		});
	}
}
