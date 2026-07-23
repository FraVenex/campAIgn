import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-arnaldo-suggestions",
	standalone: true,
	imports: [CommonModule, CampCardComponent],
	template: `
		<app-camp-card
			title="Consigli Agronomici di Arnaldo"
			subtitle="Suggerimenti Contestuali"
			icon="👨‍🌾"
			variant="default"
		>
			@if (suggestions().length > 0) {
				<div class="space-y-3 mt-2">
					@for (sug of suggestions(); track sug.id) {
						<div class="p-4 rounded-camp bg-camp-cream/30 border border-camp-sand/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white">
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="px-2.5 py-0.5 bg-camp-sage/10 text-camp-sage text-[10px] font-bold uppercase tracking-wider rounded-full">
										{{ getCategoryLabel(sug.type) }}
									</span>
									<h4 class="font-serif font-bold text-sm text-camp-earth">{{ sug.title }}</h4>
								</div>
								@if (sug.description) {
									<p class="text-xs text-camp-olive/80 leading-relaxed">{{ sug.description }}</p>
								}
								@if (sug.suggestion_reason) {
									<p class="text-[11px] text-camp-sage font-medium italic">💡 {{ sug.suggestion_reason }}</p>
								}
							</div>

							<div class="flex items-center gap-2 self-end sm:self-center shrink-0">
								<button
									(click)="dismiss.emit(sug.id!)"
									class="px-3 py-1.5 rounded-full border border-camp-sand/60 text-camp-olive hover:bg-camp-sand/20 text-xs font-semibold transition-all"
								>
									Rifiuta
								</button>
								<button
									(click)="accept.emit(sug.id!)"
									class="px-4 py-1.5 rounded-full bg-camp-sage hover:bg-camp-earth text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
									</svg>
									Accetta
								</button>
							</div>
						</div>
					}
				</div>
			} @else {
				<div class="flex flex-col items-center justify-center py-6 text-center">
					<div class="w-10 h-10 rounded-full bg-camp-sand/20 flex items-center justify-center text-lg mb-2">🌿</div>
					<p class="text-xs font-bold text-camp-earth uppercase tracking-wider">Nessun suggerimento in sospeso</p>
					<p class="text-xs text-camp-olive/60 mt-0.5">Arnaldo sta monitorando il terreno. Ti notificherà appena ci saranno raccomandazioni pertinenti.</p>
				</div>
			}
		</app-camp-card>
	`,
	styles: [
		`
			:host {
				display: block;
				width: 100%;
			}
		`
	]
})
export class ArnaldoSuggestionsComponent {
	suggestions = input.required<CalendarEvent[]>();
	accept = output<string>();
	dismiss = output<string>();

	getCategoryLabel(type: string): string {
		const map: Record<string, string> = {
			maintenance: "Manutenzione",
			irrigation: "Irrigazione",
			harvest: "Raccolta",
			other: "Altro"
		};
		return map[type] ?? "Intervento";
	}
}
