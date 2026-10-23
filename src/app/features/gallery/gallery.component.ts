import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { PhotoPickerComponent } from "../../shared/components/photo-picker/photo-picker.component";
import { GalleryUploadDialogComponent } from "./gallery-upload-dialog.component";
import { GalleryLightboxComponent } from "./gallery-lightbox.component";
import { Photo, PhotosService } from "../../core/services/photos.service";
import { ToastService } from "../../core/services/toast.service";
import { formatDateIt } from "../../core/constants/domain";

@Component({
	selector: "app-gallery",
	standalone: true,
	imports: [FormsModule, PageHeaderComponent, PhotoPickerComponent, GalleryUploadDialogComponent, GalleryLightboxComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6 relative" (dragenter)="onDragEnter($event)" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
			<app-page-header section="Galleria" title="Galleria foto" description="Le tue foto del terreno e del lavoro in campo, con le didascalie. Le foto delle singole piante sono nella loro scheda.">
				<ng-container actions>
					<app-photo-picker (picked)="stage($event)" />
				</ng-container>
			</app-page-header>
			<input #fileInput type="file" accept="image/*" multiple class="hidden" (change)="onFilesPicked($event)" />

			@if (photos.usingLocalFallback()) {
				<div class="rounded-xl border border-camp-amber/40 bg-camp-amber/10 text-camp-bark px-4 py-3 text-xs flex items-start gap-2">
					<span class="text-base leading-none">💾</span>
					<p>Alcune foto sono salvate <strong>solo su questo dispositivo</strong> finché l'archivio foto di Supabase non sarà configurato. Le foto locali sono ridimensionate e non sono visibili dagli altri dispositivi.</p>
				</div>
			}

			<!-- Ricerca -->
			<section class="camp-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<input
					type="search"
					[ngModel]="search()"
					(ngModelChange)="search.set($event)"
					placeholder="Cerca nelle didascalie…"
					aria-label="Cerca nelle didascalie"
					class="camp-input-sm sm:max-w-sm"
				/>
				<p class="text-muted sm:ml-auto">{{ galleryPhotos().length }} foto nella galleria</p>
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
					<p class="text-camp-earth font-semibold">{{ galleryPhotos().length ? "Nessuna foto corrisponde alla ricerca" : "Ancora nessuna foto" }}</p>
					<p class="text-muted">Scatta una foto o scegli le immagini dal telefono; dal computer puoi anche trascinarle qui.</p>
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
				<app-gallery-upload-dialog [files]="files" (close)="staged.set(null)" />
			}

			@if (lightboxIndex() !== null) {
				<app-gallery-lightbox [photos]="filtered()" [startIndex]="lightboxIndex()!" (close)="lightboxIndex.set(null)" />
			}
		</div>
	`
})
export class GalleryComponent implements OnInit {
	readonly photos = inject(PhotosService);
	private toast = inject(ToastService);

	readonly search = signal("");
	readonly staged = signal<File[] | null>(null);
	readonly lightboxIndex = signal<number | null>(null);
	readonly dragging = signal(false);
	private dragDepth = 0;

	/** La galleria raccoglie le foto dell'agricoltore; le foto delle piante vivono nella scheda pianta. */
	readonly galleryPhotos = computed<Photo[]>(() => this.photos.photos().filter(p => !p.plant_id));

	readonly filtered = computed<Photo[]>(() => {
		const q = this.search().toLowerCase().trim();
		return q ? this.galleryPhotos().filter(p => (p.caption || "").toLowerCase().includes(q)) : this.galleryPhotos();
	});

	ngOnInit() {
		this.photos.load();
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

	date = (v?: string | null) => formatDateIt(v);

	stage(files: File[]) {
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
