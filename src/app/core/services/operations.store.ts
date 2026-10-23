import { Injectable, computed, inject, signal } from "@angular/core";
import { CalendarService, CalendarEvent } from "./calendar.service";
import { EventType, WorkStatus, toLocalDateKey } from "../constants/domain";

export type EffectiveWorkStatus = WorkStatus | "overdue";

/**
 * Attività operative (trattamenti, manutenzioni, irrigazioni, raccolte programmate)
 * basate sugli eventi del calendario: stato condiviso per mappe, registro, home e dettaglio pianta.
 */
@Injectable({ providedIn: "root" })
export class OperationsStore {
	private calendar = inject(CalendarService);

	readonly events = signal<CalendarEvent[]>([]);
	readonly loaded = signal(false);
	readonly isLoading = signal(false);

	readonly sorted = computed(() => [...this.events()].sort((a, b) => b.start.localeCompare(a.start)));

	readonly today = computed(() => {
		const key = toLocalDateKey(new Date());
		return this.events()
			.filter(e => toLocalDateKey(e.start) <= key && toLocalDateKey(e.end || e.start) >= key)
			.sort((a, b) => a.start.localeCompare(b.start));
	});

	readonly upcoming = computed(() => {
		const now = new Date().toISOString();
		return this.events()
			.filter(e => e.start > now && e.work_status !== "done" && e.work_status !== "skipped")
			.sort((a, b) => a.start.localeCompare(b.start));
	});

	/** Per ogni pianta: attività ancora aperte (da svolgere, in corso, in ritardo). */
	readonly openByPlant = computed(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of this.events()) {
			if (e.work_status === "done" || e.work_status === "skipped") continue;
			for (const pid of e.plant_ids || []) {
				map.set(pid, [...(map.get(pid) || []), e]);
			}
		}
		return map;
	});

	async load(force = false): Promise<void> {
		if (this.loaded() && !force) return;
		this.isLoading.set(true);
		try {
			this.events.set(await this.calendar.getConfirmedEvents());
		} catch (err) {
			console.error("[OperationsStore]", err);
		} finally {
			this.isLoading.set(false);
			this.loaded.set(true);
		}
	}

	effectiveStatus(e: CalendarEvent): EffectiveWorkStatus {
		const status = e.work_status || "todo";
		if (status === "todo" && new Date(e.end || e.start).getTime() < Date.now()) return "overdue";
		return status;
	}

	forPlant(plantId: string, types?: EventType[]): CalendarEvent[] {
		return this.sorted().filter(e => e.plant_ids?.includes(plantId) && (!types || types.includes(e.type)));
	}

	lastDoneForPlant(plantId: string, types?: EventType[]): CalendarEvent | null {
		return this.forPlant(plantId, types).find(e => e.work_status === "done") ?? null;
	}

	async create(data: Omit<CalendarEvent, "id" | "user_id">): Promise<CalendarEvent> {
		const created = await this.calendar.createEvent(data);
		this.events.update(list => [...list, { ...created, plant_ids: data.plant_ids, work_status: data.work_status || created.work_status || "todo" }]);
		return created;
	}

	async update(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
		const saved = await this.calendar.updateEvent(id, patch);
		this.events.update(list => list.map(e => (e.id === id ? { ...e, ...saved, ...patch } : e)));
		return saved;
	}

	async setWorkStatus(id: string, status: WorkStatus): Promise<void> {
		await this.update(id, { work_status: status });
	}

	async remove(id: string): Promise<void> {
		await this.calendar.deleteEvent(id);
		this.events.update(list => list.filter(e => e.id !== id));
	}
}
