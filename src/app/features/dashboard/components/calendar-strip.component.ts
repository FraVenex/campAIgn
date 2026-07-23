import { Component, computed, input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CalendarEvent } from "../../../core/services/calendar.service";
import { WeatherData } from "../../../core/services/weather.service";
import { WeatherImpactService, WeatherImpactEvaluation } from "../../../core/services/weather-impact.service";
import { CampCardComponent } from "../../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-calendar-strip",
	standalone: true,
	imports: [CommonModule, RouterLink, CampCardComponent],
	template: `
		<app-camp-card
			title="Attività Imminenti & Scadenzario"
			[subtitle]="currentMonth()"
			icon="🗓️"
		>
			<div header-action>
				<a
					routerLink="/calendar"
					class="text-xs font-semibold text-camp-sage hover:text-camp-earth transition-colors flex items-center gap-1"
				>
					Vedi Calendario
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>

			<div class="flex justify-between items-center gap-1 sm:gap-2 overflow-x-auto pb-3 scrollbar-hide mt-1 border-b border-camp-sand/30">
				@for (day of weekDays(); track day.label) {
					<div class="flex-1 min-w-[44px] flex flex-col items-center">
						<span class="text-[9px] text-camp-olive/60 uppercase mb-2 font-bold tracking-widest">{{ day.label }}</span>
						<div
							[class]="
								'w-11 h-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border ' +
								(day.isToday
									? 'bg-camp-sage text-white shadow-xs border-camp-sage/20'
									: 'bg-camp-cream/30 text-camp-earth border-camp-sand/20')
							"
						>
							<span class="text-xs font-bold leading-none">{{ day.date.getDate() }}</span>
							@if (day.hasEvents) {
								<div [class]="'w-1.5 h-1.5 rounded-full mt-1 ' + (day.isToday ? 'bg-white' : 'bg-camp-sage')"></div>
							}
						</div>
					</div>
				}
			</div>

			<div class="mt-4 flex-1 flex flex-col justify-center">
				@if (displayEvents().length > 0) {
					<div class="space-y-2">
						@for (event of displayEvents(); track event.id) {
							<a
								routerLink="/calendar"
								class="p-3 rounded-2xl bg-camp-cream/30 hover:bg-white border border-camp-sand/40 flex items-center justify-between transition-all group"
							>
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-camp-sage/10 text-camp-sage flex items-center justify-center text-sm font-bold shrink-0">
										{{ getEventIcon(event.type) }}
									</div>
									<div>
										<div class="flex items-center gap-2">
											<h4 class="font-serif font-bold text-xs text-camp-earth group-hover:text-camp-sage transition-colors">
												{{ event.title }}
											</h4>
											@if (getImpact(event).status === 'attention') {
												<span
													[title]="getImpact(event).reason"
													class="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5"
												>
													<span>{{ getImpact(event).icon }}</span>
													<span>{{ getImpact(event).badgeLabel }}</span>
												</span>
											}
										</div>
										<p class="text-[10px] text-camp-olive/70 font-medium">
											{{ event.start | date: "d MMM, HH:mm" }}
											@if (event.description) {
												• {{ event.description }}
											}
										</p>
									</div>
								</div>

								<span
									[class]="
										'px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ' +
										(isOverdue(event.start)
											? 'bg-red-100 text-red-800'
											: isToday(event.start)
											? 'bg-camp-success-light text-camp-success'
											: 'bg-camp-sand/40 text-camp-earth')
									"
								>
									{{ isOverdue(event.start) ? 'Scaduta' : isToday(event.start) ? 'Oggi' : 'In Arrivo' }}
								</span>
							</a>
						}
					</div>
				} @else {
					<div class="p-4 rounded-2xl bg-camp-cream/20 border border-dashed border-camp-sand/60 flex items-center gap-4">
						<div class="w-10 h-10 rounded-full bg-camp-sage/10 flex items-center justify-center text-lg border border-camp-sage/20 shrink-0">📌</div>
						<div>
							<p class="text-xs text-camp-earth font-bold uppercase tracking-wider">Nessuna attività imminente</p>
							<p class="text-xs text-camp-olive/70 font-medium">Tutto in ordine nei campi per i prossimi giorni. Puoi pianificare nuove attività dal calendario.</p>
						</div>
					</div>
				}
			</div>
		</app-camp-card>
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
export class CalendarStripComponent {
	private weatherImpactService = inject(WeatherImpactService);

	events = input<CalendarEvent[]>([]);
	weather = input<WeatherData | null>(null);

	currentMonth = computed(() => {
		const now = new Date();
		return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(now);
	});

	weekDays = computed(() => {
		const days = [];
		const now = new Date();
		const startOfWeek = new Date(now);
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		startOfWeek.setDate(diff);

		const labels = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
		const currentEvents = this.events();

		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			const dateStr = date.toDateString();

			const hasEvents = currentEvents.some(e => {
				const evDate = new Date(e.start);
				return evDate.toDateString() === dateStr;
			});

			days.push({
				label: labels[i],
				date: date,
				isToday: date.toDateString() === now.toDateString(),
				hasEvents: hasEvents
			});
		}
		return days;
	});

	displayEvents = computed(() => {
		return this.events().slice(0, 4);
	});

	getImpact(event: CalendarEvent): WeatherImpactEvaluation {
		return this.weatherImpactService.evaluateEventImpact(event, this.weather());
	}

	isToday(dateStr: string): boolean {
		const d = new Date(dateStr);
		const today = new Date();
		return d.toDateString() === today.toDateString();
	}

	isOverdue(dateStr: string): boolean {
		const d = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return d < today;
	}

	getEventIcon(type: string): string {
		const map: Record<string, string> = {
			maintenance: "✂️",
			irrigation: "💧",
			harvest: "🫒",
			other: "📝"
		};
		return map[type] ?? "📌";
	}
}
