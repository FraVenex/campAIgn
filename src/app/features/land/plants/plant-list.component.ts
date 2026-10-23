import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { PlantFormDialogComponent } from "../../../shared/components/plant-form-dialog/plant-form-dialog.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { NotesService } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";
import { Plant } from "../../../core/services/plants.service";
import { LAND_TABS } from "../../../core/constants/navigation";
import { PLANT_STATUSES, formatDateIt, plantStatusMeta } from "../../../core/constants/domain";

type SortKey = "name" | "species" | "planting_year" | "status" | "last_treatment_at";

@Component({
	selector: "app-plant-list",
	standalone: true,
	imports: [FormsModule, RouterLink, PageHeaderComponent, PlantFormDialogComponent, ConfirmDialogComponent, ChipComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Terreno" title="Lista piante" description="Anagrafica completa delle piante del terreno." [tabs]="tabs">
				<ng-container actions>
					<button type="button" (click)="openCreate()" class="btn btn-primary">Aggiungi pianta</button>
				</ng-container>
			</app-page-header>

			<div class="camp-card card-body space-y-4">
				<div class="flex flex-col lg:flex-row lg:items-center gap-3">
					<div class="relative w-full lg:w-80">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-camp-olive pointer-events-none" aria-hidden="true">🔍</span>
						<input type="text" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca nome, specie, varietà…" aria-label="Cerca piante" class="camp-input-sm pl-9" />
					</div>
					<div class="flex flex-wrap gap-2">
						<select class="camp-input-sm !w-auto" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" aria-label="Filtra per stato">
							<option value="">Tutti gli stati</option>
							@for (s of statuses; track s) {
								<option [value]="s">{{ s }}</option>
							}
						</select>
						<select class="camp-input-sm !w-auto" [ngModel]="speciesFilter()" (ngModelChange)="speciesFilter.set($event)" aria-label="Filtra per specie">
							<option value="">Tutte le specie</option>
							@for (s of speciesOptions(); track s) {
								<option [value]="s">{{ s }}</option>
							}
						</select>
					</div>
					<p class="lg:ml-auto text-xs text-camp-olive">{{ rows().length }} di {{ store.plants().length }} {{ store.plants().length === 1 ? "pianta" : "piante" }}</p>
				</div>

				@if (selected().size > 0) {
					<div class="flex flex-wrap items-center gap-2 bg-camp-earth text-white rounded-xl px-4 py-2.5 animate-slide-up">
						<span class="text-sm font-bold mr-2">{{ selected().size }} {{ selected().size === 1 ? "selezionata" : "selezionate" }}</span>
						<select class="bg-white/10 border border-white/20 rounded-lg text-xs px-2 py-1.5" [ngModel]="''" (ngModelChange)="bulkStatus($event)" aria-label="Imposta stato">
							<option value="" disabled>Imposta stato…</option>
							@for (s of statuses; track s) {
								<option [value]="s" class="text-camp-earth">{{ s }}</option>
							}
						</select>
						<button type="button" (click)="askDeleteSelected()" class="btn btn-danger btn-sm">Elimina</button>
						<button type="button" (click)="clearSelection()" class="btn btn-sm ml-auto text-white/85 hover:bg-white/10">Annulla</button>
					</div>
				}

				@if (store.isLoading() && !store.loaded()) {
					<div class="h-64 bg-camp-sand/20 animate-pulse rounded-camp"></div>
				} @else if (!rows().length) {
					<div class="empty-state">
						<p class="empty-state-icon">🌳</p>
						<p class="text-muted">{{ store.plants().length ? "Nessuna pianta corrisponde ai filtri." : "Non hai ancora inserito piante." }}</p>
						@if (!store.plants().length) {
							<button type="button" (click)="openCreate()" class="btn btn-primary btn-sm mt-2">Aggiungi la prima pianta</button>
						}
					</div>
				} @else {
					<!-- Desktop: tabella -->
					<div class="hidden md:block overflow-x-auto -mx-1">
						<table class="data-table">
							<thead>
								<tr>
									<th class="w-8"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" aria-label="Seleziona tutte" class="accent-camp-sage" /></th>
									@for (col of columns; track col.key) {
										<th [attr.aria-sort]="sortKey() === col.key ? (sortAsc() ? 'ascending' : 'descending') : null">
											<button type="button" (click)="sortBy(col.key)" class="flex items-center gap-1 [text-transform:inherit] hover:text-camp-earth cursor-pointer">
												{{ col.label }}
												@if (sortKey() === col.key) {
													<span>{{ sortAsc() ? "▲" : "▼" }}</span>
												}
											</button>
										</th>
									}
									<th class="text-center">Interventi aperti</th>
									<th class="text-center">Note</th>
									<th><span class="sr-only">Azioni</span></th>
								</tr>
							</thead>
							<tbody>
								@for (p of rows(); track p.id) {
									<tr>
										<td><input type="checkbox" [checked]="selected().has(p.id!)" (change)="toggle(p.id!)" [attr.aria-label]="'Seleziona ' + p.name" class="accent-camp-sage" /></td>
										<td>
											<a [routerLink]="['/land/plant', p.id]" class="font-semibold text-camp-earth hover:text-camp-sage">{{ p.name }}</a>
										</td>
										<td>{{ p.species }}@if (p.variety) {<span class="text-camp-olive"> · {{ p.variety }}</span>}</td>
										<td>{{ p.planting_year || "—" }}</td>
										<td><app-chip [label]="p.status || 'Non Valutato'" [tone]="statusOf(p.status).tone" /></td>
										<td class="text-xs">{{ p.last_treatment_type ? p.last_treatment_type + " · " + formatDate(p.last_treatment_at) : "—" }}</td>
										<td class="text-center">{{ openCount(p) || "—" }}</td>
										<td class="text-center">{{ notesCount(p) || "—" }}</td>
										<td>
											<div class="flex items-center justify-end gap-1">
												<a [routerLink]="['/land/plant', p.id]" title="Apri scheda" [attr.aria-label]="'Apri scheda di ' + p.name" class="btn btn-ghost btn-icon btn-sm">🔎</a>
												<button type="button" (click)="editing.set(p)" title="Modifica anagrafica" [attr.aria-label]="'Modifica ' + p.name" class="btn btn-ghost btn-icon btn-sm">✏️</button>
												<button type="button" (click)="confirmDelete.set([p.id!])" title="Elimina" [attr.aria-label]="'Elimina ' + p.name" class="btn btn-ghost btn-icon btn-sm hover:bg-camp-error-light">🗑</button>
											</div>
										</td>
									</tr>
								}
							</tbody>
						</table>
					</div>

					<!-- Mobile: card -->
					<div class="md:hidden space-y-2.5">
						@for (p of rows(); track p.id) {
							<div class="rounded-xl border border-camp-sand/50 bg-white p-3.5">
								<div class="flex items-start justify-between gap-3">
									<div class="flex items-start gap-2.5 min-w-0">
										<input type="checkbox" [checked]="selected().has(p.id!)" (change)="toggle(p.id!)" class="mt-1 accent-camp-sage" [attr.aria-label]="'Seleziona ' + p.name" />
										<div class="min-w-0">
											<a [routerLink]="['/land/plant', p.id]" class="font-semibold text-camp-earth block truncate">{{ p.name }}</a>
											<p class="text-xs text-camp-olive truncate">{{ p.species }}{{ p.variety ? " · " + p.variety : "" }}{{ p.planting_year ? " · " + p.planting_year : "" }}</p>
										</div>
									</div>
									<app-chip [label]="p.status || 'Non Valutato'" [tone]="statusOf(p.status).tone" />
								</div>
								<div class="flex items-center justify-between mt-3 pt-2.5 border-t border-camp-sand/30">
									<p class="text-xs text-camp-olive">{{ openCount(p) }} {{ openCount(p) === 1 ? "intervento aperto" : "interventi aperti" }} · {{ notesCount(p) }} {{ notesCount(p) === 1 ? "nota" : "note" }}</p>
									<div class="flex gap-1">
										<a [routerLink]="['/land/plant', p.id]" [attr.aria-label]="'Apri scheda di ' + p.name" class="btn btn-ghost btn-icon btn-sm">🔎</a>
										<button type="button" (click)="editing.set(p)" [attr.aria-label]="'Modifica ' + p.name" class="btn btn-ghost btn-icon btn-sm">✏️</button>
										<button type="button" (click)="confirmDelete.set([p.id!])" [attr.aria-label]="'Elimina ' + p.name" class="btn btn-ghost btn-icon btn-sm hover:bg-camp-error-light">🗑</button>
									</div>
								</div>
							</div>
						}
					</div>
				}
			</div>

			@if (creating()) {
				<app-plant-form-dialog (close)="creating.set(false)" />
			}
			@if (editing(); as plant) {
				<app-plant-form-dialog [plant]="plant" (close)="editing.set(null)" />
			}
			@if (confirmDelete(); as ids) {
				<app-confirm-dialog
					title="Eliminare le piante?"
					[message]="deleteMessage(ids)"
					(confirm)="deletePlants(ids)"
					(cancel)="confirmDelete.set(null)"
				/>
			}
		</div>
	`
})
export class PlantListComponent implements OnInit {
	readonly store = inject(FarmStore);
	private ops = inject(OperationsStore);
	private notes = inject(NotesService);
	private toast = inject(ToastService);

	readonly tabs = LAND_TABS;
	readonly statuses = PLANT_STATUSES;
	readonly columns: { key: SortKey; label: string }[] = [
		{ key: "name", label: "Nome" },
		{ key: "species", label: "Specie / varietà" },
		{ key: "planting_year", label: "Impianto" },
		{ key: "status", label: "Stato" },
		{ key: "last_treatment_at", label: "Ultimo trattamento" }
	];

	readonly search = signal("");
	readonly statusFilter = signal("");
	readonly speciesFilter = signal("");
	readonly sortKey = signal<SortKey>("name");
	readonly sortAsc = signal(true);
	readonly selected = signal<Set<string>>(new Set());
	readonly creating = signal(false);
	readonly editing = signal<Plant | null>(null);
	readonly confirmDelete = signal<string[] | null>(null);

	readonly speciesOptions = computed(() => [...new Set(this.store.plants().map(p => p.species).filter(Boolean))].sort());

	readonly rows = computed(() => {
		const q = this.search().toLowerCase().trim();
		const status = this.statusFilter();
		const species = this.speciesFilter();
		const key = this.sortKey();
		const dir = this.sortAsc() ? 1 : -1;
		return this.store
			.plants()
			.filter(p => (!status || (p.status || "Non Valutato") === status) && (!species || p.species === species))
			.filter(p => !q || [p.name, p.species, p.variety, p.description].some(v => (v || "").toLowerCase().includes(q)))
			.sort((a, b) => {
				const va = a[key] ?? "";
				const vb = b[key] ?? "";
				if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
				return String(va).localeCompare(String(vb), "it", { numeric: true }) * dir;
			});
	});

	readonly allSelected = computed(() => this.rows().length > 0 && this.rows().every(p => this.selected().has(p.id!)));

	ngOnInit() {
		this.store.ensureLoaded();
		this.ops.load();
		this.notes.load();
	}

	askDeleteSelected() {
		this.confirmDelete.set([...this.selected()]);
	}

	clearSelection() {
		this.selected.set(new Set());
	}

	deleteMessage(ids: string[]): string {
		return ids.length === 1
			? "La pianta verrà eliminata definitivamente insieme ai collegamenti con le attività. L'operazione non è reversibile."
			: `${ids.length} piante verranno eliminate definitivamente. L'operazione non è reversibile.`;
	}

	openCreate() {
		this.creating.set(true);
	}

	sortBy(key: SortKey) {
		if (this.sortKey() === key) this.sortAsc.set(!this.sortAsc());
		else {
			this.sortKey.set(key);
			this.sortAsc.set(true);
		}
	}

	toggle(id: string) {
		const next = new Set(this.selected());
		next.has(id) ? next.delete(id) : next.add(id);
		this.selected.set(next);
	}

	toggleAll() {
		this.selected.set(this.allSelected() ? new Set() : new Set(this.rows().map(p => p.id!)));
	}

	async bulkStatus(status: string) {
		if (!status) return;
		const ids = [...this.selected()];
		try {
			await this.store.updatePlants(ids, { status });
			this.toast.success(ids.length === 1 ? "Stato aggiornato per 1 pianta" : `Stato aggiornato per ${ids.length} piante`);
			this.selected.set(new Set());
		} catch {
			this.toast.error("Impossibile aggiornare lo stato");
		}
	}

	async deletePlants(ids: string[]) {
		this.confirmDelete.set(null);
		try {
			await this.store.deletePlants(ids);
			const next = new Set(this.selected());
			ids.forEach(id => next.delete(id));
			this.selected.set(next);
			this.toast.success(ids.length === 1 ? "Pianta eliminata" : `${ids.length} piante eliminate`);
		} catch {
			this.toast.error("Impossibile eliminare");
		}
	}

	openCount(p: Plant): number {
		return this.ops.openByPlant().get(p.id!)?.length || 0;
	}

	notesCount(p: Plant): number {
		return this.notes.forPlant(p.id!).length;
	}

	statusOf = plantStatusMeta;
	formatDate = (v?: string | null) => formatDateIt(v);
}
