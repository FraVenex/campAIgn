import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { Note, NotesService } from "../../../core/services/notes.service";
import { ToastService } from "../../../core/services/toast.service";
import { JOURNAL_TABS } from "../../../core/constants/navigation";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { NOTE_COLOR_CLASS, Tone, formatDateIt, toLocalDateKey } from "../../../core/constants/domain";
import { NoteFormDialogComponent } from "./note-form-dialog.component";

type BoardView = "board" | "plants";

const ROTATIONS = ["-rotate-1", "rotate-1", "rotate-[0.4deg]", "-rotate-[1.5deg]", "rotate-[1.5deg]", "-rotate-[0.4deg]"];

@Component({
	selector: "app-journal-notes",
	standalone: true,
	imports: [NgTemplateOutlet, FormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent, NoteFormDialogComponent, ChipComponent],
	template: `
		<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
			<app-page-header section="Diario del contadino" title="Bacheca delle note" description="Appunti, promemoria e idee: restano appesi finché non li togli tu." [tabs]="tabs">
				<ng-container actions>
					<button type="button" (click)="openNew()" class="btn btn-primary">Nuova nota</button>
				</ng-container>
			</app-page-header>

			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="segmented w-full sm:w-fit" role="tablist">
					<button
						type="button"
						role="tab"
						(click)="view.set('board')"
						[attr.aria-selected]="view() === 'board'"
						class="segmented-item flex-1 sm:flex-none"
						[class.is-active]="view() === 'board'"
					>
						📌 Bacheca ({{ notes.generalNotes().length }})
					</button>
					<button
						type="button"
						role="tab"
						(click)="view.set('plants')"
						[attr.aria-selected]="view() === 'plants'"
						class="segmented-item flex-1 sm:flex-none"
						[class.is-active]="view() === 'plants'"
					>
						🌳 Note sulle piante ({{ notes.plantNotes().length }})
					</button>
				</div>
				<div class="relative w-full sm:w-72">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-camp-olive pointer-events-none" aria-hidden="true">🔍</span>
					<input type="text" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Cerca nelle note…" aria-label="Cerca nelle note" class="camp-input-sm pl-9 pr-10" />
					@if (search()) {
						<button type="button" (click)="search.set('')" class="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2" aria-label="Cancella ricerca">✕</button>
					}
				</div>
			</div>

			@if (!notes.loaded()) {
				<div class="columns-1 sm:columns-2 lg:columns-3 gap-4">
					@for (i of [1, 2, 3, 4, 5, 6]; track i) {
						<div class="h-36 mb-4 bg-camp-sand/25 animate-pulse rounded-lg break-inside-avoid"></div>
					}
				</div>
			} @else if (view() === "board") {
				@if (boardNotes().length) {
					<div class="rounded-camp-lg bg-camp-cream border border-camp-sand p-4 sm:p-6 shadow-inner space-y-6">
						@if (pinnedNotes().length) {
							<div>
								<p class="eyebrow mb-4">📌 Fissate in alto</p>
								<div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
									@for (n of pinnedNotes(); track n.id; let i = $index) {
										<ng-container *ngTemplateOutlet="postIt; context: { $implicit: n, index: i }" />
									}
								</div>
							</div>
						}
						@if (otherNotes().length) {
							<div>
								@if (pinnedNotes().length) {
									<p class="eyebrow mb-4">🗒️ Altre note</p>
								}
								<div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
									@for (n of otherNotes(); track n.id; let i = $index) {
										<ng-container *ngTemplateOutlet="postIt; context: { $implicit: n, index: i }" />
									}
								</div>
							</div>
						}
					</div>
				} @else {
					<div class="camp-card empty-state">
						<p class="empty-state-icon">🗒️</p>
						@if (search()) {
							<p class="text-muted">Nessuna nota corrisponde a «{{ search() }}».</p>
						} @else {
							<p class="text-sm font-semibold text-camp-earth">La bacheca è vuota</p>
							<p class="text-muted max-w-md">Appendi la tua prima nota: un lavoro da ricordare, un ordine da fare, un'idea per la stagione.</p>
							<button type="button" (click)="openNew()" class="btn btn-primary btn-sm mt-2">Scrivi una nota</button>
						}
					</div>
				}
			} @else {
				@if (plantNotes().length) {
					<ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
						@for (n of plantNotes(); track n.id) {
							<li class="camp-card p-4 flex flex-col">
								<div class="flex items-start justify-between gap-2 mb-2">
									@if (n.plant_id) {
										<a [routerLink]="['/land/plant', n.plant_id]" class="text-sm font-semibold text-camp-sage hover:text-camp-earth flex items-center gap-1.5 min-w-0">
											<span>🌳</span><span class="truncate">{{ plantName(n.plant_id) }}</span>
										</a>
									}
									<span class="text-[11px] text-camp-olive whitespace-nowrap">{{ formatDate(n.created_at) }}</span>
								</div>
								@if (n.title) {
									<p class="font-serif text-camp-earth">{{ n.title }}</p>
								}
								<p class="text-sm text-camp-bark whitespace-pre-line break-words flex-1">{{ n.content }}</p>
								<div class="flex justify-end gap-1 mt-2">
									<button type="button" (click)="openEdit(n)" class="btn btn-ghost btn-icon btn-sm" aria-label="Modifica nota" title="Modifica">✏️</button>
									<button type="button" (click)="askDelete(n)" class="btn btn-ghost btn-icon btn-sm" aria-label="Elimina nota" title="Elimina">🗑️</button>
								</div>
							</li>
						}
					</ul>
				} @else {
					<div class="camp-card empty-state">
						<p class="empty-state-icon">🌳</p>
						<p class="text-muted max-w-md">
							@if (search()) {
								Nessuna nota sulle piante corrisponde a «{{ search() }}».
							} @else {
								Non ci sono ancora note sulle piante. Aggiungile dalla mappa del terreno o dalla scheda di una pianta.
							}
						</p>
						@if (!search()) {
							<a routerLink="/land/map" class="btn btn-secondary btn-sm mt-2">Vai alla mappa</a>
						}
					</div>
				}
			}

			<ng-template #postIt let-n let-i="index">
				<article
					class="group relative mb-5 break-inside-avoid border rounded-md shadow-camp hover:shadow-camp-lg hover:rotate-0 transition-all duration-200 cursor-pointer"
					[class]="postItClass(n, i)"
					(click)="openEdit(n)"
					(keydown.enter)="openEdit(n)"
					tabindex="0"
					[attr.aria-label]="'Nota: ' + (n.title || n.content)"
				>
					@if (n.pinned) {
						<span class="absolute -top-3 left-1/2 -translate-x-1/2 text-xl drop-shadow-sm" aria-label="Nota fissata">📌</span>
					} @else {
						<span class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-white/50 border border-white/60 rotate-[-2deg]" aria-hidden="true"></span>
					}
					<div class="p-4 pt-5">
						@if (n.title) {
							<h3 class="font-serif text-lg text-camp-earth leading-snug mb-1 break-words">{{ n.title }}</h3>
						}
						<p class="text-sm text-camp-bark whitespace-pre-line break-words leading-relaxed">{{ n.content }}</p>
						<div class="mt-3 flex flex-wrap items-center gap-1.5">
							<span class="text-[11px] text-camp-bark/60">{{ formatDate(n.created_at) }}</span>
							@if (n.reminder_date) {
								<app-chip icon="⏰" [label]="reminderBadge(n.reminder_date).label" [tone]="reminderBadge(n.reminder_date).tone" />
							}
						</div>
					</div>
					<div class="flex justify-end gap-1 px-2 pb-2 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
						<button type="button" (click)="togglePin(n, $event)" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="n.pinned ? 'Stacca nota' : 'Fissa nota'" [title]="n.pinned ? 'Stacca' : 'Fissa in alto'">
							{{ n.pinned ? "📍" : "📌" }}
						</button>
						<button type="button" (click)="openEdit(n, $event)" class="btn btn-ghost btn-icon btn-sm" aria-label="Modifica nota" title="Modifica">✏️</button>
						<button type="button" (click)="askDelete(n, $event)" class="btn btn-ghost btn-icon btn-sm" aria-label="Elimina nota" title="Elimina">🗑️</button>
					</div>
				</article>
			</ng-template>

			@if (editor(); as ed) {
				<app-note-form-dialog [note]="ed.note" [farmId]="farmStore.farm()?.id ?? null" (close)="editor.set(null)" (saved)="editor.set(null)" />
			}

			@if (toDelete(); as del) {
				<app-confirm-dialog
					title="Eliminare la nota?"
					[message]="'La nota «' + (del.title || shorten(del.content)) + '» verrà tolta definitivamente dalla bacheca.'"
					(confirm)="confirmDelete(del)"
					(cancel)="toDelete.set(null)"
				/>
			}
		</div>
	`
})
export class JournalNotesComponent implements OnInit {
	readonly notes = inject(NotesService);
	readonly farmStore = inject(FarmStore);
	private toast = inject(ToastService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	readonly tabs = JOURNAL_TABS;
	readonly todayKey = toLocalDateKey(new Date());

	readonly view = signal<BoardView>("board");
	readonly search = signal("");
	readonly editor = signal<{ note: Note | null } | null>(null);
	readonly toDelete = signal<Note | null>(null);

	readonly boardNotes = computed(() => this.filter(this.notes.generalNotes()));
	readonly plantNotes = computed(() => this.filter(this.notes.plantNotes(), true));
	readonly pinnedNotes = computed(() => this.boardNotes().filter(n => n.pinned));
	readonly otherNotes = computed(() => this.boardNotes().filter(n => !n.pinned));

	async ngOnInit() {
		this.farmStore.ensureLoaded();
		await this.notes.load();
		const noteId = this.route.snapshot.queryParamMap.get("note");
		if (noteId) {
			const note = this.notes.notes().find(n => n.id === noteId);
			if (note) {
				this.view.set(note.plant_id ? "plants" : "board");
				this.editor.set({ note });
			}
			this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
		}
	}

	openNew() {
		this.editor.set({ note: null });
	}

	openEdit(note: Note, event?: Event) {
		event?.stopPropagation();
		this.editor.set({ note });
	}

	askDelete(note: Note, event?: Event) {
		event?.stopPropagation();
		this.toDelete.set(note);
	}

	async confirmDelete(note: Note) {
		this.toDelete.set(null);
		if (!note.id) return;
		try {
			await this.notes.remove(note.id);
			this.toast.success("Nota eliminata");
		} catch {
			this.toast.error("Impossibile eliminare la nota");
		}
	}

	async togglePin(note: Note, event: Event) {
		event.stopPropagation();
		if (!note.id) return;
		try {
			await this.notes.update(note.id, { pinned: !note.pinned });
			this.toast.success(note.pinned ? "Nota staccata" : "Nota fissata in alto");
		} catch {
			this.toast.error("Impossibile aggiornare la nota");
		}
	}

	postItClass(note: Note, index: number): string {
		const color = NOTE_COLOR_CLASS[note.color] || NOTE_COLOR_CLASS.yellow;
		return `${color} ${ROTATIONS[this.hash(note.id || String(index)) % ROTATIONS.length]}`;
	}

	reminderBadge(date: string): { label: string; tone: Tone } {
		if (date < this.todayKey) return { label: `Scaduto · ${this.formatShort(date)}`, tone: "danger" };
		if (date === this.todayKey) return { label: "Oggi", tone: "warning" };
		return { label: this.formatShort(date), tone: "neutral" };
	}

	plantName(id: string): string {
		return this.farmStore.getPlant(id)?.name || "Pianta";
	}

	shorten(text: string): string {
		return text.length > 40 ? text.slice(0, 40) + "…" : text;
	}

	formatDate = (v?: string | null) => formatDateIt(v, { day: "numeric", month: "short", year: "numeric" });

	private formatShort(dateKey: string): string {
		return formatDateIt(`${dateKey}T00:00:00`, { day: "numeric", month: "short" });
	}

	private filter(list: Note[], includePlant = false): Note[] {
		const q = this.search().toLowerCase().trim();
		if (!q) return list;
		return list.filter(n => [n.title, n.content, includePlant && n.plant_id ? this.plantName(n.plant_id) : ""].some(v => (v || "").toLowerCase().includes(q)));
	}

	private hash(value: string): number {
		let h = 0;
		for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
		return h;
	}
}
