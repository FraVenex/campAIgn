import { Component, input } from "@angular/core";
import { Farm } from "../../../core/services/land.service";
import { RouterLink } from "@angular/router";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-farm-summary",
	standalone: true,
	imports: [RouterLink, CampCardComponent],
	template: `
		<a
			routerLink="/land"
			class="block h-full group"
		>
			<app-camp-card
				[title]="farm().name"
				subtitle="Riepilogo Terreno"
				[icon]="getPlantEmoji(farm().main_crop)"
			>
				<div header-action>
					<span class="px-3 py-1 bg-camp-success-light text-camp-success text-[10px] font-bold rounded-full uppercase tracking-wider"> Attivo </span>
				</div>

				<div class="space-y-4 mt-2">
					<div class="flex items-center justify-between text-sm border-b border-camp-sand/30 pb-3">
						<span class="text-camp-olive/60 font-medium">Coltura</span>
						<span class="font-bold text-camp-earth">{{ getPlantLabel(farm().main_crop) }}</span>
					</div>
					<div class="flex items-center justify-between text-sm border-b border-camp-sand/30 pb-3">
						<span class="text-camp-olive/60 font-medium">Piante</span>
						<span class="font-bold text-camp-earth">{{ farm().plants_count }}</span>
					</div>

					@if (farm().latitude && farm().longitude) {
						<div class="flex items-center gap-2 text-[10px] text-camp-olive/40 pt-2 font-bold uppercase tracking-widest">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
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
	`
})
export class FarmSummaryComponent {
	farm = input.required<Farm>();

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
