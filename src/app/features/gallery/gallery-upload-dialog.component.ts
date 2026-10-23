import { Component, OnDestroy, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";
import { PhotoUpload, PhotosService } from "../../core/services/photos.service";
import { ToastService } from "../../core/services/toast.service";

interface StagedPhoto {
	key: string;
	file: File;
	previewUrl: string;
	caption: string;
}

/** Area di preparazione: ogni foto selezionata riceve la sua didascalia prima del caricamento in galleria. */
@Component({
	selector: "app-gallery-upload-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog title="Carica foto" [subtitle]="items().length + (items().length === 1 ? ' foto selezionata' : ' foto selezionate')" icon="📷" maxWidth="max-w-3xl" (close)="cancel()">
			<ul class="space-y-3">
				@for (item of items(); track item.key; let i = $index) {
					<li class="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-camp-sand/60 bg-white">
						<div class="relative w-full sm:w-36 h-44 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-camp-cream">
							<img [src]="item.previewUrl" [alt]="item.file.name" class="w-full h-full object-cover" />
							<button type="button" (click)="removeItem(item)" [disabled]="uploading()" class="btn btn-secondary btn-icon btn-sm absolute top-1.5 right-1.5 text-camp-error shadow-camp-sm" aria-label="Rimuovi foto" title="Rimuovi">✕</button>
						</div>
						<div class="flex-1 min-w-0 space-y-2">
							<p class="text-xs text-camp-olive truncate" [title]="item.file.name">{{ item.file.name }} · {{ size(item.file.size) }}</p>
							<div>
								<label class="sr-only" [for]="'cap-' + i">Didascalia</label>
								<input [id]="'cap-' + i" type="text" [name]="'caption-' + i" [(ngModel)]="item.caption" maxlength="240" placeholder="Didascalia (es. Potatura lato nord, mignole in formazione…)" class="camp-input-sm" />
							</div>
						</div>
					</li>
				}
			</ul>

			@if (errors().length) {
				<div class="camp-alert-error mt-4 text-xs">
					<div>
						<p class="font-bold mb-1">Alcune foto non sono state caricate:</p>
						<ul class="list-disc pl-4 space-y-0.5">
							@for (e of errors(); track e) {
								<li>{{ e }}</li>
							}
						</ul>
					</div>
				</div>
			}

			<div footer class="dialog-footer justify-between items-center">
				<label class="btn btn-ghost" [class.opacity-40]="uploading()" [class.pointer-events-none]="uploading()">
					Aggiungi altre
					<input type="file" accept="image/*" multiple class="hidden" (change)="onMoreFiles($event)" [disabled]="uploading()" />
				</label>
				<div class="flex gap-3 ml-auto">
					<button type="button" (click)="cancel()" [disabled]="uploading()" class="btn btn-secondary">Annulla</button>
					<button type="button" (click)="upload()" [disabled]="uploading() || !items().length" class="btn btn-primary">
						{{ uploading() ? "Caricamento…" : "Carica " + items().length + " foto" }}
					</button>
				</div>
			</div>
		</app-camp-dialog>
	`
})
export class GalleryUploadDialogComponent implements OnInit, OnDestroy {
	private photos = inject(PhotosService);
	private toast = inject(ToastService);

	readonly files = input.required<File[]>();
	readonly close = output<void>();

	readonly items = signal<StagedPhoto[]>([]);
	readonly uploading = signal(false);
	readonly errors = signal<string[]>([]);

	ngOnInit() {
		this.addFiles(this.files());
	}

	ngOnDestroy() {
		this.items().forEach(i => URL.revokeObjectURL(i.previewUrl));
	}

	onMoreFiles(event: Event) {
		const input = event.target as HTMLInputElement;
		this.addFiles(Array.from(input.files || []));
		input.value = "";
	}

	addFiles(files: File[]) {
		const images = files.filter(f => f.type.startsWith("image/"));
		if (images.length < files.length) this.toast.info("Alcuni file non sono immagini e sono stati ignorati");
		const staged = images.map(file => ({
			key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
			file,
			previewUrl: URL.createObjectURL(file),
			caption: ""
		}));
		this.items.update(list => [...list, ...staged]);
	}

	removeItem(item: StagedPhoto) {
		URL.revokeObjectURL(item.previewUrl);
		this.items.update(list => list.filter(i => i.key !== item.key));
	}

	cancel() {
		if (this.uploading()) return;
		this.close.emit();
	}

	async upload() {
		const items = this.items();
		if (!items.length) return;
		this.uploading.set(true);
		this.errors.set([]);
		let uploaded = 0;
		const errors: string[] = [];
		const failedKeys = new Set<string>();
		const payload: PhotoUpload[] = items.map(i => ({ file: i.file, caption: i.caption.trim() || undefined }));
		try {
			// Le foto della galleria non sono legate a una pianta (plant_id nullo)
			const res = await this.photos.upload(payload, null);
			uploaded = res.uploaded.length;
			errors.push(...res.errors);
			for (const err of res.errors) {
				const failed = items.find(i => err.startsWith(i.file.name + ":") && !failedKeys.has(i.key));
				if (failed) failedKeys.add(failed.key);
			}
		} catch (err: any) {
			errors.push(err?.message || "Caricamento non riuscito");
			items.forEach(i => failedKeys.add(i.key));
		}
		this.uploading.set(false);

		if (uploaded) this.toast.success(uploaded === 1 ? "Foto caricata" : `${uploaded} foto caricate`);
		if (!errors.length) {
			this.close.emit();
			return;
		}
		this.toast.error(errors.length === 1 ? "Una foto non è stata caricata" : `${errors.length} foto non sono state caricate`);
		this.errors.set(errors);
		const remaining = failedKeys.size ? items.filter(i => failedKeys.has(i.key)) : items;
		items.filter(i => !remaining.includes(i)).forEach(i => URL.revokeObjectURL(i.previewUrl));
		this.items.set(remaining);
	}

	size(bytes: number): string {
		return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
	}
}
