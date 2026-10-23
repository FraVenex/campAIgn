import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { GalleryUploadDialogComponent } from "./gallery-upload-dialog.component";
import { GalleryLightboxComponent } from "./gallery-lightbox.component";
import { Photo, PhotosService } from "../../core/services/photos.service";
import { FarmStore } from "../../core/services/farm-store.service";
import { ToastService } from "../../core/services/toast.service";
import { formatDateIt } from "../../core/constants/domain";

/** "all" = tutte, "general" = senza pianta, altrimenti id della pianta. */
type GalleryFilter = "all" | "general" | string;

@Component({
	selector: "app-gallery",
	standalone: true,
	imports: [FormsModule, RouterLink, PageHeaderComponent, GalleryUploadDialogComponent, GalleryLightboxComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6 relative" (dragenter)="onDragEnter($event)" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
			<app-page-header section="Galleria" title="Galleria foto" description="Le foto del terreno e delle singole piante, con le tue didascalie. Trascina qui le immagini per caricarle.">
				<ng-container actions>
					<button type="button" (click)="fileInput.click()" class="btn btn-primary">Carica foto</button>
				</ng-container>
			</app-page-header>
			<input #fileInput type="file" accept="image/*" multiple class="hidden" (change)="onFilesPicked($event)" />

			@if (photos.usingLocalFallback()) {
				<div class="rounded-xl border border-camp-amber/40 bg-camp-amber/10 text-camp-bark px-4 py-3 text-xs flex items-start gap-2">
					<span class="text-base leading-none">💾</span>
					<p>Alcune foto sono salvate <strong>solo su questo dispositivo</strong> finché l'archivio foto di Supabase non sarà configurato. Le foto locali sono ridimensionate e non sono visibili dagli altri dispositivi.</p>
				</div>
			}

			<!-- Filtri -->
			<section class="camp-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<div class="segmented w-full sm:w-fit" role="group" aria-label="Filtra foto">
					<button type="button" (click)="filter.set('all')" class="segmented-item flex-1 sm:flex-none" [class.is-active]="filter() === 'all'" [attr.aria-pressed]="filter() === 'all'">
						Tutte <span class="text-xs opacity-70">{{ photos.photos().length }}</span>
					</button>
					<button type="button" (click)="filter.set('general')" class="segmented-item flex-1 sm:flex-none" [class.is-active]="filter() === 'general'" [attr.aria-pressed]="filter() === 'general'">
						Generali <span class="text-xs opacity-70">{{ generalCount() }}</span>
					</button>
				</div>
				<div class="flex items-center gap-2 flex-1 sm:max-w-xs">
					<label for="gallery-plant" class="eyebrow shrink-0">Pianta</label>
					<select
						id="gallery-plant"
						[ngModel]="isPlantFilter() ? filter() : ''"
						(ngModelChange)="filter.set($event || 'all')"
						class="camp-input-sm flex-1 min-w-0 cursor-pointer"
						[class.border-camp-sage]="isPlantFilter()"
						[class.font-semibold]="isPlantFilter()"
					>
						<option value="">Tutte le piante…</option>
						@for (p of plantOptions(); track p.id) {
							<option [value]="p.id">{{ p.name }} ({{ p.count }})</option>
						}
					</select>
				</div>
				@if (isPlantFilter()) {
					<a [routerLink]="['/land/plant', filter()]" class="btn btn-ghost btn-sm sm:ml-auto">Apri scheda pianta →</a>
				}
			</section>

			@if (!photos.loaded()) {
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
					@for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
						<div class="aspect-square bg-camp-sand/20 animate-pulse rounded-camp-lg"></div>
					}
				</div>
			} @else if (!filtered().length) {
				<button type="button" (click)="fileInput.click()" class="w-full camp-card empty-state border-2 border-dashed border-camp-sand sm:py-14 hover:border-camp-sage/50 hover:bg-camp-cream/30 transition-all cursor-pointer">
					<span class="empty-state-icon">🖼️</span>
					<p class="text-camp-earth font-semibold">{{ photos.photos().length ? "Nessuna foto per questo filtro" : "Ancora nessuna foto" }}</p>
					<p class="text-muted">Tocca per scegliere le immagini oppure trascinale qui.</p>
				</button>
			} @else {
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
					@for (p of filtered(); track p.id; let i = $index) {
						<figure class="camp-card overflow-hidden group flex flex-col">
							<button type="button" (click)="openAt(i)" class="relative block aspect-square overflow-hidden bg-camp-cream cursor-zoom-in" [attr.aria-label]="'Apri foto ' + (p.caption || i + 1)">
								<img [src]="p.public_url" [alt]="p.caption || 'Foto'" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
								@if (p.isLocal) {
									<span class="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/90 text-[10px]" title="Salvata solo su questo dispositivo">💾</span>
								}
							</button>
							<figcaption class="p-3 flex-1 flex flex-col gap-1.5">
								@if (p.plant_id) {
									<a [routerLink]="['/land/plant', p.plant_id]" class="self-start max-w-full truncate px-2 py-0.5 rounded-full bg-camp-sage/10 text-camp-sage border border-camp-sage/20 text-[10px] font-bold uppercase tracking-wider hover:bg-camp-sage/20">🌳 {{ plantName(p.plant_id) }}</a>
								}
								<p class="text-xs text-camp-earth leading-snug line-clamp-2" [class.italic]="!p.caption" [class.text-camp-olive]="!p.caption">{{ p.caption || "Senza didascalia" }}</p>
								<p class="text-[10px] text-camp-olive mt-auto">{{ date(p.created_at) }}</p>
							</figcaption>
						</figure>
					}
				</div>
			}

			@if (dragging()) {
				<div class="fixed inset-0 !mt-0 z-[80] bg-camp-sage/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
					<div class="camp-card border-2 border-dashed border-camp-sage px-10 py-8 text-center shadow-camp-xl">
						<p class="text-4xl mb-2">📥</p>
						<p class="font-semibold text-camp-earth">Rilascia le immagini per caricarle</p>
					</div>
				</div>
			}

			@if (staged(); as files) {
				<app-gallery-upload-dialog [files]="files" [plants]="sortedPlants()" [defaultPlantId]="isPlantFilter() ? filter() : null" (close)="staged.set(null)" />
			}

			@if (lightboxIndex() !== null) {
				<app-gallery-lightbox [photos]="filtered()" [startIndex]="lightboxIndex()!" (close)="lightboxIndex.set(null)" />
			}
		</div>
	`
})
export class GalleryComponent implements OnInit {
	readonly photos = inject(PhotosService);
	private farmStore = inject(FarmStore);
	private toast = inject(ToastService);

	readonly filter = signal<GalleryFilter>("all");
	readonly staged = signal<File[] | null>(null);
	readonly lightboxIndex = signal<number | null>(null);
	readonly dragging = signal(false);
	private dragDepth = 0;

	readonly isPlantFilter = computed(() => this.filter() !== "all" && this.filter() !== "general");
	readonly generalCount = computed(() => this.photos.photos().filter(p => !p.plant_id).length);

	readonly sortedPlants = computed(() => [...this.farmStore.plants()].sort((a, b) => a.name.localeCompare(b.name, "it", { numeric: true })));

	/** Piante con almeno una foto in cima, poi le altre (utile per trovare subito le schede documentate). */
	readonly plantOptions = computed(() => {
		const counts = new Map<string, number>();
		for (const p of this.photos.photos()) if (p.plant_id) counts.set(p.plant_id, (counts.get(p.plant_id) || 0) + 1);
		return this.sortedPlants()
			.map(p => ({ id: p.id!, name: p.name, count: counts.get(p.id!) || 0 }))
			.sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
	});

	readonly filtered = computed<Photo[]>(() => {
		const f = this.filter();
		const list = this.photos.photos();
		if (f === "all") return list;
		if (f === "general") return list.filter(p => !p.plant_id);
		return list.filter(p => p.plant_id === f);
	});

	ngOnInit() {
		this.photos.load();
		this.farmStore.ensureLoaded();
	}

	openAt(index: number) {
		this.lightboxIndex.set(index);
	}

	onFilesPicked(event: Event) {
		const input = event.target as HTMLInputElement;
		this.stage(Array.from(input.files || []));
		input.value = "";
	}

	onDragEnter(e: DragEvent) {
		if (!this.hasFiles(e)) return;
		e.preventDefault();
		this.dragDepth++;
		this.dragging.set(true);
	}

	onDragOver(e: DragEvent) {
		if (!this.hasFiles(e)) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
	}

	onDragLeave(e: DragEvent) {
		if (!this.hasFiles(e)) return;
		this.dragDepth = Math.max(0, this.dragDepth - 1);
		if (!this.dragDepth) this.dragging.set(false);
	}

	onDrop(e: DragEvent) {
		if (!this.hasFiles(e)) return;
		e.preventDefault();
		this.dragDepth = 0;
		this.dragging.set(false);
		this.stage(Array.from(e.dataTransfer?.files || []));
	}

	plantName(id: string): string {
		return this.farmStore.getPlant(id)?.name || "Pianta";
	}

	date = (v?: string | null) => formatDateIt(v);

	private stage(files: File[]) {
		const images = files.filter(f => f.type.startsWith("image/"));
		if (!images.length) {
			if (files.length) this.toast.error("Seleziona solo file immagine (JPG, PNG, HEIC…)");
			return;
		}
		if (images.length < files.length) this.toast.info("Alcuni file non sono immagini e sono stati ignorati");
		this.staged.set(images);
	}

	private hasFiles(e: DragEvent): boolean {
		return !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
	}
}
