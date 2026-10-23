import { Component, HostListener, OnDestroy, OnInit, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ConfirmDialogComponent } from "../../shared/components/confirm-dialog/confirm-dialog.component";
import { ChipComponent } from "../../shared/components/chip/chip.component";
import { Photo, PhotosService } from "../../core/services/photos.service";
import { FarmStore } from "../../core/services/farm-store.service";
import { ToastService } from "../../core/services/toast.service";
import { formatDateIt } from "../../core/constants/domain";

/** Visualizzatore a schermo intero: navigazione, modifica didascalia ed eliminazione. */
@Component({
	selector: "app-gallery-lightbox",
	standalone: true,
	imports: [FormsModule, RouterLink, ConfirmDialogComponent, ChipComponent],
	template: `
		<div class="fixed inset-0 z-[90] bg-camp-earth/95 backdrop-blur-sm flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label="Visualizzatore foto">
			@if (photo(); as p) {
				<!-- Barra superiore -->
				<div class="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 text-white/90 shrink-0">
					<p class="text-xs font-semibold tracking-wider">{{ index() + 1 }} / {{ photos().length }}</p>
					<div class="flex items-center gap-1.5">
						<a [href]="p.public_url" target="_blank" rel="noopener" [attr.download]="p.isLocal ? 'foto.jpg' : null" class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center" title="Apri originale" aria-label="Apri originale">⤢</a>
						<button type="button" (click)="askDelete.set(true)" class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer" title="Elimina foto" aria-label="Elimina foto">🗑️</button>
						<button type="button" (click)="close.emit()" class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer" title="Chiudi" aria-label="Chiudi">✕</button>
					</div>
				</div>

				<!-- Immagine -->
				<div class="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
					<img [src]="p.public_url" [alt]="p.caption || 'Foto'" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none" draggable="false" />
					@if (photos().length > 1) {
						<button type="button" (click)="prev()" class="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl items-center justify-center cursor-pointer" aria-label="Foto precedente">‹</button>
						<button type="button" (click)="next()" class="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl items-center justify-center cursor-pointer" aria-label="Foto successiva">›</button>
					}
				</div>

				<!-- Pannello didascalia -->
				<div class="shrink-0 px-3 sm:px-6 pt-3 pb-safe">
					<div class="max-w-3xl mx-auto bg-white rounded-2xl p-3 sm:p-4 mb-3 shadow-xl">
						<div class="flex flex-wrap items-center gap-2 mb-2 text-xs text-camp-olive">
							<span>📅 {{ date(p.created_at) }}</span>
							@if (p.plant_id) {
								<a [routerLink]="['/land/plant', p.plant_id]" (click)="close.emit()" class="px-2 py-0.5 rounded-full bg-camp-sage/10 text-camp-sage border border-camp-sage/20 text-[10px] font-bold uppercase tracking-wider hover:bg-camp-sage/20">🌳 {{ plantName(p.plant_id) }}</a>
							} @else {
								<app-chip label="Generale" tone="neutral" icon="📁" />
							}
							@if (p.isLocal) {
								<span title="Salvata solo su questo dispositivo"><app-chip label="Locale" tone="warning" icon="💾" /></span>
							}
						</div>
						<div class="flex flex-col sm:flex-row gap-2">
							<textarea
								rows="2"
								[ngModel]="draft()"
								(ngModelChange)="draft.set($event)"
								maxlength="240"
								placeholder="Aggiungi una didascalia…"
								aria-label="Didascalia"
								class="camp-input-sm flex-1 resize-none"
							></textarea>
							@if (dirty()) {
								<div class="flex sm:flex-col gap-2 shrink-0">
									<button type="button" (click)="saveCaption()" [disabled]="saving()" class="btn btn-primary btn-sm flex-1">{{ saving() ? "…" : "Salva" }}</button>
									<button type="button" (click)="resetDraft()" class="btn btn-secondary btn-sm flex-1">Annulla</button>
								</div>
							}
						</div>
					</div>
					@if (photos().length > 1) {
						<div class="sm:hidden flex justify-between pb-3 -mt-1">
							<button type="button" (click)="prev()" class="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold cursor-pointer">‹ Precedente</button>
							<button type="button" (click)="next()" class="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold cursor-pointer">Successiva ›</button>
						</div>
					}
				</div>
			}
		</div>

		@if (askDelete() && photo(); as p) {
			<app-confirm-dialog title="Eliminare la foto?" message="La foto verrà eliminata definitivamente insieme alla sua didascalia." (cancel)="askDelete.set(false)" (confirm)="remove(p)" />
		}
	`
})
export class GalleryLightboxComponent implements OnInit, OnDestroy {
	private photosService = inject(PhotosService);
	private farmStore = inject(FarmStore);
	private toast = inject(ToastService);

