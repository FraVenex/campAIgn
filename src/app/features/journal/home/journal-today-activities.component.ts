import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ChipComponent } from "../../../shared/components/chip/chip.component";
import { OperationsStore } from "../../../core/services/operations.store";
import { FarmStore } from "../../../core/services/farm-store.service";
import { ToastService } from "../../../core/services/toast.service";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { WORK_STATUS_META, WorkStatus, eventTypeMeta, formatDateIt } from "../../../core/constants/domain";
import { parseOperationDescription } from "../../../core/utils/operation-details";

interface ActivityView {
	event: CalendarEvent;
	type: ReturnType<typeof eventTypeMeta>;
	status: (typeof WORK_STATUS_META)[keyof typeof WORK_STATUS_META];
	statusKey: keyof typeof WORK_STATUS_META;
	time: string;
	plants: string;
	product: string;
	dose: string;
	notes: string;
}

/** Attività del giorno con aggiornamento rapido dello stato di lavoro. */
@Component({
	selector: "app-journal-today-activities",
	standalone: true,
	imports: [RouterLink, ChipComponent],
	template: `
		<section class="camp-card card-body h-full">
			<div class="section-head">
				<div>
					<p class="eyebrow">📋 Oggi</p>
					<h2 class="section-title">Attività di oggi</h2>
				</div>
				<a routerLink="/operations/log" class="btn btn-ghost btn-sm">Registro →</a>
			</div>

			@if (ops.isLoading() && !ops.loaded()) {
				<div class="space-y-2">
					<div class="h-20 bg-camp-sand/20 animate-pulse rounded-xl"></div>
					<div class="h-20 bg-camp-sand/20 animate-pulse rounded-xl"></div>
				</div>
			} @else if (items().length) {
				<ul class="space-y-3">
					@for (a of items(); track a.event.id) {
						<li class="border border-camp-sand/50 rounded-xl p-3 sm:p-4 bg-camp-beige">
							<div class="flex items-start gap-3">
								<span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xl" [style.background]="a.type.color + '1A'">{{ a.type.icon }}</span>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
										<p class="font-semibold text-camp-earth text-sm">{{ a.event.title }}</p>
										<app-chip [label]="a.status.label" [icon]="a.status.icon" [tone]="a.status.tone" />
									</div>
									<p class="text-[11px] text-camp-olive mt-0.5">{{ a.type.label }} · {{ a.time }}</p>
									@if (a.plants) {
										<p class="text-xs text-camp-bark mt-1">🌳 {{ a.plants }}</p>
									}
									@if (a.product || a.dose) {
										<p class="text-xs text-camp-bark mt-0.5">
											🧴 {{ a.product || "Prodotto n.d." }}
											@if (a.dose) {
												<span class="text-camp-olive">· dose {{ a.dose }}</span>
											}
										</p>
									}
									@if (a.notes) {
										<p class="text-xs text-camp-olive mt-1 line-clamp-2 whitespace-pre-line">{{ a.notes }}</p>
									}
								</div>
							</div>
							<div class="grid grid-cols-3 gap-1.5 mt-3">
								@for (s of quickStatuses; track s) {
									<button
										type="button"
										(click)="setStatus(a.event, s)"
										[disabled]="busy() === a.event.id"
										class="filter-chip justify-center disabled:opacity-50 disabled:pointer-events-none"
										[class.is-active]="a.event.work_status === s"
										[attr.aria-pressed]="a.event.work_status === s"
									>
										{{ statusMeta[s].icon }} {{ statusMeta[s].label }}
									</button>
								}
							</div>
						</li>
					}
				</ul>
			} @else {
				<div class="empty-state">
					<p class="empty-state-icon">🌤️</p>
					<p class="text-sm text-camp-earth font-semibold">Nessuna attività in programma oggi</p>
					@if (next(); as n) {
						<p class="text-muted">
							Prossima: {{ typeMeta(n.type).icon }} <strong class="text-camp-bark">{{ n.title }}</strong> · {{ formatDate(n.start) }}
						</p>
					} @else {
						<p class="text-muted">Nessuna attività programmata nei prossimi giorni.</p>
					}
					<a routerLink="/operations/map" class="btn btn-primary btn-sm mt-2">Programma un intervento</a>
				</div>
			}
		</section>
	`
})
export class JournalTodayActivitiesComponent {
	readonly ops = inject(OperationsStore);
	private farmStore = inject(FarmStore);
	private toast = inject(ToastService);

	readonly statusMeta = WORK_STATUS_META;
	readonly quickStatuses: WorkStatus[] = ["in_progress", "done", "skipped"];
	readonly busy = signal<string | null>(null);

	readonly items = computed<ActivityView[]>(() =>
		this.ops.today().map(event => {
			const statusKey = this.ops.effectiveStatus(event);
			const details = parseOperationDescription(event.description);
			return {
				event,
				type: eventTypeMeta(event.type),
				status: WORK_STATUS_META[statusKey],
				statusKey,
				time: this.timeLabel(event),
				plants: this.plantsLabel(event.plant_ids || []),
				product: details.product,
				dose: details.dose,
				notes: details.notes
			};
		})
	);

	readonly next = computed(() => this.ops.upcoming()[0] ?? null);

	async setStatus(event: CalendarEvent, status: WorkStatus) {
		if (!event.id) return;
		const target: WorkStatus = event.work_status === status ? "todo" : status;
		this.busy.set(event.id);
		try {
			await this.ops.setWorkStatus(event.id, target);
			this.toast.success(target === "todo" ? `«${event.title}» riportata a da svolgere` : `«${event.title}»: ${WORK_STATUS_META[target].label.toLowerCase()}`);
		} catch {
			this.toast.error("Impossibile aggiornare lo stato dell'attività");
		} finally {
			this.busy.set(null);
		}
	}

	private timeLabel(e: CalendarEvent): string {
		if (e.all_day) return "Tutto il giorno";
		const t = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
		return e.end && e.end !== e.start ? `${t(e.start)} – ${t(e.end)}` : t(e.start);
	}

	private plantsLabel(ids: string[]): string {
		if (!ids.length) return "";
		const names = ids.map(id => this.farmStore.getPlant(id)?.name).filter((n): n is string => !!n);
		const shown = names.slice(0, 3).join(", ");
		const rest = ids.length - Math.min(3, names.length);
		const count = `${ids.length} ${ids.length === 1 ? "pianta" : "piante"}`;
		return shown ? `${count}: ${shown}${rest > 0 ? ` +${rest}` : ""}` : count;
	}

	typeMeta = eventTypeMeta;
	formatDate = (v?: string | null) => formatDateIt(v, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
