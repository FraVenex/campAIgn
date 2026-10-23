import { Component, computed, input } from "@angular/core";
import { TONE_CLASS, Tone } from "../../../core/constants/domain";

/** Etichetta colorata riutilizzabile per stati (pianta, intervento, categoria...). */
@Component({
	selector: "app-chip",
	standalone: true,
	template: `
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" [class]="toneClass()">
			@if (icon()) {
				<span class="text-[11px] leading-none">{{ icon() }}</span>
			}
			<span>{{ label() }}</span>
		</span>
	`
})
export class ChipComponent {
	readonly label = input.required<string>();
	readonly tone = input<Tone>("neutral");
	readonly icon = input<string>();
	readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
}
