import { Component, OnInit, computed, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../../../shared/components/camp-dialog/camp-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { HarvestService, Harvest, HarvestInput, OIL_DENSITY } from "../../../core/services/harvest.service";
import { ExpensesService } from "../../../core/services/expenses.service";
import { ToastService } from "../../../core/services/toast.service";
import { toDateInput } from "../../../core/utils/operation-details";

export interface HarvestPrefill {
	date?: string;
	plantIds?: string[];
	notes?: string;
}

/** Dialog per registrare o modificare una raccolta: il report viene (ri)generato al salvataggio. */
@Component({
	selector: "app-harvest-form-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog [title]="harvest() ? 'Modifica raccolta' : 'Aggiungi raccolta'" subtitle="Archivio raccolta" icon="🫒" maxWidth="max-w-2xl" (close)="close.emit()">
			<form id="harvestForm" (ngSubmit)="save()" class="space-y-5">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label class="block">
						<span class="camp-label">Data raccolta</span>
						<input class="camp-input" type="date" name="date" [(ngModel)]="form.date" required />
					</label>
					<label class="block">
						<span class="camp-label">Costo raccolta (€)</span>
						<input class="camp-input" type="number" min="0" step="0.01" name="cost" [(ngModel)]="form.cost" placeholder="Manodopera, mezzi, frantoio…" />
					</label>
					<label class="block">
						<span class="camp-label">Olive raccolte (quintali)</span>
						<input class="camp-input" type="number" min="0" step="0.01" name="quintals" [(ngModel)]="form.quintals" required />
					</label>
					<label class="block">
						<span class="camp-label">Olio ottenuto (litri)</span>
						<input class="camp-input" type="number" min="0" step="0.1" name="liters" [(ngModel)]="form.liters" required />
					</label>
				</div>

				@if (previewYield() !== null) {
					<p class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 px-3 py-2 text-xs text-camp-olive">
						Resa in olio stimata: <strong class="text-camp-earth">{{ previewYield() }}%</strong>
						@if (previewCostPerLiter() !== null) {
							· costo raccolta <strong class="text-camp-earth">{{ previewCostPerLiter() }} €/L</strong>
						}
					</p>
				}

				<div>
					<span class="camp-label">Piante coinvolte</span>
					<div class="segmented w-full sm:w-auto" role="group" aria-label="Piante coinvolte">
						<button type="button" (click)="allPlants.set(true)" class="segmented-item flex-1" [class.is-active]="allPlants()">Tutte ({{ farm.plants().length }})</button>
						<button type="button" (click)="allPlants.set(false)" class="segmented-item flex-1" [class.is-active]="!allPlants()">Solo alcune ({{ selected().size }})</button>
					</div>
					@if (!allPlants()) {
						<div class="mt-3 border border-camp-sand/60 rounded-xl overflow-hidden">
							<div class="flex items-center gap-2 px-3 py-2 bg-camp-cream/40 border-b border-camp-sand/40">
								<input type="text" [ngModel]="search()" (ngModelChange)="search.set($event)" [ngModelOptions]="{ standalone: true }" placeholder="Cerca pianta…" aria-label="Cerca pianta" class="camp-input-sm flex-1 min-w-0" />
								<button type="button" (click)="selectVisible(true)" class="btn btn-ghost btn-sm">Tutte</button>
								<button type="button" (click)="selectVisible(false)" class="btn btn-ghost btn-sm">Nessuna</button>
							</div>
							<div class="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-3 px-3 py-2">
								@for (p of visiblePlants(); track p.id) {
									<label class="flex items-center gap-2 py-1 text-xs text-camp-earth cursor-pointer">
										<input type="checkbox" class="accent-camp-sage" [checked]="selected().has(p.id!)" (change)="toggle(p.id!)" />
										<span class="truncate">{{ p.name }}{{ p.variety ? " · " + p.variety : "" }}</span>
									</label>
								} @empty {
									<p class="text-muted py-2">Nessuna pianta trovata.</p>
								}
							</div>
						</div>
					}
				</div>

				<label class="block">
					<span class="camp-label">Note</span>
					<textarea class="camp-input" rows="3" name="notes" [(ngModel)]="form.notes" placeholder="Frantoio, metodo di raccolta, condizioni delle olive…"></textarea>
				</label>
			</form>

			<div footer class="dialog-footer">
				<button type="button" (click)="close.emit()" class="btn btn-secondary">Annulla</button>
				<button type="submit" form="harvestForm" [disabled]="saving()" class="btn btn-primary">
					{{ saving() ? "Salvataggio…" : harvest() ? "Salva e rigenera report" : "Salva e genera report" }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class HarvestFormDialogComponent implements OnInit {
	readonly farm = inject(FarmStore);
	private harvests = inject(HarvestService);
	private expenses = inject(ExpensesService);
	private toast = inject(ToastService);

	readonly harvest = input<Harvest | null>(null);
	readonly prefill = input<HarvestPrefill | null>(null);
	readonly close = output<void>();
	readonly saved = output<Harvest>();

	readonly saving = signal(false);
	readonly allPlants = signal(true);
	readonly selected = signal<Set<string>>(new Set());
	readonly search = signal("");

	form = { date: toDateInput(), quintals: null as number | null, liters: null as number | null, cost: null as number | null, notes: "" };

	readonly visiblePlants = computed(() => {
		const q = this.search().toLowerCase().trim();
		return this.farm.plants().filter(p => !q || [p.name, p.variety, p.species].some(v => (v || "").toLowerCase().includes(q)));
	});

	ngOnInit() {
		const h = this.harvest();
		const pre = this.prefill();
		const total = this.farm.plants().length;
		if (h) {
			this.form = { date: h.date.slice(0, 10), quintals: h.quintals, liters: h.liters, cost: h.cost, notes: h.notes || "" };
			this.setPlants(h.plant_ids || [], total);
		} else if (pre) {
			if (pre.date) this.form.date = pre.date;
			if (pre.notes) this.form.notes = pre.notes;
			this.setPlants(pre.plantIds || [], total);
		}
	}

	private setPlants(ids: string[], total: number) {
		const valid = ids.filter(id => this.farm.getPlant(id));
		this.selected.set(new Set(valid));
		this.allPlants.set(!valid.length || valid.length >= total);
	}

	previewYield(): string | null {
		const q = Number(this.form.quintals);
		const l = Number(this.form.liters);
		return q > 0 && l > 0 ? (((l * OIL_DENSITY) / (q * 100)) * 100).toFixed(1) : null;
	}

	previewCostPerLiter(): string | null {
		const c = Number(this.form.cost);
		const l = Number(this.form.liters);
		return c > 0 && l > 0 ? (c / l).toFixed(2) : null;
	}

	toggle(id: string) {
		const next = new Set(this.selected());
		next.has(id) ? next.delete(id) : next.add(id);
		this.selected.set(next);
	}

	selectVisible(on: boolean) {
		const next = new Set(this.selected());
		for (const p of this.visiblePlants()) on ? next.add(p.id!) : next.delete(p.id!);
		this.selected.set(next);
	}

	async save() {
		const quintals = Number(this.form.quintals);
		const liters = Number(this.form.liters);
		const cost = Number(this.form.cost) || 0;
		if (!this.form.date) return this.toast.error("Inserisci la data della raccolta");
		if (!(quintals > 0) || !(liters >= 0)) return this.toast.error("Inserisci quintali e litri validi");
		if (!this.allPlants() && !this.selected().size) return this.toast.error("Seleziona almeno una pianta");

		const plantIds = this.allPlants() ? this.farm.plants().map(p => p.id!) : [...this.selected()];
		const year = new Date(this.form.date).getFullYear();

		this.saving.set(true);
		try {
			await this.expenses.load();
			const context = { totalPlants: this.farm.plants().length, annualExpenses: this.expenses.totalForYear(year) };
			const payload: HarvestInput = {
				farm_id: this.farm.farm()?.id ?? null,
				date: this.form.date,
				quintals,
				liters,
				cost,
				plant_ids: plantIds,
				notes: this.form.notes.trim() || null
			};
			const h = this.harvest();
			const saved = h?.id ? await this.harvests.update(h.id, payload, context) : await this.harvests.add(payload, context);
			this.toast.success(h ? "Raccolta aggiornata e report rigenerato" : "Raccolta registrata: report generato");
			this.saved.emit(saved);
			this.close.emit();
		} catch (err) {
			console.error(err);
			this.toast.error("Impossibile salvare la raccolta");
		} finally {
			this.saving.set(false);
		}
	}
}
