import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { NgApexchartsModule } from "ng-apexcharts";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { PlantFormDialogComponent } from "../../../shared/components/plant-form-dialog/plant-form-dialog.component";
import { OperationFormDialogComponent } from "../../../shared/components/operation-form-dialog/operation-form-dialog.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { CampDialogComponent } from "../../../shared/components/camp-dialog/camp-dialog.component";
import { QuickNoteComponent } from "../../../shared/components/quick-note/quick-note.component";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { PhotoPickerComponent } from "../../../shared/components/photo-picker/photo-picker.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { NotesService, Note } from "../../../core/services/notes.service";
import { PhotosService, Photo } from "../../../core/services/photos.service";
import { HarvestService } from "../../../core/services/harvest.service";
import { ToastService } from "../../../core/services/toast.service";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { EVENT_TYPE_META, EventType, eventTypeMeta, NOTE_COLOR_CLASS, PLANT_STATUSES, PLANT_STATUS_META, WORK_STATUS_META, WorkStatus, formatDateIt, plantStatusMeta } from "../../../core/constants/domain";
import { parseOperationDescription } from "../../../core/utils/operation-details";

interface StagedPhoto {
	file: File;
	preview: string;
	caption: string;
}

type DeleteTarget = { kind: "plant" } | { kind: "note"; note: Note } | { kind: "photo"; photo: Photo } | { kind: "event"; event: CalendarEvent };

