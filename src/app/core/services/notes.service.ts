import { Injectable, computed, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { TableRepository, RepoRow } from "./table-repository";
import { NoteColor, toLocalDateKey } from "../constants/domain";

export interface Note extends RepoRow {
	farm_id?: string | null;
	plant_id?: string | null;
	title?: string | null;
	content: string;
	color: NoteColor;
	pinned: boolean;
	reminder_date?: string | null;
}

export type NoteInput = Pick<Note, "content"> & Partial<Pick<Note, "title" | "color" | "pinned" | "reminder_date" | "plant_id" | "farm_id">>;

/** Note generali (bacheca post-it) e note rapide collegate alle singole piante. */
@Injectable({ providedIn: "root" })
export class NotesService {
	private auth = inject(AuthService);
	private repo = new TableRepository<Note>(inject(SupabaseService).client, "notes", () => this.auth.currentUser()?.id ?? null);

	readonly notes = signal<Note[]>([]);
	readonly loaded = signal(false);

	readonly generalNotes = computed(() => this.sort(this.notes().filter(n => !n.plant_id)));
	readonly plantNotes = computed(() => this.sort(this.notes().filter(n => !!n.plant_id)));

	/** Promemoria del giorno: note con data promemoria scaduta/oggi, altrimenti le note fissate. */
	readonly reminders = computed(() => {
		const today = toLocalDateKey(new Date());
		const due = this.generalNotes().filter(n => n.reminder_date && n.reminder_date <= today);
		return due.length ? due : this.generalNotes().filter(n => n.pinned);
	});

	async load(force = false): Promise<void> {
		if (this.loaded() && !force) return;
		try {
			this.notes.set(await this.repo.list(q => q.order("created_at", { ascending: false })));
		} catch (err) {
			console.error("[NotesService]", err);
			this.notes.set([]);
		}
		this.loaded.set(true);
	}

	forPlant(plantId: string): Note[] {
		return this.plantNotes().filter(n => n.plant_id === plantId);
	}

	async add(input: NoteInput): Promise<Note> {
		const note = await this.repo.insert({
			title: input.title ?? null,
			content: input.content,
			color: input.color ?? (input.plant_id ? "green" : "yellow"),
			pinned: input.pinned ?? false,
			reminder_date: input.reminder_date ?? null,
			plant_id: input.plant_id ?? null,
			farm_id: input.farm_id ?? null
		});
		this.notes.update(list => [note, ...list]);
		return note;
	}

	async update(id: string, patch: Partial<Note>): Promise<Note> {
		const saved = await this.repo.update(id, patch);
		this.notes.update(list => list.map(n => (n.id === id ? { ...n, ...saved } : n)));
		return saved;
	}

	async remove(id: string): Promise<void> {
		await this.repo.remove(id);
		this.notes.update(list => list.filter(n => n.id !== id));
	}

	private sort(list: Note[]): Note[] {
		return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.created_at || "").localeCompare(a.created_at || ""));
	}
}
