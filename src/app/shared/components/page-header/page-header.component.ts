import { Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { SectionTab } from "../../../core/constants/navigation";

/**
 * Intestazione standard delle pagine: sezione, titolo, descrizione, azioni (slot `[actions]`)
 * e sotto-menù a tab della sezione (es. Diario → Home / Note).
 */
@Component({
	selector: "app-page-header",
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	template: `
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div class="min-w-0">
					@if (section()) {
						<p class="eyebrow mb-1">{{ section() }}</p>
					}
					<h1 class="text-3xl sm:text-4xl font-serif text-camp-earth tracking-tight">{{ title() }}</h1>
					@if (description()) {
						<p class="text-muted mt-1 max-w-2xl">{{ description() }}</p>
					}
				</div>
				<div class="flex flex-wrap items-center gap-2 shrink-0">
					<ng-content select="[actions]"></ng-content>
				</div>
			</div>

			@if (tabs().length) {
				<nav class="segmented w-full sm:w-fit overflow-x-auto" aria-label="Sotto-menù sezione">
					@for (tab of tabs(); track tab.link) {
						<a
							[routerLink]="tab.link"
							routerLinkActive="is-active"
							#rla="routerLinkActive"
							[attr.aria-current]="rla.isActive ? 'page' : null"
							class="segmented-item flex-1 sm:flex-none"
						>
							<span>{{ tab.icon }}</span>
							<span>{{ tab.label }}</span>
						</a>
					}
				</nav>
			}
		</div>
	`
})
export class PageHeaderComponent {
	readonly section = input<string>();
	readonly title = input.required<string>();
	readonly description = input<string>();
	readonly tabs = input<SectionTab[]>([]);
}