@Component({
	selector: "app-plant-detail",
	standalone: true,
	imports: [
		FormsModule,
		RouterLink,
		NgApexchartsModule,
		PageHeaderComponent,
		PlantFormDialogComponent,
		OperationFormDialogComponent,
		ConfirmDialogComponent,
		CampDialogComponent,
		QuickNoteComponent,
		ChipComponent,
		PhotoPickerComponent
	],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			@if (store.isLoading() && !store.loaded()) {
				<div class="h-10 w-64 bg-camp-sand/30 animate-pulse rounded-camp"></div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="h-64 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
					<div class="h-64 bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
				</div>
			} @else if (!plant()) {
				<div class="camp-card empty-state max-w-lg mx-auto">
					<p class="empty-state-icon">🌳</p>
					<p class="text-sm font-semibold text-camp-earth">Pianta non trovata</p>
					<p class="text-muted">Potrebbe essere stata eliminata.</p>
					<a routerLink="/land/plants" class="btn btn-primary btn-sm mt-2">Torna alla lista piante</a>
				</div>
			} @else {
				<div>
					<a routerLink="/land/plants" class="btn btn-ghost btn-sm -ml-3 mb-1">← Lista piante</a>
					<app-page-header section="Scheda pianta" [title]="plant()!.name" [description]="subtitle()">
						<ng-container actions>
							<button type="button" (click)="editing.set(true)" class="btn btn-secondary">Modifica</button>
							<button type="button" (click)="openOperation()" class="btn btn-primary">Programma intervento</button>
						</ng-container>
					</app-page-header>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
					<!-- Anagrafica -->
					<section class="camp-card card-body lg:col-span-1">
						<div class="flex items-center gap-4 pb-4 mb-4 border-b border-camp-sand/40">
							<div class="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl shrink-0" [class]="statusMeta().marker">🌳</div>
							<div class="min-w-0">
								<p class="eyebrow">Anagrafica</p>
								<h2 class="section-title truncate">{{ plant()!.name }}</h2>
								<app-chip [label]="plant()!.status || 'Non Valutato'" [tone]="statusMeta().tone" />
							</div>
						</div>
						<dl class="space-y-2.5 text-sm">
							@for (row of registry(); track row.label) {
								<div class="flex justify-between gap-3">
									<dt class="kpi-label pt-0.5">{{ row.label }}</dt>
									<dd class="text-camp-earth text-right">{{ row.value }}</dd>
								</div>
							}
						</dl>
						@if (plant()!.description) {
							<p class="mt-4 pt-4 border-t border-camp-sand/40 text-sm text-camp-earth leading-relaxed">{{ plant()!.description }}</p>
						}
						<div class="mt-4 pt-4 border-t border-camp-sand/40 flex gap-2">
							<a routerLink="/land/map" class="btn btn-secondary btn-sm flex-1">Vedi in mappa</a>
							<button type="button" (click)="deleteTarget.set({ kind: 'plant' })" class="btn btn-danger-soft btn-sm">Elimina</button>
						</div>
					</section>

					<!-- Stato e indicatori -->
					<section class="camp-card card-body lg:col-span-2 space-y-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="eyebrow">Stato di salute</p>
								<h2 class="font-serif text-2xl text-camp-earth tracking-tight">{{ statusMeta().emoji }} {{ plant()!.status || "Non Valutato" }}</h2>
							</div>
							<div class="flex flex-wrap gap-1.5">
								@for (s of statuses; track s) {
									<button
										type="button"
										(click)="setStatus(s)"
										class="filter-chip"
										[class.is-active]="plant()!.status === s"
										[attr.aria-pressed]="plant()!.status === s"
									>
										{{ statusMetaOf(s).emoji }} {{ s }}
									</button>
								}
							</div>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
							@for (k of kpis(); track k.label) {
								<div class="rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3">
									<p class="kpi-label">{{ k.label }}</p>
									<p class="kpi-value text-xl">{{ k.value }}</p>
									@if (k.hint) {
										<p class="kpi-hint">{{ k.hint }}</p>
									}
								</div>
							}
						</div>

						<div class="rounded-xl bg-camp-sage/5 border border-camp-sage/20 p-4 flex gap-3">
							<img src="assets/Arnaldo.jpg" alt="Arnaldo" class="w-10 h-10 rounded-full object-cover shrink-0" />
							<div>
								<p class="eyebrow text-camp-sage mb-1">Arnaldo dice</p>
								<p class="text-sm text-camp-earth leading-relaxed">{{ advice() }}</p>
							</div>
						</div>
					</section>
				</div>

				<!-- Grafici -->
				<section class="camp-card card-body">
					<div class="section-head">
						<div>
							<p class="eyebrow">Andamento agronomico</p>
							<h2 class="section-title">Interventi e produzione</h2>
						</div>
					</div>
					@if (!events().length && !productionByYear().length) {
						<div class="empty-state">
							<p class="empty-state-icon">📊</p>
							<p class="text-muted">Nessun dato ancora: i grafici compariranno con i primi interventi e raccolte.</p>
						</div>
					} @else {
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div class="lg:col-span-2">
								<p class="kpi-label mb-2">Interventi negli ultimi 12 mesi</p>
								<apx-chart
									[series]="monthlySeries()"
									[chart]="{ type: 'bar', height: 240, stacked: true, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' }"
									[xaxis]="{ categories: monthLabels(), labels: { style: { colors: '#A5A58D', fontSize: '11px' } } }"
									[yaxis]="{ labels: { style: { colors: '#A5A58D' } }, forceNiceScale: true, min: 0 }"
									[colors]="typeColors"
									[plotOptions]="{ bar: { borderRadius: 4, columnWidth: '55%' } }"
									[dataLabels]="{ enabled: false }"
									[legend]="{ position: 'bottom', fontSize: '11px' }"
									[grid]="{ borderColor: '#E8E4D9', strokeDashArray: 4 }"
								></apx-chart>
							</div>
							<div>
								<p class="kpi-label mb-2">Esito degli interventi</p>
								<apx-chart
									[series]="outcomeSeries()"
									[labels]="outcomeLabels"
									[chart]="{ type: 'donut', height: 240, fontFamily: 'Inter, sans-serif' }"
									[colors]="['#4A7A5B', '#5B7DB1', '#C9A96E', '#A0413A', '#A5A58D']"
									[legend]="{ position: 'bottom', fontSize: '11px' }"
									[dataLabels]="{ enabled: false }"
								></apx-chart>
							</div>
							@if (productionByYear().length) {
								<div class="lg:col-span-3">
									<p class="kpi-label mb-2">Produzione stimata per anno (kg di olive e litri d'olio per pianta)</p>
									<apx-chart
										[series]="productionSeries()"
										[chart]="{ type: 'line', height: 230, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' }"
										[xaxis]="{ categories: productionYears() }"
										[stroke]="{ width: [0, 3], curve: 'smooth' }"
										[colors]="['#6B705C', '#C9A96E']"
										[plotOptions]="{ bar: { borderRadius: 4, columnWidth: '40%' } }"
										[dataLabels]="{ enabled: false }"
										[legend]="{ position: 'bottom', fontSize: '11px' }"
										[grid]="{ borderColor: '#E8E4D9', strokeDashArray: 4 }"
									></apx-chart>
								</div>
							}
						</div>
					}
				</section>

				<div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
					<!-- Storico interventi -->
					<section class="camp-card card-body lg:col-span-3">
						<div class="section-head">
							<div>
								<p class="eyebrow">Storico</p>
								<h2 class="section-title">Trattamenti e interventi</h2>
							</div>
							<select class="camp-input-sm !w-auto" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" aria-label="Filtra per tipo">
								<option value="">Tutti i tipi</option>
								@for (t of eventTypes; track t) {
									<option [value]="t">{{ typeMeta[t].label }}</option>
								}
							</select>
						</div>
						@if (!filteredEvents().length) {
							<div class="empty-state">
								<p class="empty-state-icon">🧪</p>
								<p class="text-muted">Nessun intervento registrato per questa pianta.</p>
							</div>
						} @else {
							<ol class="relative border-l-2 border-camp-sand/60 ml-3 space-y-4">
								@for (e of filteredEvents(); track e.id) {
									<li class="ml-5">
										<span class="absolute -left-[13px] w-6 h-6 rounded-full bg-white border-2 border-camp-sand flex items-center justify-center text-xs">{{ typeOf(e.type).icon }}</span>
										<div class="rounded-xl border border-camp-sand/40 p-3 bg-white">
											<div class="flex flex-wrap items-start justify-between gap-2">
												<div class="min-w-0">
													<p class="font-semibold text-sm text-camp-earth">{{ e.title }}</p>
													<p class="text-[11px] text-camp-olive">{{ typeOf(e.type).label }} · {{ formatDate(e.start) }}{{ (e.plant_ids?.length || 0) > 1 ? " · intervento di gruppo (" + e.plant_ids!.length + " piante)" : "" }}</p>
												</div>
												<app-chip [label]="workMeta[ops.effectiveStatus(e)].label" [icon]="workMeta[ops.effectiveStatus(e)].icon" [tone]="workMeta[ops.effectiveStatus(e)].tone" />
											</div>
											@if (details(e); as d) {
												@if (d.product || d.dose) {
													<p class="text-xs text-camp-earth mt-2">
														@if (d.product) {<span><strong>Prodotto:</strong> {{ d.product }}</span>}
														@if (d.dose) {<span class="ml-2"><strong>Dose:</strong> {{ d.dose }}</span>}
													</p>
												}
												@if (d.notes) {
													<p class="text-xs text-camp-olive mt-1 whitespace-pre-line">{{ d.notes }}</p>
												}
											}
											<div class="flex flex-wrap gap-1.5 mt-2.5">
												@for (s of quickWorkStatuses; track s) {
													@if ((e.work_status || "todo") !== s) {
														<button type="button" (click)="setWorkStatus(e, s)" class="filter-chip">{{ workMeta[s].icon }} {{ workMeta[s].label }}</button>
													}
												}
												<button type="button" (click)="editingEvent.set(e)" class="btn btn-ghost btn-sm">Modifica</button>
												<button type="button" (click)="deleteTarget.set({ kind: 'event', event: e })" aria-label="Elimina intervento" title="Elimina" class="btn btn-ghost btn-icon btn-sm hover:bg-camp-error-light">🗑</button>
											</div>
										</div>
									</li>
								}
							</ol>
						}
					</section>

					<!-- Note -->
					<section class="camp-card card-body lg:col-span-2">
						<div class="section-head">
							<div>
								<p class="eyebrow">Diario della pianta</p>
								<h2 class="section-title">Note</h2>
							</div>
						</div>
						<app-quick-note [plantId]="plant()!.id!" [farmId]="plant()!.farm_id" placeholder="Aggiungi un'osservazione…" />
						<div class="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
							@for (n of plantNotes(); track n.id) {
								<div class="rounded-xl border p-3 group" [class]="noteClass">
									<p class="text-sm text-camp-earth whitespace-pre-line">{{ n.content }}</p>
									<div class="flex items-center justify-between mt-2">
										<span class="text-[11px] text-camp-olive">{{ formatDate(n.created_at) }}</span>
										<button type="button" (click)="deleteTarget.set({ kind: 'note', note: n })" aria-label="Elimina nota" title="Elimina" class="btn btn-ghost btn-icon btn-sm hover:bg-camp-error-light">🗑</button>
									</div>
								</div>
							} @empty {
								<p class="text-muted text-center py-6">Nessuna nota. Annota osservazioni, sintomi e lavori fatti.</p>
							}
						</div>
					</section>
				</div>

				<!-- Foto -->
				<section class="camp-card card-body">
					<div class="section-head">
						<div>
							<p class="eyebrow">Galleria</p>
							<h2 class="section-title">Foto della pianta</h2>
						</div>
						<app-photo-picker [small]="true" (picked)="stage($event)" />
					</div>
					<div
						class="hidden md:block border-2 border-dashed rounded-camp-lg p-5 text-center text-sm text-camp-olive mb-4 transition-colors"
						[class]="dragOver() ? 'border-camp-sage bg-camp-cream' : 'border-camp-sand'"
						(dragover)="$event.preventDefault(); dragOver.set(true)"
						(dragleave)="dragOver.set(false)"
						(drop)="onDrop($event)"
					>
						Trascina qui una o più immagini: potrai aggiungere una didascalia a ciascuna.
					</div>
					@if (photos().length) {
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
							@for (photo of photos(); track photo.id) {
								<figure class="rounded-xl overflow-hidden border border-camp-sand/40 bg-white group">
									<button type="button" (click)="openLightbox(photo)" class="block w-full aspect-square overflow-hidden cursor-zoom-in">
										<img [src]="photo.public_url" [alt]="photo.caption || 'Foto pianta'" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
									</button>
									<figcaption class="p-2 text-xs text-camp-earth flex items-start justify-between gap-2">
										<span class="line-clamp-2">{{ photo.caption || "Senza didascalia" }}</span>
										<span class="text-[11px] text-camp-olive shrink-0">{{ formatDate(photo.created_at) }}</span>
									</figcaption>
								</figure>
							}
						</div>
					} @else {
						<p class="text-muted text-center py-4">Nessuna foto ancora.</p>
					}
				</section>
			}

			@if (editing() && plant()) {
				<app-plant-form-dialog [plant]="plant()" (close)="editing.set(false)" />
			}
			@if (operationOpen() && plant()) {
				<app-operation-form-dialog [plantIds]="[plant()!.id!]" [types]="allTypes" defaultType="treatment" (close)="operationOpen.set(false)" />
			}
			@if (editingEvent(); as ev) {
				<app-operation-form-dialog [event]="ev" [plantIds]="ev.plant_ids || []" [types]="allTypes" (close)="editingEvent.set(null)" />
			}
			@if (staged().length) {
				<app-camp-dialog title="Aggiungi didascalie" subtitle="Nuove foto" icon="📷" maxWidth="max-w-2xl" (close)="clearStaged()">
					<div class="space-y-3">
						@for (item of staged(); track item.preview; let i = $index) {
							<div class="flex gap-3 items-center">
								<img [src]="item.preview" alt="" class="w-20 h-20 rounded-lg object-cover shrink-0" />
								<input class="camp-input" [ngModel]="item.caption" (ngModelChange)="setCaption(i, $event)" placeholder="Didascalia (es. Rametto con occhio di pavone)" />
								<button type="button" (click)="removeStaged(i)" aria-label="Rimuovi foto" class="btn btn-ghost btn-icon shrink-0 hover:bg-camp-error-light">✕</button>
							</div>
						}
					</div>
					<div footer class="dialog-footer">
						<button type="button" (click)="clearStaged()" class="btn btn-secondary">Annulla</button>
						<button type="button" (click)="uploadStaged()" [disabled]="uploading()" class="btn btn-primary">
							{{ uploading() ? "Caricamento…" : "Carica " + staged().length + " foto" }}
						</button>
					</div>
				</app-camp-dialog>
			}
			@if (lightbox(); as photo) {
				<app-camp-dialog [title]="photo.caption || 'Foto'" [subtitle]="formatDate(photo.created_at)" icon="🖼️" maxWidth="max-w-4xl" (close)="lightbox.set(null)">
					<img [src]="photo.public_url" [alt]="photo.caption || 'Foto'" class="w-full max-h-[60vh] object-contain rounded-xl bg-camp-cream" />
					<div class="mt-4">
						<label class="camp-label" for="photo-caption">Didascalia</label>
						<input id="photo-caption" class="camp-input" [ngModel]="captionDraft()" (ngModelChange)="captionDraft.set($event)" placeholder="Didascalia" />
					</div>
					<div footer class="dialog-footer">
						<button type="button" (click)="deleteTarget.set({ kind: 'photo', photo: photo })" class="btn btn-danger-soft sm:mr-auto">Elimina foto</button>
						<button type="button" (click)="saveCaption(photo)" class="btn btn-primary">Salva didascalia</button>
					</div>
				</app-camp-dialog>
			}
			@if (deleteTarget(); as target) {
				<app-confirm-dialog [message]="deleteMessage(target)" (confirm)="confirmDelete(target)" (cancel)="deleteTarget.set(null)" />
			}
		</div>
	`
})
export class PlantDetailComponent implements OnInit {
	readonly store = inject(FarmStore);
	readonly ops = inject(OperationsStore);
	private notes = inject(NotesService);
	private photosService = inject(PhotosService);
	private harvests = inject(HarvestService);
	private toast = inject(ToastService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	readonly statuses = PLANT_STATUSES.filter(s => s !== "Non Valutato");
	readonly typeMeta = EVENT_TYPE_META;
	readonly workMeta = WORK_STATUS_META;
	readonly noteClass = NOTE_COLOR_CLASS.green;
	readonly eventTypes = Object.keys(EVENT_TYPE_META) as EventType[];
	readonly allTypes: EventType[] = ["treatment", "maintenance", "irrigation", "harvest", "other"];
	readonly quickWorkStatuses: WorkStatus[] = ["in_progress", "done", "skipped"];
	readonly typeColors = this.allTypes.map(t => EVENT_TYPE_META[t].color);
	readonly outcomeLabels = ["Svolti", "In corso", "Da svolgere", "Saltati", "In ritardo"];

	private readonly plantId = toSignal(this.route.paramMap.pipe(map(p => p.get("id"))), { initialValue: null });
	readonly plant = computed(() => (this.plantId() ? (this.store.getPlant(this.plantId()!) ?? null) : null));
	readonly statusMeta = computed(() => plantStatusMeta(this.plant()?.status));

	readonly editing = signal(false);
	readonly operationOpen = signal(false);
	readonly editingEvent = signal<CalendarEvent | null>(null);
	readonly deleteTarget = signal<DeleteTarget | null>(null);
	readonly typeFilter = signal<string>("");
	readonly staged = signal<StagedPhoto[]>([]);
	readonly uploading = signal(false);
	readonly dragOver = signal(false);
	readonly lightbox = signal<Photo | null>(null);
	readonly captionDraft = signal("");

	readonly events = computed(() => (this.plant() ? this.ops.forPlant(this.plant()!.id!) : []));
	readonly filteredEvents = computed(() => (this.typeFilter() ? this.events().filter(e => e.type === this.typeFilter()) : this.events()));
	readonly plantNotes = computed(() => {
		const p = this.plant();
		return p ? this.notes.plantNotes().filter(n => n.plant_id === p.id) : [];
	});
	readonly photos = computed(() => {
		const p = this.plant();
		return p ? this.photosService.photos().filter(ph => ph.plant_id === p.id) : [];
	});

	readonly subtitle = computed(() => {
		const p = this.plant();
		if (!p) return "";
		return [p.species, p.variety, p.planting_year ? `impiantata nel ${p.planting_year}` : null].filter(Boolean).join(" · ");
	});

	readonly registry = computed(() => {
		const p = this.plant()!;
		const age = p.planting_year ? new Date().getFullYear() - p.planting_year : null;
		return [
			{ label: "Codice", value: (p.id || "").slice(0, 8).toUpperCase() },
			{ label: "Specie", value: p.species || "—" },
			{ label: "Varietà", value: p.variety || "—" },
			{ label: "Anno d'impianto", value: p.planting_year ? `${p.planting_year} (${age} ${age === 1 ? "anno" : "anni"})` : "—" },
			{ label: "Posizione", value: `${p.position_x}% · ${p.position_y}%` },
			{ label: "Terreno", value: this.store.farm()?.name || "—" },
			{ label: "Inserita il", value: formatDateIt(p.created_at) }
		];
	});

	readonly lastTreatment = computed(() => this.events().find(e => e.type === "treatment" && (e.work_status === "done" || new Date(e.start) < new Date())) ?? null);

	readonly kpis = computed(() => {
		const evs = this.events();
		const year = new Date().getFullYear();
		const last = this.lastTreatment();
		const lastDate = last?.start || this.plant()?.last_treatment_at || null;
		const days = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;
		const open = evs.filter(e => !["done", "skipped"].includes(e.work_status || "todo")).length;
		const overdue = evs.filter(e => this.ops.effectiveStatus(e) === "overdue").length;
		return [
			{ label: "Ultimo trattamento", value: days === null ? "—" : days === 0 ? "Oggi" : `${days} gg fa`, hint: last ? last.title : this.plant()?.last_treatment_type || "" },
			{ label: "Interventi aperti", value: String(open), hint: overdue ? `${overdue} in ritardo` : "" },
			{ label: `Svolti nel ${year}`, value: String(evs.filter(e => e.work_status === "done" && new Date(e.start).getFullYear() === year).length), hint: "" },
			{ label: "Note e foto", value: `${this.plantNotes().length} · ${this.photos().length}`, hint: "" }
		];
	});

	readonly advice = computed(() => {
		const p = this.plant();
		if (!p) return "";
		const overdue = this.events().filter(e => this.ops.effectiveStatus(e) === "overdue");
		if (overdue.length) return `Hai ${overdue.length === 1 ? "un intervento rimasto indietro" : overdue.length + " interventi rimasti indietro"} su questa pianta ("${overdue[0].title}"). La terra non aspetta: segna se l'hai fatto o riprogrammalo.`;
		if (p.status === "Stressato") return `'${p.name}' è in difficoltà. Guarda radici, corteccia e sotto le foglie: se ha sete dalle da bere la sera, se vedi macchie o parassiti chiamami che valutiamo un trattamento.`;
		if (p.status === "Attenzione") return `'${p.name}' non mi convince del tutto. Tienila d'occhio nei prossimi giorni e annota quello che vedi: un trattamento preventivo leggero può bastare.`;
		const days = this.lastTreatment() ? Math.floor((Date.now() - new Date(this.lastTreatment()!.start).getTime()) / 86400000) : null;
		if (days === null || days > 120) return `'${p.name}' sta bene, ma non risultano trattamenti recenti. In autunno e a fine inverno un passaggio di rame la protegge dall'occhio di pavone.`;
		return `'${p.name}' è in forma. Continua con i lavori ordinari e lasciala crescere in pace: le piante sane vanno disturbate il meno possibile.`;
	});

	private readonly last12Months = computed(() => {
		const months: { key: string; label: string }[] = [];
		const d = new Date();
		d.setDate(1);
		for (let i = 11; i >= 0; i--) {
			const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
			months.push({ key: `${m.getFullYear()}-${m.getMonth()}`, label: m.toLocaleDateString("it-IT", { month: "short" }) });
		}
		return months;
	});
	readonly monthLabels = computed(() => this.last12Months().map(m => m.label));
	readonly monthlySeries = computed(() =>
		this.allTypes.map(type => ({
			name: EVENT_TYPE_META[type].label,
			data: this.last12Months().map(m => this.events().filter(e => e.type === type && `${new Date(e.start).getFullYear()}-${new Date(e.start).getMonth()}` === m.key).length)
		}))
	);
	readonly outcomeSeries = computed(() => {
		const statuses = this.events().map(e => this.ops.effectiveStatus(e));
		const count = (s: string) => statuses.filter(x => x === s).length;
		const values = [count("done"), count("in_progress"), count("todo"), count("skipped"), count("overdue")];
		return values.some(v => v > 0) ? values : [0, 0, 0, 0, 0];
	});

	/** Stima per pianta: raccolte che includono la pianta (o tutte le piante) ripartite sul numero di piante coinvolte. */
	readonly productionByYear = computed(() => {
		const p = this.plant();
		if (!p) return [];
		const total = this.store.plants().length || 1;
		const byYear = new Map<number, { kg: number; liters: number }>();
		for (const h of this.harvests.harvests()) {
			const involved = h.plant_ids?.length ? h.plant_ids : null;
			if (involved && !involved.includes(p.id!)) continue;
			const share = 1 / (involved?.length || total);
			const year = new Date(h.date).getFullYear();
			const cur = byYear.get(year) || { kg: 0, liters: 0 };
			byYear.set(year, { kg: cur.kg + Number(h.quintals) * 100 * share, liters: cur.liters + Number(h.liters) * share });
		}
		return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, kg: Math.round(v.kg * 10) / 10, liters: Math.round(v.liters * 100) / 100 }));
	});
	readonly productionYears = computed(() => this.productionByYear().map(r => String(r.year)));
	readonly productionSeries = computed(() => [
		{ name: "Olive (kg)", type: "column", data: this.productionByYear().map(r => r.kg) },
		{ name: "Olio (L)", type: "line", data: this.productionByYear().map(r => r.liters) }
	]);

	ngOnInit() {
		this.store.ensureLoaded();
		this.ops.load();
		this.notes.load();
		this.photosService.load();
		this.harvests.load();
	}

	typeOf = eventTypeMeta;

	statusMetaOf(status: string) {
		return PLANT_STATUS_META[status];
	}

	details(e: CalendarEvent) {
		return parseOperationDescription(e.description);
	}

	formatDate(v?: string | null): string {
		return formatDateIt(v);
	}

	openOperation() {
		this.operationOpen.set(true);
	}


	async setStatus(status: string) {
		const p = this.plant();
		if (!p?.id || p.status === status) return;
		try {
			await this.store.updatePlant(p.id, { status });
			this.toast.success(`Stato aggiornato: ${status}`);
		} catch {
			this.toast.error("Impossibile aggiornare lo stato");
		}
	}

	async setWorkStatus(e: CalendarEvent, status: WorkStatus) {
		try {
			await this.ops.setWorkStatus(e.id!, status);
			if (status === "done" && e.type === "treatment") {
				const d = parseOperationDescription(e.description);
				await this.store.updatePlants(e.plant_ids || [], { last_treatment_type: d.product || e.title, last_treatment_at: e.start });
			}
			this.toast.success(`Intervento: ${WORK_STATUS_META[status].label}`);
		} catch {
			this.toast.error("Impossibile aggiornare l'intervento");
		}
	}

	// ---- Foto ----

	onDrop(event: DragEvent) {
		event.preventDefault();
		this.dragOver.set(false);
		this.stage(Array.from(event.dataTransfer?.files || []));
	}

	stage(files: File[]) {
		const images = files.filter(f => f.type.startsWith("image/"));
		this.staged.update(list => [...list, ...images.map(file => ({ file, preview: URL.createObjectURL(file), caption: "" }))]);
	}

	setCaption(index: number, caption: string) {
		this.staged.update(list => list.map((item, i) => (i === index ? { ...item, caption } : item)));
	}

	removeStaged(index: number) {
		const item = this.staged()[index];
		if (item) URL.revokeObjectURL(item.preview);
		this.staged.update(list => list.filter((_, i) => i !== index));
	}

	clearStaged() {
		this.staged().forEach(item => URL.revokeObjectURL(item.preview));
		this.staged.set([]);
	}

	async uploadStaged() {
		const p = this.plant();
		if (!p?.id) return;
		this.uploading.set(true);
		const { uploaded, errors } = await this.photosService.upload(this.staged().map(s => ({ file: s.file, caption: s.caption.trim() })), p.id);
		this.uploading.set(false);
		this.clearStaged();
		if (uploaded.length) this.toast.success(uploaded.length === 1 ? "Foto caricata" : `${uploaded.length} foto caricate`);
		if (uploaded.some(u => u.isLocal)) this.toast.info("Foto salvate sul dispositivo: lo spazio online non è ancora configurato");
		if (errors.length) this.toast.error(errors[0]);
	}

	openLightbox(photo: Photo) {
		this.captionDraft.set(photo.caption || "");
		this.lightbox.set(photo);
	}

	async saveCaption(photo: Photo) {
		try {
			await this.photosService.updateCaption(photo, this.captionDraft().trim());
			this.lightbox.set(null);
			this.toast.success("Didascalia salvata");
		} catch {
			this.toast.error("Impossibile salvare la didascalia");
		}
	}

	// ---- Eliminazioni ----

	deleteMessage(target: DeleteTarget): string {
		switch (target.kind) {
			case "plant":
				return `Eliminare definitivamente "${this.plant()?.name}"? Verranno rimossi anche i collegamenti con attività, note e foto.`;
			case "note":
				return "Eliminare questa nota?";
			case "photo":
				return "Eliminare questa foto?";
			case "event":
				return `Eliminare l'intervento "${target.event.title}"? Verrà rimosso anche dal calendario.`;
		}
	}

	async confirmDelete(target: DeleteTarget) {
		this.deleteTarget.set(null);
		try {
			if (target.kind === "plant") {
				await this.store.deletePlants([this.plant()!.id!]);
				this.toast.success("Pianta eliminata");
				this.router.navigate(["/land/plants"]);
			} else if (target.kind === "note") {
				await this.notes.remove(target.note.id!);
				this.toast.success("Nota eliminata");
			} else if (target.kind === "photo") {
				await this.photosService.remove(target.photo);
				this.lightbox.set(null);
				this.toast.success("Foto eliminata");
			} else {
				await this.ops.remove(target.event.id!);
				this.toast.success("Intervento eliminato");
			}
		} catch {
			this.toast.error("Eliminazione non riuscita");
		}
	}
}