	readonly photos = input.required<Photo[]>();
	readonly startIndex = input(0);
	readonly close = output<void>();

	readonly index = signal(0);
	readonly draft = signal("");
	readonly saving = signal(false);
	readonly askDelete = signal(false);

	readonly photo = computed(() => this.photos()[this.index()] ?? null);
	private readonly photoId = computed(() => this.photo()?.id ?? null);
	readonly dirty = computed(() => (this.photo()?.caption || "") !== this.draft().trim());

	private touchX: number | null = null;

	constructor() {
		// Riallinea la bozza della didascalia quando cambia la foto mostrata.
		effect(
			() => {
				this.photoId();
				untracked(() => this.draft.set(this.photo()?.caption || ""));
			},
			{ allowSignalWrites: true }
		);
		// Se la lista si accorcia (eliminazione), mantiene l'indice valido o chiude.
		effect(
			() => {
				const len = this.photos().length;
				untracked(() => {
					if (!len) this.close.emit();
					else if (this.index() >= len) this.index.set(len - 1);
				});
			},
			{ allowSignalWrites: true }
		);
	}

	ngOnInit() {
		this.index.set(Math.max(0, Math.min(this.startIndex(), this.photos().length - 1)));
		document.body.style.overflow = "hidden";
	}

	ngOnDestroy() {
		document.body.style.overflow = "";
	}

	@HostListener("window:keydown", ["$event"])
	onKey(event: KeyboardEvent) {
		if (this.askDelete()) return;
		const tag = (event.target as HTMLElement)?.tagName;
		if (event.key === "Escape") {
			this.close.emit();
			return;
		}
		if (tag === "TEXTAREA" || tag === "INPUT") return;
		if (event.key === "ArrowLeft") this.prev();
		if (event.key === "ArrowRight") this.next();
	}

	prev() {
		const len = this.photos().length;
		if (len) this.index.set((this.index() - 1 + len) % len);
	}

	next() {
		const len = this.photos().length;
		if (len) this.index.set((this.index() + 1) % len);
	}

	onTouchStart(e: TouchEvent) {
		this.touchX = e.changedTouches[0]?.clientX ?? null;
	}

	onTouchEnd(e: TouchEvent) {
		if (this.touchX === null) return;
		const dx = (e.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
		this.touchX = null;
		if (Math.abs(dx) < 50) return;
		dx > 0 ? this.prev() : this.next();
	}

	resetDraft() {
		this.draft.set(this.photo()?.caption || "");
	}

	async saveCaption() {
		const p = this.photo();
		if (!p) return;
		this.saving.set(true);
		try {
			await this.photosService.updateCaption(p, this.draft().trim());
			this.draft.set(this.draft().trim());
			this.toast.success("Didascalia aggiornata");
		} catch (err) {
			console.error("[Gallery]", err);
			this.toast.error("Impossibile salvare la didascalia");
		} finally {
			this.saving.set(false);
		}
	}

	async remove(p: Photo) {
		this.askDelete.set(false);
		try {
			await this.photosService.remove(p);
			this.toast.success("Foto eliminata");
		} catch (err) {
			console.error("[Gallery]", err);
			this.toast.error("Impossibile eliminare la foto");
		}
	}

	plantName(id: string): string {
		return this.farmStore.getPlant(id)?.name || "Pianta";
	}

	date = (v?: string | null) => formatDateIt(v, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
