import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

export interface DashboardAlert {
	id: string;
	severity: "critical" | "warning" | "info";
	title: string;
	message: string;
	icon: string;
	actionUrl?: string;
	actionLabel?: string;
}

@Component({
	selector: "app-dashboard-alerts",
	standalone: true,
	imports: [CommonModule, RouterLink],
	template: `
		<div class="space-y-3">
			@for (alert of alerts(); track alert.id) {
				<div
					[class]="
						'p-4 rounded-camp border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ' +
						(alert.severity === 'critical'
							? 'bg-red-50/90 border-red-200 text-red-900 shadow-xs'
							: alert.severity === 'warning'
							? 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs'
							: 'bg-camp-cream/50 border-camp-sand text-camp-earth')
					"
				>
					<div class="flex items-start gap-3">
						<span class="text-2xl shrink-0 leading-none mt-0.5">{{ alert.icon }}</span>
						<div>
							<h4 class="font-serif font-bold text-sm leading-tight">{{ alert.title }}</h4>
							<p class="text-xs opacity-80 mt-0.5 leading-relaxed font-medium">{{ alert.message }}</p>
						</div>
					</div>

					@if (alert.actionUrl && alert.actionLabel) {
						<a
							[routerLink]="alert.actionUrl"
							[class]="
								'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs text-center self-end sm:self-center ' +
								(alert.severity === 'critical'
									? 'bg-red-600 hover:bg-red-700 text-white'
									: alert.severity === 'warning'
									? 'bg-amber-600 hover:bg-amber-700 text-white'
									: 'bg-camp-sage hover:bg-camp-earth text-white')
							"
						>
							{{ alert.actionLabel }}
						</a>
					}
				</div>
			}
		</div>
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
export class DashboardAlertsComponent {
	alerts = input.required<DashboardAlert[]>();
}
