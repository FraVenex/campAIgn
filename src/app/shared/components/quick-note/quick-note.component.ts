import { Component, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NotesService, Note } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";

/** Inserimento rapido di una nota collegata a una pianta (popup mappa e scheda pianta). */
@Component({
	selector: "app-quick-note",
	standalone: true,
	imports: [FormsModule],
	template: `
		<form (ngSubmit)="save()" class="flex items-center gap-2">
			<input
				type="text"
				name="quickNote"
				[ngModel]="text()"
				(ngModelChange)="text.set($event)"
				[placeholder]="placeholder()"
				autocomplete="off"
				class="camp-input-sm flex-1 min-w-0"
			/>
			<button
				type="submit"
				[disabled]="!text().trim() || saving()"
				class="btn btn-secondary btn-sm shrink-0"
			>
				{{ saving() ? "…" : "Salva" }}
			</button>
		</form>
	`
})
export class QuickNoteComponent {
	private notes = inject(NotesService);
	private toast = inject(ToastService);

	readonly plantId = input.required<string>();
	readonly farmId = input<string | null>(null);
	readonly placeholder = input("Scrivi una nota rapida…");
	readonly saved = output<Note>();

	readonly text = signal("");
	readonly saving = signal(false);

	async save() {
		const content = this.text().trim();
		if (!content) return;
		this.saving.set(true);
		try {
			const note = await this.notes.add({ content, plant_id: this.plantId(), farm_id: this.farmId() });
			this.text.set("");
			this.toast.success("Nota salvata");
			this.saved.emit(note);
		} catch {
			this.toast.error("Impossibile salvare la nota");
		} finally {
			this.saving.set(false);
		}
	}
}
