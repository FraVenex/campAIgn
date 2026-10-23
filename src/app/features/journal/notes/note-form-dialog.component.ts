import { Component, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../../../shared/components/camp-dialog/camp-dialog.component";
import { Note, NotesService } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";
import { NOTE_COLORS, NOTE_COLOR_CLASS, NoteColor, toLocalDateKey } from "../../../core/constants/domain";

const COLOR_LABELS: Record<NoteColor, string> = {
	yellow: "Giallo",
	green: "Verde",
	pink: "Rosa",
	blue: "Azzurro",
	sand: "Sabbia"
};

/** Creazione e modifica di una nota (post-it) della bacheca. */
@Component({
	selector: "app-note-form-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog [title]="note() ? 'Modifica nota' : 'Nuova nota'" subtitle="Bacheca" icon="📝" maxWidth="max-w-lg" (close)="close.emit()">
			<form id="note-form" (ngSubmit)="save()" class="space-y-4">
				<div>
					<label class="camp-label" for="note-title">Titolo (facoltativo)</label>
					<input id="note-title" name="title" type="text" class="camp-input" [ngModel]="title()" (ngModelChange)="title.set($event)" placeholder="Es. Ordinare il rame" maxlength="120" autocomplete="off" />
				</div>
				<div>
					<label class="camp-label" for="note-content">Testo</label>
					<textarea
						id="note-content"
						name="content"
						rows="5"
						class="camp-input resize-y"
						[ngModel]="content()"
						(ngModelChange)="content.set($event)"
						placeholder="Scrivi qui la tua nota…"
						required
					></textarea>
				</div>

				<div>
					<p class="camp-label">Colore</p>
					<div class="flex flex-wrap gap-2">
						@for (c of colors; track c) {
							<button
								type="button"
								(click)="color.set(c)"
								class="w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center text-xs"
								[class]="colorClass[c] + (color() === c ? ' ring-2 ring-camp-sage ring-offset-2 scale-105' : '')"
								[attr.aria-label]="colorLabels[c]"
								[attr.aria-pressed]="color() === c"
								[title]="colorLabels[c]"
							>
								@if (color() === c) {
									✓
								}
							</button>
						}
					</div>
				</div>

				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<label class="camp-label" for="note-reminder">Promemoria</label>
						<div class="flex items-center gap-2">
							<input id="note-reminder" name="reminder" type="date" class="camp-input py-2.5" [ngModel]="reminder()" (ngModelChange)="reminder.set($event)" />
							@if (reminder()) {
								<button type="button" (click)="reminder.set('')" class="btn btn-ghost btn-icon shrink-0" aria-label="Rimuovi promemoria">✕</button>
							}
						</div>
						<div class="flex flex-wrap gap-1.5 mt-2">
							<button type="button" (click)="setReminderIn(0)" class="filter-chip">Oggi</button>
							<button type="button" (click)="setReminderIn(1)" class="filter-chip">Domani</button>
							<button type="button" (click)="setReminderIn(7)" class="filter-chip">Tra 1 settimana</button>
						</div>
					</div>
					<div>
						<p class="camp-label">Fissa in alto</p>
						<button
							type="button"
							(click)="pinned.set(!pinned())"
							class="btn w-full justify-start border"
							[class]="pinned() ? 'bg-camp-terracotta/10 border-camp-terracotta/40 text-camp-terracotta' : 'bg-white border-camp-sand text-camp-olive hover:bg-camp-cream'"
							[attr.aria-pressed]="pinned()"
						>
							{{ pinned() ? "Nota fissata" : "Non fissata" }}
						</button>
					</div>
				</div>
			</form>

			<div footer class="dialog-footer">
				<button type="button" (click)="close.emit()" class="btn btn-secondary">Annulla</button>
				<button
					type="submit"
					form="note-form"
					[disabled]="!content().trim() || saving()"
					class="btn btn-primary"
				>
					{{ saving() ? "Salvataggio…" : "Salva" }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class NoteFormDialogComponent implements OnInit {
	private notes = inject(NotesService);
	private toast = inject(ToastService);

	readonly note = input<Note | null>(null);
	readonly farmId = input<string | null>(null);
	readonly close = output<void>();
	readonly saved = output<Note>();

	readonly colors = NOTE_COLORS;
	readonly colorClass = NOTE_COLOR_CLASS;
	readonly colorLabels = COLOR_LABELS;

	readonly title = signal("");
	readonly content = signal("");
	readonly color = signal<NoteColor>("yellow");
	readonly pinned = signal(false);
	readonly reminder = signal("");
	readonly saving = signal(false);

	ngOnInit() {
		const n = this.note();
		if (!n) return;
		this.title.set(n.title || "");
		this.content.set(n.content || "");
		this.color.set(n.color || "yellow");
		this.pinned.set(!!n.pinned);
		this.reminder.set(n.reminder_date || "");
	}

	setReminderIn(days: number) {
		const d = new Date();
		d.setDate(d.getDate() + days);
		this.reminder.set(toLocalDateKey(d));
	}

	async save() {
		const content = this.content().trim();
		if (!content || this.saving()) return;
		this.saving.set(true);
		const data = {
			title: this.title().trim() || null,
			content,
			color: this.color(),
			pinned: this.pinned(),
			reminder_date: this.reminder() || null
		};
		try {
			const existing = this.note();
			const result = existing?.id ? await this.notes.update(existing.id, data) : await this.notes.add({ ...data, farm_id: this.farmId() });
			this.toast.success(existing ? "Nota aggiornata" : "Nota aggiunta alla bacheca");
			this.saved.emit(result);
		} catch {
			this.toast.error("Impossibile salvare la nota");
		} finally {
			this.saving.set(false);
		}
	}
}
