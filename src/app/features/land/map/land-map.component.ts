import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { FarmMapComponent, FarmMapMode } from "../../../shared/components/farm-map/farm-map.component";
import { PlantPopupCardComponent, PopupRowComponent } from "../../../shared/components/plant-popup/plant-popup.component";
import { PlantFormDialogComponent } from "../../../shared/components/plant-form-dialog/plant-form-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { NotesService } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";
import { ArnaldoService } from "../../../core/services/arnaldo.service";
import { Plant } from "../../../core/services/plants.service";
import { LAND_TABS } from "../../../core/constants/navigation";
import { PLANT_STATUSES, PLANT_STATUS_META, eventTypeMeta, formatDateIt, plantStatusMeta } from "../../../core/constants/domain";

@Component({
	selector: "app-land-map",
	standalone: true,
	imports: [FormsModule, RouterLink, PageHeaderComponent, FarmMapComponent, PlantPopupCardComponent, PopupRowComponent, PlantFormDialogComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Terreno" title="Mappa del terreno" description="Disposizione e stato di salute delle piante. Tocca una pianta per vederne la scheda rapida." [tabs]="tabs">
				<ng-container actions>
					<button
						type="button"
						(click)="toggleMove()"
						class="btn"
						[class]="mode() === 'move' ? 'bg-camp-terracotta text-white hover:bg-camp-bark' : 'btn-secondary'"
						[attr.aria-pressed]="mode() === 'move'"
					>
						{{ mode() === "move" ? "Fine spostamento" : "Sposta piante" }}
					</button>
					<button type="button" (click)="showAdd.set(true)" class="btn btn-primary">Aggiungi pianta</button>
				</ng-container>
			</app-page-header>

			@if (store.isLoading() && !store.loaded()) {
				<div class="h-96 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
			} @else if (!store.farm()) {
				<div class="camp-card empty-state">
					<p class="empty-state-icon">🗺️</p>
					<p class="text-muted">Non hai ancora registrato un terreno.</p>
					<a routerLink="/onboarding" class="btn btn-primary btn-sm mt-2">Inizia onboarding</a>
				</div>
			} @else {
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
					<div class="kpi">
						<p class="kpi-label">Piante</p>
						<p class="kpi-value">{{ stats().total }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">In salute</p>
						<p class="kpi-value text-camp-success">{{ stats().healthyPct }}%</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Da osservare</p>
						<p class="kpi-value text-camp-amber">{{ stats().attenzione }}</p>
					</div>
					<div class="kpi">
						<p class="kpi-label">Sotto stress</p>
						<p class="kpi-value text-camp-error">{{ stats().stressato }}</p>
					</div>
				</div>

				<div class="camp-card card-body space-y-4">
					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<div class="relative w-full sm:w-72">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-camp-olive pointer-events-none" aria-hidden="true">🔍</span>
							<input type="text" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca per nome, specie, varietà…" aria-label="Cerca piante" class="camp-input-sm pl-9" />
						</div>
						<div class="flex flex-wrap gap-1.5">
							@for (s of statuses; track s) {
								<button
									type="button"
									(click)="toggleStatus(s)"
									class="filter-chip"
									[class.is-active]="statusFilter().has(s)"
									[attr.aria-pressed]="statusFilter().has(s)"
								>
									{{ statusMeta[s].emoji }} {{ s }}
								</button>
							}
						</div>
					</div>

					@if (mode() === "move") {
						<div class="bg-camp-terracotta/10 border border-camp-terracotta/25 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-slide-up">
							<p class="text-xs text-camp-earth"><strong class="text-camp-terracotta">Modalità spostamento:</strong> trascina le piante sui nodi del reticolo. Le nuove piante si trovano in basso a destra.</p>
							<button type="button" (click)="alignAll()" class="btn btn-secondary btn-sm">Allinea al reticolo</button>
						</div>
					}

					<app-farm-map
						#map
						[plants]="store.plants()"
						[mode]="mode()"
						[highlightIds]="highlightIds()"
						[popupTemplate]="popup"
						(plantMoved)="onMoved($event)"
						(moveRejected)="toast.info($event)"
					/>

					<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-camp-olive">
						<span class="kpi-label">Legenda</span>
						@for (s of statuses; track s) {
							<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full border-2" [class]="statusMeta[s].marker"></span>{{ s }}</span>
						}
					</div>
				</div>
			}

			<ng-template #popup let-plant let-close="close">
				<app-plant-popup-card [plant]="plant" (close)="close()">
					<app-popup-row label="Varietà">{{ plant.variety || "—" }}</app-popup-row>
					<app-popup-row label="Impianto">{{ plant.planting_year || "—" }}</app-popup-row>
					<app-popup-row label="Ultimo trattamento">{{ plant.last_treatment_type ? plant.last_treatment_type + " · " + formatDate(plant.last_treatment_at) : "—" }}</app-popup-row>
					@if (lastActivity(plant); as ev) {
						<app-popup-row label="Ultima attività">{{ typeMeta(ev.type).icon }} {{ ev.title }} · {{ formatDate(ev.start) }}</app-popup-row>
					}
					<app-popup-row label="Note">{{ notesCount(plant) }}</app-popup-row>
					<div popupActions>
						<p class="kpi-label mb-1.5">Aggiorna stato</p>
						<div class="grid grid-cols-3 gap-1.5">
							@for (s of quickStatuses; track s) {
								<button
									type="button"
									(click)="setStatus(plant, s)"
									class="filter-chip justify-center px-2"
									[class.is-active]="plant.status === s"
									[attr.aria-pressed]="plant.status === s"
								>
									{{ statusMeta[s].emoji }} {{ s }}
								</button>
							}
						</div>
					</div>
				</app-plant-popup-card>
			</ng-template>

			@if (showAdd()) {
				<app-plant-form-dialog (close)="showAdd.set(false)" (saved)="onAdded()" />
			}
		</div>
	`
})
export class LandMapComponent implements OnInit, OnDestroy {
	readonly store = inject(FarmStore);
	readonly toast = inject(ToastService);
	private ops = inject(OperationsStore);
	private notes = inject(NotesService);
	private arnaldo = inject(ArnaldoService);

	readonly tabs = LAND_TABS;
	readonly statuses = PLANT_STATUSES;
	readonly quickStatuses = PLANT_STATUSES.filter(s => s !== "Non Valutato");
	readonly statusMeta = PLANT_STATUS_META;

	readonly mode = signal<FarmMapMode>("view");
	readonly search = signal("");
	readonly statusFilter = signal<Set<string>>(new Set());
	readonly showAdd = signal(false);
	readonly stats = this.store.healthStats;

	readonly highlightIds = computed(() => {
		const q = this.search().toLowerCase().trim();
		const statuses = this.statusFilter();
		if (!q && !statuses.size) return null;
		return new Set(
			this.store
				.plants()
				.filter(p => (!statuses.size || statuses.has(p.status || "Non Valutato")) && (!q || [p.name, p.species, p.variety, p.status].some(v => (v || "").toLowerCase().includes(q))))
				.map(p => p.id!)
		);
	});

	constructor() {
		// In spostamento il pulsante di Arnaldo coprirebbe l'angolo dove compaiono le nuove piante
		effect(() => this.arnaldo.setFabVisible(this.mode() !== "move"), { allowSignalWrites: true });
	}

	ngOnDestroy() {
		this.arnaldo.setFabVisible(true);
	}

	ngOnInit() {
		this.store.ensureLoaded();
		this.ops.load();
		this.notes.load();
	}

	toggleMove() {
		this.mode.set(this.mode() === "move" ? "view" : "move");
	}

	toggleStatus(status: string) {
		const next = new Set(this.statusFilter());
		next.has(status) ? next.delete(status) : next.add(status);
		this.statusFilter.set(next);
	}

	async onMoved(e: { plant: Plant; x: number; y: number }) {
		try {
			await this.store.movePlant(e.plant.id!, e.x, e.y);
			this.toast.success("Posizione salvata");
		} catch {
			this.toast.error("Impossibile salvare la posizione");
		}
	}

	async alignAll() {
		try {
			await this.store.alignAll();
			this.toast.success("Piante allineate al reticolo");
		} catch {
			this.toast.error("Errore durante l'allineamento");
		}
	}

	async setStatus(plant: Plant, status: string) {
		try {
			await this.store.updatePlant(plant.id!, { status });
			this.toast.success(`Stato di ${plant.name}: ${status}`);
		} catch {
			this.toast.error("Impossibile aggiornare lo stato");
		}
	}

	onAdded() {
		this.mode.set("move");
	}

	lastActivity(plant: Plant) {
		return this.ops.lastDoneForPlant(plant.id!);
	}

	notesCount(plant: Plant): number {
		return this.notes.forPlant(plant.id!).length;
	}

	typeMeta = eventTypeMeta;
	formatDate = (v?: string | null) => formatDateIt(v);
	statusOf = plantStatusMeta;
}
