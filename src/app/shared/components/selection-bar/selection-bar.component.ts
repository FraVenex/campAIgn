import { Component, OnDestroy, effect, inject, input, output } from "@angular/core";
import { ArnaldoService } from "../../../core/services/arnaldo.service";

/**
 * Barra flottante per le azioni sulle piante selezionate in mappa (Interventi, Raccolta).
 * Le azioni specifiche della sezione sono proiettate come contenuto.
 * Nasconde il pulsante di Arnaldo mentre è visibile per evitare sovrapposizioni.
 */
@Component({
	selector: "app-selection-bar",
	standalone: true,
	template: `
		@if (count() > 0) {
			<div
				class="fixed z-[45] inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:inset-x-auto lg:left-[calc(50%+8rem)] lg:-translate-x-1/2 lg:bottom-6 bg-camp-earth/95 text-white rounded-2xl shadow-camp-xl border border-white/10 backdrop-blur px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up lg:max-w-3xl"
			>
				<div class="flex items-center justify-between gap-3 sm:pr-4 sm:border-r border-white/10">
					<div class="flex items-center gap-2.5">
						<span class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">🌳</span>
						<div class="leading-tight">
							<p class="text-sm font-bold">{{ count() }} {{ count() === 1 ? "pianta" : "piante" }}</p>
							<p class="text-[10px] text-white/60 uppercase tracking-wider">selezionate</p>
						</div>
					</div>
					<div class="flex items-center gap-1">
						<button type="button" (click)="selectAll.emit()" class="btn btn-sm text-white/85 hover:bg-white/10">Tutte</button>
						<button type="button" (click)="clear.emit()" class="btn btn-sm text-white/85 hover:bg-white/10">Annulla</button>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<ng-content></ng-content>
				</div>
			</div>
		}
	`
})
export class SelectionBarComponent implements OnDestroy {
	private arnaldo = inject(ArnaldoService);
	readonly count = input.required<number>();
	readonly selectAll = output<void>();
	readonly clear = output<void>();

	constructor() {
		effect(() => this.arnaldo.setFabVisible(this.count() === 0), { allowSignalWrites: true });
	}

	ngOnDestroy() {
		this.arnaldo.setFabVisible(true);
	}
}
