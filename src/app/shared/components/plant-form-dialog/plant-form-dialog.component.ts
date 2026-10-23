import { Component, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../camp-dialog/camp-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { Plant } from "../../../core/services/plants.service";
import { ToastService } from "../../../core/services/toast.service";
import { PLANT_SPECIES, PLANT_STATUSES } from "../../../core/constants/domain";

/** Dialog unico per creare o modificare l'anagrafica di una pianta. */
@Component({
	selector: "app-plant-form-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog [title]="plant() ? 'Modifica pianta' : 'Nuova pianta'" subtitle="Anagrafica" icon="🌳" maxWidth="max-w-2xl" (close)="close.emit()">
			<form id="plantForm" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label class="sm:col-span-2 block">
					<span class="camp-label">Nome{{ plant() ? "" : " (opzionale)" }}</span>
					<input class="camp-input" name="name" [(ngModel)]="form.name" placeholder="Es. Olivo secolare del pozzo" />
				</label>
				<label class="block">
					<span class="camp-label">Specie</span>
					<select class="camp-input" name="species" [(ngModel)]="form.species">
						@for (s of species; track s) {
							<option [value]="s">{{ s }}</option>
						}
					</select>
				</label>
				<label class="block">
					<span class="camp-label">Varietà / cultivar</span>
					<input class="camp-input" name="variety" [(ngModel)]="form.variety" placeholder="Es. Leccino, Frantoio, Coratina" />
				</label>
				<label class="block">
					<span class="camp-label">Anno d'impianto</span>
					<input class="camp-input" type="number" name="planting_year" [(ngModel)]="form.planting_year" min="1500" [max]="currentYear" placeholder="Es. 1985" />
				</label>
				<label class="block">
					<span class="camp-label">Stato di salute</span>
					<select class="camp-input" name="status" [(ngModel)]="form.status">
						@for (s of statuses; track s) {
							<option [value]="s">{{ s }}</option>
						}
					</select>
				</label>
				@if (!plant()) {
					<label class="block">
						<span class="camp-label">Quantità</span>
						<input class="camp-input" type="number" name="quantity" [(ngModel)]="form.quantity" min="1" max="100" />
						<span class="camp-helper">Le nuove piante compaiono in basso a destra nella mappa: poi spostale nel punto giusto.</span>
					</label>
				}
				<label class="sm:col-span-2 block">
					<span class="camp-label">Descrizione</span>
					<textarea class="camp-input" rows="3" name="description" [(ngModel)]="form.description" placeholder="Caratteristiche, posizione, particolarità…"></textarea>
				</label>
			</form>

			<div footer class="dialog-footer">
				<button type="button" (click)="close.emit()" class="btn btn-secondary">Annulla</button>
				<button type="submit" form="plantForm" [disabled]="saving()" class="btn btn-primary">
					{{ saving() ? "Salvataggio…" : "Salva" }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class PlantFormDialogComponent implements OnInit {
	private store = inject(FarmStore);
	private toast = inject(ToastService);

	readonly plant = input<Plant | null>(null);
	readonly close = output<void>();
	readonly saved = output<Plant[]>();

	readonly species = PLANT_SPECIES;
	readonly statuses = PLANT_STATUSES;
	readonly currentYear = new Date().getFullYear();
	readonly saving = signal(false);

	form = {
		name: "",
		species: "Olivo",
		variety: "",
		planting_year: null as number | null,
		status: "Ottimo",
		description: "",
		quantity: 1
	};

	ngOnInit() {
		const p = this.plant();
		if (p) {
			this.form = {
				name: p.name,
				species: p.species || "Olivo",
				variety: p.variety || "",
				planting_year: p.planting_year ?? null,
				status: p.status || "Non Valutato",
				description: p.description || "",
				quantity: 1
			};
		}
	}

	async save() {
		this.saving.set(true);
		const base = {
			species: this.form.species,
			variety: this.form.variety.trim() || null,
			planting_year: this.form.planting_year ? Number(this.form.planting_year) : null,
			status: this.form.status,
			description: this.form.description.trim() || null
		};
		try {
			const p = this.plant();
			if (p?.id) {
				const saved = await this.store.updatePlant(p.id, { ...base, name: this.form.name.trim() || p.name });
				this.toast.success("Anagrafica aggiornata");
				this.saved.emit([saved]);
			} else {
				const qty = Math.max(1, Math.min(100, Number(this.form.quantity) || 1));
				const start = this.store.plants().length + 1;
				const name = this.form.name.trim();
				const inputs = Array.from({ length: qty }, (_, i) => ({
					...base,
					name: name ? (qty > 1 ? `${name} ${i + 1}` : name) : `${this.form.species} ${start + i}`
				}));
				const created = await this.store.addPlants(inputs);
				this.toast.success(qty > 1 ? `${qty} piante aggiunte: le trovi in basso a destra nella mappa` : "Pianta aggiunta: la trovi in basso a destra nella mappa");
				this.saved.emit(created);
			}
			this.close.emit();
		} catch (err) {
			console.error(err);
			this.toast.error("Impossibile salvare la pianta");
		} finally {
			this.saving.set(false);
		}
	}
}
