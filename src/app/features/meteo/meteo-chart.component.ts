import { Component, input } from "@angular/core";
import { ApexOptions, NgApexchartsModule } from "ng-apexcharts";

/** Contenitore di un grafico meteo: titolo, sottotitolo esplicativo e grafico ApexCharts. */
@Component({
	selector: "app-meteo-chart",
	standalone: true,
	imports: [NgApexchartsModule],
	template: `
		<div class="camp-card card-body h-full">
			<div class="section-head mb-2">
				<div class="min-w-0">
					<h3 class="section-title text-lg leading-tight">{{ title() }}</h3>
					@if (subtitle()) {
						<p class="text-muted text-xs mt-0.5">{{ subtitle() }}</p>
					}
				</div>
				@if (hint()) {
					<span class="shrink-0 w-6 h-6 rounded-full bg-camp-cream text-camp-olive text-xs font-bold flex items-center justify-center cursor-help" [title]="hint()" [attr.aria-label]="hint()">?</span>
				}
			</div>
			<apx-chart
				[chart]="options().chart!"
				[series]="options().series!"
				[xaxis]="options().xaxis!"
				[yaxis]="options().yaxis!"
				[colors]="options().colors!"
				[stroke]="options().stroke!"
				[dataLabels]="options().dataLabels!"
				[grid]="options().grid!"
				[tooltip]="options().tooltip!"
				[legend]="options().legend!"
				[plotOptions]="options().plotOptions!"
				[markers]="options().markers!"
				[fill]="options().fill!"
				[annotations]="options().annotations!"
			/>
		</div>
	`
})
export class MeteoChartComponent {
	readonly title = input.required<string>();
	readonly subtitle = input<string>();
	readonly hint = input<string>();
	readonly options = input.required<ApexOptions>();
}
