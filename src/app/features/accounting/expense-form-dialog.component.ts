import { Component, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";
import { Expense, ExpenseInput, ExpensesService } from "../../core/services/expenses.service";
import { ToastService } from "../../core/services/toast.service";
import { FarmStore } from "../../core/services/farm-store.service";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_META, ExpenseCategory, toLocalDateKey } from "../../core/constants/domain";

/** Dialog di inserimento/modifica di una spesa. */
@Component({
	selector: "app-expense-form-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog [title]="expense() ? 'Modifica spesa' : 'Nuova spesa'" subtitle="Contabilità" icon="💶" maxWidth="max-w-xl" (close)="close.emit()">
			<form id="expense-form" class="space-y-4" (ngSubmit)="save()">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="camp-label" for="exp-date">Data</label>
						<input id="exp-date" type="date" name="date" class="camp-input" [(ngModel)]="date" required />
					</div>
					<div>
						<label class="camp-label" for="exp-amount">Importo (€)</label>
						<input id="exp-amount" type="number" name="amount" class="camp-input" min="0" step="0.01" inputmode="decimal" placeholder="0,00" [(ngModel)]="amount" required />
					</div>
				</div>
				<div>
					<label class="camp-label" for="exp-category">Categoria</label>
					<select id="exp-category" name="category" class="camp-input" [(ngModel)]="category">
						@for (c of categories; track c) {
							<option [value]="c">{{ meta[c].icon }} {{ meta[c].label }}</option>
						}
					</select>
				</div>
				<div>
					<label class="camp-label" for="exp-description">Descrizione</label>
					<input id="exp-description" type="text" name="description" class="camp-input" placeholder="Es. Concime organico 25 kg" [(ngModel)]="description" required maxlength="200" />
				</div>
				<div>
					<label class="camp-label" for="exp-supplier">Fornitore <span class="normal-case font-normal tracking-normal text-camp-olive">(facoltativo)</span></label>
					<input id="exp-supplier" type="text" name="supplier" class="camp-input" placeholder="Es. Consorzio agrario" [(ngModel)]="supplier" maxlength="120" />
				</div>
				<div>
					<label class="camp-label" for="exp-notes">Note <span class="normal-case font-normal tracking-normal text-camp-olive">(facoltative)</span></label>
					<textarea id="exp-notes" name="notes" rows="3" class="camp-input resize-none" placeholder="Dettagli, numero fattura, quantità…" [(ngModel)]="notes"></textarea>
				</div>
				@if (error()) {
					<p class="camp-error-text">{{ error() }}</p>
				}
			</form>
			<div footer class="dialog-footer">
				<button type="button" (click)="close.emit()" class="btn btn-secondary">Annulla</button>
				<button type="submit" form="expense-form" [disabled]="saving()" class="btn btn-primary">
					{{ saving() ? "Salvataggio…" : "Salva spesa" }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class ExpenseFormDialogComponent implements OnInit {
	private expenses = inject(ExpensesService);
	private toast = inject(ToastService);
	private farmStore = inject(FarmStore);

	readonly expense = input<Expense | null>(null);
	readonly close = output<void>();
	readonly saved = output<Expense>();

	readonly categories = EXPENSE_CATEGORIES;
	readonly meta = EXPENSE_CATEGORY_META;
	readonly saving = signal(false);
	readonly error = signal<string | null>(null);

	date = toLocalDateKey(new Date());
	amount: number | null = null;
	category: ExpenseCategory = "products";
	description = "";
	supplier = "";
	notes = "";

	ngOnInit() {
		const e = this.expense();
		if (!e) return;
		this.date = (e.date || "").slice(0, 10);
		this.amount = Number(e.amount) || 0;
		this.category = e.category;
		this.description = e.description || "";
		this.supplier = e.supplier || "";
		this.notes = e.notes || "";
	}

	async save() {
		const amount = Number(this.amount);
		if (!this.date) return this.error.set("Indica la data della spesa.");
		if (!this.description.trim()) return this.error.set("Aggiungi una breve descrizione.");
		if (!isFinite(amount) || amount <= 0) return this.error.set("L'importo deve essere maggiore di zero.");
		this.error.set(null);
		this.saving.set(true);
		const payload: ExpenseInput = {
			date: this.date,
			category: this.category,
			description: this.description.trim(),
			amount: Math.round(amount * 100) / 100,
			supplier: this.supplier.trim() || null,
			notes: this.notes.trim() || null
		};
		try {
			const current = this.expense();
			const result = current?.id
				? await this.expenses.update(current.id, payload)
				: await this.expenses.add({ ...payload, farm_id: this.farmStore.farm()?.id ?? null });
			this.toast.success(current ? "Spesa aggiornata" : "Spesa registrata");
			this.saved.emit(result);
			this.close.emit();
		} catch (err: any) {
			console.error("[ExpenseForm]", err);
			this.error.set(err?.message || "Impossibile salvare la spesa.");
		} finally {
			this.saving.set(false);
		}
	}
}
