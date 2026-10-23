import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository generico per le tabelle Supabase dell'app.
 *
 * - Se la tabella non esiste ancora nel progetto Supabase (migrazione non applicata),
 *   passa in modo trasparente a una persistenza locale (localStorage) così l'app resta utilizzabile.
 *   A ogni sessione riprova Supabase: appena la tabella esiste, i dati locali vengono caricati online.
 * - Se mancano solo alcune colonne opzionali (es. nuove colonne non ancora migrate),
 *   le salva localmente come "extra" e le ricompone in lettura.
 */
export interface RepoRow {
	id?: string;
	user_id?: string;
	created_at?: string;
	updated_at?: string;
}

export function isTableMissingError(error: any): boolean {
	if (!error) return false;
	const msg = String(error.message || "");
	const code = String(error.code || "");
	return code === "PGRST205" || code === "42P01" || msg.includes("does not exist") || msg.includes("Could not find the table");
}

export function isColumnMissingError(error: any): boolean {
	if (!error) return false;
	const msg = String(error.message || "");
	const code = String(error.code || "");
	return code === "PGRST204" || code === "42703" || (msg.includes("column") && msg.includes("schema cache"));
}

export function makeLocalId(prefix = "local"): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class TableRepository<T extends RepoRow> {
	private readonly rowsKey: string;
	private localMode = false;
	private readonly extrasKey: string;

	constructor(
		private client: SupabaseClient,
		private table: string,
		private getUserId: () => string | null,
		private optionalColumns: (keyof T & string)[] = []
	) {
		this.rowsKey = `camp-local-${table}`;
		this.extrasKey = `camp-extras-${table}`;
	}

	get isLocal(): boolean {
		return this.localMode;
	}

	async list(apply?: (query: any) => any): Promise<T[]> {
		const userId = this.getUserId();
		if (!userId) return [];
		if (this.isLocal) return this.localRows().filter(r => !r.user_id || r.user_id === userId);

		try {
			let query: any = this.client.from(this.table).select("*").eq("user_id", userId);
			if (apply) query = apply(query);
			const { data, error } = await query;
			if (error) throw error;
			const synced = await this.syncLocalRows(userId);
			return this.mergeExtras([...synced, ...((data || []) as T[])]);
		} catch (error) {
			if (isTableMissingError(error)) {
				this.activateLocal();
				return this.localRows().filter(r => !r.user_id || r.user_id === userId);
			}
			throw error;
		}
	}

	async insert(row: Omit<T, "id" | "user_id" | "created_at" | "updated_at">): Promise<T> {
		const userId = this.getUserId();
		if (!userId) throw new Error("Utente non autenticato");
		const payload = { ...row, user_id: userId } as T;

		if (this.isLocal) return this.insertLocal(payload);

		try {
			return await this.writeWithOptionalFallback(payload, async p => {
				const { data, error } = await this.client.from(this.table).insert([p as any]).select().single();
				if (error) throw error;
				return data as T;
			});
		} catch (error) {
			if (isTableMissingError(error)) {
				this.activateLocal();
				return this.insertLocal(payload);
			}
			throw error;
		}
	}

	async update(id: string, patch: Partial<T>): Promise<T> {
		const now = new Date().toISOString();
		if (this.isLocal || id.startsWith("local-")) return this.updateLocal(id, { ...patch, updated_at: now });

		try {
			return await this.writeWithOptionalFallback({ ...patch, updated_at: now } as Partial<T>, async p => {
				const { data, error } = await this.client.from(this.table).update(p as any).eq("id", id).select().single();
				if (error) throw error;
				return data as T;
			}, id);
		} catch (error) {
			if (isTableMissingError(error)) {
				this.activateLocal();
				return this.updateLocal(id, patch);
			}
			throw error;
		}
	}

	async remove(id: string): Promise<void> {
		if (this.isLocal || id.startsWith("local-")) {
			this.saveLocalRows(this.localRows().filter(r => r.id !== id));
			return;
		}
		const { error } = await this.client.from(this.table).delete().eq("id", id);
		if (error) {
			if (isTableMissingError(error)) {
				this.activateLocal();
				this.saveLocalRows(this.localRows().filter(r => r.id !== id));
				return;
			}
			throw error;
		}
		this.dropExtras(id);
	}

	/** Salva in locale colonne opzionali non ancora presenti nello schema remoto. */
	rememberExtras(id: string, extra: Record<string, unknown>) {
		const clean = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined));
		if (Object.keys(clean).length) this.saveExtras(id, clean);
	}

	/** Rimuove dal payload le colonne opzionali, restituendole separatamente. */
	splitOptional<P extends Record<string, any>>(payload: P): { core: P; extra: Record<string, unknown> } {
		const core = { ...payload };
		const extra: Record<string, unknown> = {};
		for (const col of this.optionalColumns) {
			if (col in core) {
				extra[col] = core[col];
				delete core[col];
			}
		}
		return { core, extra };
	}

	/** Applica le colonne opzionali salvate localmente a righe lette da altre query. */
	mergeExtras<R extends RepoRow>(rows: R[]): R[] {
		const extras = this.readExtras();
		if (!Object.keys(extras).length) return rows;
		return rows.map(r => (r.id && extras[r.id] ? { ...r, ...extras[r.id] } : r));
	}

	private async writeWithOptionalFallback(payload: Partial<T>, write: (p: Partial<T>) => Promise<T>, existingId?: string): Promise<T> {
		try {
			const saved = await write(payload);
			return this.mergeExtras([saved])[0];
		} catch (error) {
			if (!isColumnMissingError(error) || !this.optionalColumns.length) throw error;
			const stripped: Partial<T> = { ...payload };
			const extra: Record<string, unknown> = {};
			for (const col of this.optionalColumns) {
				if (col in stripped) {
					extra[col] = (stripped as any)[col];
					delete (stripped as any)[col];
				}
			}
			const saved = await write(stripped);
			const id = saved.id || existingId;
			if (id && Object.keys(extra).length) this.saveExtras(id, extra);
			return this.mergeExtras([saved])[0];
		}
	}

	private insertLocal(payload: T): T {
		const now = new Date().toISOString();
		const row = { ...payload, id: makeLocalId(), created_at: now, updated_at: now } as T;
		this.saveLocalRows([...this.localRows(), row]);
		return row;
	}

	private updateLocal(id: string, patch: Partial<T>): T {
		const rows = this.localRows();
		const idx = rows.findIndex(r => r.id === id);
		if (idx === -1) throw new Error("Elemento non trovato");
		rows[idx] = { ...rows[idx], ...patch };
		this.saveLocalRows(rows);
		return rows[idx];
	}

	private activateLocal() {
		this.localMode = true;
	}

	/** Carica su Supabase le righe create offline mentre la tabella non esisteva. */
	private async syncLocalRows(userId: string): Promise<T[]> {
		const pending = this.localRows().filter(r => !r.user_id || r.user_id === userId);
		if (!pending.length) return [];
		const synced: T[] = [];
		const remaining: T[] = [];
		for (const row of pending) {
			const { id, ...rest } = row;
			const { data, error } = await this.client.from(this.table).insert([{ ...rest, user_id: userId }]).select().single();
			if (error || !data) remaining.push(row);
			else synced.push(data as T);
		}
		this.saveLocalRows(remaining);
		return synced;
	}

	private localRows(): T[] {
		try {
			return JSON.parse(this.readStorage(this.rowsKey) || "[]") as T[];
		} catch {
			return [];
		}
	}

	private saveLocalRows(rows: T[]) {
		this.writeStorage(this.rowsKey, JSON.stringify(rows));
	}

	private readExtras(): Record<string, Record<string, unknown>> {
		try {
			return JSON.parse(this.readStorage(this.extrasKey) || "{}");
		} catch {
			return {};
		}
	}

	private saveExtras(id: string, extra: Record<string, unknown>) {
		const all = this.readExtras();
		all[id] = { ...(all[id] || {}), ...extra };
		this.writeStorage(this.extrasKey, JSON.stringify(all));
	}

	private dropExtras(id: string) {
		const all = this.readExtras();
		if (all[id]) {
			delete all[id];
			this.writeStorage(this.extrasKey, JSON.stringify(all));
		}
	}

	private readStorage(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	private writeStorage(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// quota piena o storage non disponibile: i dati restano solo in memoria
		}
	}
}
