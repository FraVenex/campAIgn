import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Farm } from "../../../core/services/land.service";
import { RouterLink } from "@angular/router";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-farm-summary",
	standalone: true,
	imports: [CommonModule, RouterLink, CampCardComponent],
	template: `
		<a
			routerLink="/land"
			class="block h-full w-full group"
		>
			<app-camp-card
				[title]="farm().name"
				subtitle="Stato Terreno & Salute"
				[icon]="getPlantEmoji(farm().main_crop)"
			>
				<div header-action>
					<span class="px-3 py-1 bg-camp-success-light text-camp-success text-[10px] font-bold rounded-full uppercase tracking-wider"> Attivo </span>
				</div>

				<div class="space-y-4 my-auto">
					<div class="flex items-center justify-between text-xs border-b border-camp-sand/30 pb-3">
						<span class="text-camp-olive/60 font-medium">Coltura Principale</span>
						<span class="font-bold text-camp-earth">{{ getPlantLabel(farm().main_crop) }}</span>
					</div>

					<div class="flex items-center justify-between text-xs border-b border-camp-sand/30 pb-3">
						<span class="text-camp-olive/60 font-medium">Totale Piante</span>
						<span class="font-bold text-camp-earth text-sm">{{ totalPlants() }}</span>
					</div>

					<div class="grid grid-cols-2 gap-3 pt-1">
						<div class="p-3 rounded-xl bg-camp-success-light/40 border border-camp-success/10 flex flex-col items-center justify-center">
							<span class="text-[9px] uppercase font-bold text-camp-success tracking-wider">In Stato Ottimo</span>
							<span class="text-lg font-bold text-camp-earth font-serif mt-1">{{ optimalCount() }}</span>
						</div>
						<div
							[class]="
								'p-3 rounded-xl border flex flex-col items-center justify-center ' +
								(criticalCount() > 0 ? 'bg-amber-50 border-amber-200' : 'bg-camp-cream/40 border-camp-sand/40')
							"
						>
							<span
								[class]="
									'text-[9px] uppercase font-bold tracking-wider ' +
									(criticalCount() > 0 ? 'text-amber-800' : 'text-camp-olive/60')
								"
							>
								Richiedono Cura
							</span>
							<span class="text-lg font-bold text-camp-earth font-serif mt-1">{{ criticalCount() }}</span>
						</div>
					</div>

					@if (farm().latitude && farm().longitude) {
						<div class="flex items-center gap-2 text-[10px] text-camp-olive/50 pt-2 font-bold uppercase tracking-widest">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3.5 w-3.5 shrink-0"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
							</svg>
							<span>{{ farm().latitude?.toFixed(4) }}, {{ farm().longitude?.toFixed(4) }}</span>
						</div>
					}
				</div>
			</app-camp-card>
		</a>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex-direction: column;
				height: 100%;
				width: 100%;
			}
		`
	]
})
export class FarmSummaryComponent {
	farm = input.required<Farm>();
	totalPlants = input<number>(0);
	optimalCount = input<number>(0);
	criticalCount = input<number>(0);

	getPlantEmoji(type: string): string {
		const map: Record<string, string> = {
			ULIVI: "🫒",
			AGRUMI: "🍊",
			VIGNETO: "🍇",
			ALTRO: "🌿"
		};
		return map[type] ?? "🌱";
	}

	getPlantLabel(type: string): string {
		const map: Record<string, string> = {
			ULIVI: "Uliveto",
			AGRUMI: "Agrumeto",
			VIGNETO: "Vigneto",
			ALTRO: "Misto"
		};
		return map[type] ?? "Coltura";
	}
}
