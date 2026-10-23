import { Component, OnInit, computed, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampDialogComponent } from "../camp-dialog/camp-dialog.component";
import { FarmStore } from "../../../core/services/farm-store.service";
import { OperationsStore } from "../../../core/services/operations.store";
import { ToastService } from "../../../core/services/toast.service";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { EVENT_TYPE_META, EventType, PLANT_STATUSES, WORK_STATUSES, WORK_STATUS_META, WorkStatus } from "../../../core/constants/domain";
import { buildOperationDescription, combineDateTime, parseOperationDescription, toDateInput, toTimeInput } from "../../../core/utils/operation-details";

/**
 * Dialog unico per programmare o modificare un'attività operativa
 * (trattamento, manutenzione, irrigazione, raccolta) su una o più piante.
 * L'attività finisce nel calendario e nel registro interventi.
 */
@Component({
	selector: "app-operation-form-dialog",
	standalone: true,
	imports: [FormsModule, CampDialogComponent],
	template: `
		<app-camp-dialog [title]="event() ? 'Modifica attività' : dialogTitle()" [subtitle]="plantsLabel()" [icon]="typeMeta[form.type].icon" maxWidth="max-w-2xl" (close)="close.emit()">
			<form id="operationForm" (ngSubmit)="save()" class="space-y-5">
				@if (types().length > 1) {
					<div>
						<span class="camp-label">Tipo di attività</span>
						<div class="flex flex-wrap gap-2">
							@for (t of types(); track t) {
								<button type="button" (click)="setType(t)" class="filter-chip" [class.is-active]="form.type === t">
									<span>{{ typeMeta[t].icon }}</span>{{ typeMeta[t].label }}
								</button>
							}
						</div>
					</div>
				}

				<label class="block">
					<span class="camp-label">Titolo</span>
					<input class="camp-input" name="title" [(ngModel)]="form.title" required />
				</label>

				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<label class="block col-span-2 sm:col-span-1">
						<span class="camp-label">Data inizio</span>
						<input class="camp-input" type="date" name="startDate" [(ngModel)]="form.startDate" required />
					</label>
					<label class="block">
						<span class="camp-label">Ora</span>
						<input class="camp-input" type="time" name="startTime" [(ngModel)]="form.startTime" />
					</label>
					<label class="block col-span-2 sm:col-span-1">
						<span class="camp-label">Data fine</span>
						<input class="camp-input" type="date" name="endDate" [(ngModel)]="form.endDate" />
					</label>
					<label class="block">
						<span class="camp-label">Ora</span>
						<input class="camp-input" type="time" name="endTime" [(ngModel)]="form.endTime" />
					</label>
				</div>

				@if (form.type === "treatment" || form.type === "irrigation" || form.type === "maintenance") {
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<label class="block">
							<span class="camp-label">{{ form.type === "maintenance" ? "Attrezzo / mezzo" : "Prodotto" }}</span>
							<input class="camp-input" name="product" [(ngModel)]="form.product" [placeholder]="form.type === 'treatment' ? 'Es. Ossicloruro di rame' : form.type === 'irrigation' ? 'Es. Impianto a goccia' : 'Es. Motosega, forbici'" />
						</label>
						<label class="block">
							<span class="camp-label">{{ form.type === "irrigation" ? "Volume" : "Dose / quantità" }}</span>
							<input class="camp-input" name="dose" [(ngModel)]="form.dose" [placeholder]="form.type === 'irrigation' ? 'Es. 40 L per pianta' : 'Es. 300 g/hl'" />
						</label>
					</div>
				}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label class="block">
						<span class="camp-label">Stato lavoro</span>
						<select class="camp-input" name="workStatus" [(ngModel)]="form.workStatus">
							@for (s of workStatuses; track s) {
								<option [value]="s">{{ workMeta[s].icon }} {{ workMeta[s].label }}</option>
							}
						</select>
					</label>
					@if (plantIds().length) {
						<label class="block">
							<span class="camp-label">Aggiorna salute piante</span>
							<select class="camp-input" name="healthStatus" [(ngModel)]="form.healthStatus">
								<option value="">Lascia invariato</option>
								@for (s of plantStatuses; track s) {
									<option [value]="s">{{ s }}</option>
								}
							</select>
						</label>
					}
				</div>

				<label class="block">
					<span class="camp-label">Note operative</span>
					<textarea class="camp-input" rows="3" name="notes" [(ngModel)]="form.notes" placeholder="Condizioni, osservazioni, chi ha svolto il lavoro…"></textarea>
				</label>

				@if (plantNames().length) {
					<div class="text-xs text-camp-olive bg-camp-cream/50 border border-camp-sand/40 rounded-xl p-3">
						<span class="font-bold text-camp-earth">Piante coinvolte:</span>
						{{ plantNames().slice(0, 12).join(", ") }}{{ plantNames().length > 12 ? " e altre " + (plantNames().length - 12) : "" }}
					</div>
				}
			</form>

			<div footer class="dialog-footer">
				<button type="button" (click)="close.emit()" class="btn btn-secondary">Annulla</button>
				<button type="submit" form="operationForm" [disabled]="saving()" class="btn btn-primary">
					{{ saving() ? "Salvataggio…" : event() ? "Salva modifiche" : "Programma" }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class OperationFormDialogComponent implements OnInit {
	private farm = inject(FarmStore);
	private ops = inject(OperationsStore);
	private toast = inject(ToastService);

	readonly plantIds = input<string[]>([]);
	readonly types = input<EventType[]>(["treatment", "maintenance", "irrigation", "other"]);
	readonly defaultType = input<EventType>("treatment");
	readonly event = input<CalendarEvent | null>(null);
	readonly close = output<void>();
	readonly saved = output<CalendarEvent>();

	readonly typeMeta = EVENT_TYPE_META;
	readonly workMeta = WORK_STATUS_META;
	readonly workStatuses = WORK_STATUSES;
	readonly plantStatuses = PLANT_STATUSES;
	readonly saving = signal(false);

	readonly plantNames = computed(() =>
		this.plantIds()
			.map(id => this.farm.getPlant(id)?.name)
			.filter((n): n is string => !!n)
	);
	readonly plantsLabel = computed(() => {
		const n = this.plantIds().length;
		return n ? `${n} ${n === 1 ? "pianta" : "piante"}` : "Tutto il terreno";
	});
	readonly dialogTitle = computed(() => (this.defaultType() === "harvest" ? "Programma raccolta" : "Nuova attività"));

	form = {
		type: "treatment" as EventType,
		title: "",
		startDate: toDateInput(),
		startTime: "09:00",
		endDate: toDateInput(),
		endTime: "12:00",
		product: "",
		dose: "",
		notes: "",
		workStatus: "todo" as WorkStatus,
		healthStatus: ""
	};

	ngOnInit() {
		const e = this.event();
		if (e) {
			const details = parseOperationDescription(e.description);
			this.form = {
				type: e.type,
				title: e.title,
				startDate: toDateInput(e.start),
				startTime: toTimeInput(e.start),
				endDate: toDateInput(e.end || e.start),
				endTime: toTimeInput(e.end, "12:00"),
				product: details.product,
				dose: details.dose,
				notes: details.notes,
				workStatus: e.work_status || "todo",
				healthStatus: ""
			};
		} else {
			this.setType(this.defaultType());
		}
	}

	setType(type: EventType) {
		const previousDefault = this.defaultTitle(this.form.type);
		this.form.type = type;
		if (!this.form.title || this.form.title === previousDefault) this.form.title = this.defaultTitle(type);
	}

	async save() {
		if (!this.form.title.trim()) {
			this.toast.error("Inserisci un titolo");
			return;
		}
		const start = combineDateTime(this.form.startDate, this.form.startTime);
		let end = combineDateTime(this.form.endDate || this.form.startDate, this.form.endTime || this.form.startTime);
		if (end < start) end = start;
		const description = buildOperationDescription(this.form);
		const ids = this.event()?.plant_ids?.length ? this.event()!.plant_ids! : this.plantIds();

		this.saving.set(true);
		try {
			let saved: CalendarEvent;
			const e = this.event();
			if (e?.id) {
				saved = await this.ops.update(e.id, { type: this.form.type, title: this.form.title.trim(), description, start, end, work_status: this.form.workStatus });
			} else {
				saved = await this.ops.create({
					farm_id: this.farm.farm()?.id || "",
					title: this.form.title.trim(),
					description,
					type: this.form.type,
					start,
					end,
					all_day: false,
					source: "user",
					status: "confirmed",
					plant_ids: ids,
					work_status: this.form.workStatus
				});
			}

			const plantPatch: Record<string, unknown> = {};
			if (this.form.healthStatus) plantPatch["status"] = this.form.healthStatus;
			if (this.form.type === "treatment" && this.form.workStatus === "done") {
				plantPatch["last_treatment_type"] = this.form.product || this.form.title.trim();
				plantPatch["last_treatment_at"] = start;
			}
			if (ids.length && Object.keys(plantPatch).length) await this.farm.updatePlants(ids, plantPatch);

			this.toast.success(e ? "Attività aggiornata" : `Attività «${EVENT_TYPE_META[this.form.type].label}» aggiunta al calendario`);
			this.saved.emit(saved);
			this.close.emit();
		} catch (err) {
			console.error(err);
			this.toast.error("Impossibile salvare l'attività");
		} finally {
			this.saving.set(false);
		}
	}

	private defaultTitle(type: EventType): string {
		const n = this.plantIds().length;
		const suffix = n > 1 ? " di gruppo" : "";
		return `${EVENT_TYPE_META[type].label}${suffix}`;
	}
}
