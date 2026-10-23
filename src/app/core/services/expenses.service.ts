import { Injectable, computed, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { TableRepository, RepoRow } from "./table-repository";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "../constants/domain";

export interface Expense extends RepoRow {
	farm_id?: string | null;
	date: string;
	category: ExpenseCategory;
	description: string;
	amount: number;
	supplier?: string | null;
	notes?: string | null;
}

export type ExpenseInput = Omit<Expense, "id" | "user_id" | "created_at" | "updated_at">;

/** Contabilità: spese per prodotti, attrezzi, manutenzioni e gestione del terreno. */
@Injectable({ providedIn: "root" })
export class ExpensesService {
	private auth = inject(AuthService);
	private repo = new TableRepository<Expense>(inject(SupabaseService).client, "expenses", () => this.auth.currentUser()?.id ?? null);

	readonly expenses = signal<Expense[]>([]);
	readonly loaded = signal(false);

	readonly total = computed(() => this.expenses().reduce((sum, e) => sum + Number(e.amount || 0), 0));

	readonly byCategory = computed(() =>
		EXPENSE_CATEGORIES.map(category => ({
			category,
			total: this.expenses()
				.filter(e => e.category === category)
				.reduce((sum, e) => sum + Number(e.amount || 0), 0)
		})).filter(c => c.total > 0)
	);

	async load(force = false): Promise<void> {
		if (this.loaded() && !force) return;
		try {
			this.expenses.set(await this.repo.list(q => q.order("date", { ascending: false })));
		} catch (err) {
			console.error("[ExpensesService]", err);
			this.expenses.set([]);
		}
		this.loaded.set(true);
	}

	totalForYear(year: number): number {
		return this.expenses()
			.filter(e => new Date(e.date).getFullYear() === year)
			.reduce((sum, e) => sum + Number(e.amount || 0), 0);
	}

	async add(input: ExpenseInput): Promise<Expense> {
		const saved = await this.repo.insert(input);
		this.expenses.update(list => this.sort([saved, ...list]));
		return saved;
	}

	async update(id: string, patch: Partial<Expense>): Promise<Expense> {
		const saved = await this.repo.update(id, patch);
		this.expenses.update(list => this.sort(list.map(e => (e.id === id ? { ...e, ...saved } : e))));
		return saved;
	}

	async remove(id: string): Promise<void> {
		await this.repo.remove(id);
		this.expenses.update(list => list.filter(e => e.id !== id));
	}

	private sort(list: Expense[]): Expense[] {
		return [...list].sort((a, b) => b.date.localeCompare(a.date));
	}
}
