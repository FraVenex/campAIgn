import { Component, computed, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Plant } from "../../../core/services/plants.service";
import { plantStatusMeta } from "../../../core/constants/domain";
import { ChipComponent } from "../chip/chip.component";
import { QuickNoteComponent } from "../quick-note/quick-note.component";

/**
 * Scheda popup di una pianta, usata dentro `app-farm-map` da tutte le sezioni.
 * Struttura comune (intestazione, nota rapida, link al dettaglio) + corpo specifico
 * della sezione proiettato con `<ng-content>` e azioni extra con `[popupActions]`.
 */
@Component({
	selector: "app-plant-popup-card",
	standalone: true,
	imports: [RouterLink, ChipComponent, QuickNoteComponent],
	template: `
		<div class="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-camp-sand/30">
			<div class="flex items-center gap-3 min-w-0">
				<div class="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg shrink-0" [class]="meta().marker">🌳</div>
				<div class="min-w-0">
					<p class="font-serif text-camp-earth font-bold text-sm leading-tight truncate">{{ plant().name }}</p>
					<p class="text-[11px] text-camp-olive truncate mt-0.5">{{ plant().species }}{{ plant().variety ? " · " + plant().variety : "" }}</p>
					<div class="mt-1"><app-chip [label]="plant().status || 'Non Valutato'" [tone]="meta().tone" /></div>
				</div>
			</div>
			<button type="button" (click)="close.emit()" aria-label="Chiudi" class="btn btn-ghost btn-icon btn-sm shrink-0">✕</button>
		</div>

		<div class="px-4 py-3 space-y-2.5 text-xs">
			<ng-content></ng-content>
		</div>

		<div class="px-4 pb-4 space-y-2.5">
			<ng-content select="[popupActions]"></ng-content>
			@if (showQuickNote() && plant().id) {
				<app-quick-note [plantId]="plant().id!" [farmId]="plant().farm_id" placeholder="Nota rapida per questa pianta…" />
			}
			<a [routerLink]="['/land/plant', plant().id]" class="btn btn-primary btn-sm w-full">Apri scheda pianta</a>
		</div>
	`
})
export class PlantPopupCardComponent {
	readonly plant = input.required<Plant>();
	readonly showQuickNote = input(true);
	readonly close = output<void>();
	readonly meta = computed(() => plantStatusMeta(this.plant().status));
}

/** Riga etichetta/valore riutilizzabile nel corpo del popup. */
@Component({
	selector: "app-popup-row",
	standalone: true,
	template: `
		<div class="flex items-center justify-between gap-3">
			<span class="kpi-label shrink-0">{{ label() }}</span>
			<span class="text-camp-earth font-medium text-right truncate"><ng-content></ng-content></span>
		</div>
	`
})
export class PopupRowComponent {
	readonly label = input.required<string>();
}
