import { Component, OnDestroy, input, output, signal } from "@angular/core";

/**
 * Pulsanti per aggiungere foto, condivisi da Galleria e scheda pianta.
 * Su telefono/tablet mostra "Scatta foto" (apre direttamente la fotocamera) e "Dalla galleria"
 * (selezione multipla dal rullino); su computer un unico "Carica foto".
 */
@Component({
	selector: "app-photo-picker",
	standalone: true,
	template: `
		<div class="flex flex-wrap items-center gap-2">
			@if (isTouch()) {
				<button type="button" (click)="camera.click()" [disabled]="disabled()" [class]="'btn btn-secondary' + sizeClass()">Scatta foto</button>
			}
			<button type="button" (click)="library.click()" [disabled]="disabled()" [class]="'btn btn-primary' + sizeClass()">
				{{ isTouch() ? "Dalla galleria" : label() }}
			</button>
			<!-- capture apre la fotocamera posteriore sui dispositivi mobili -->
			<input #camera type="file" accept="image/*" capture="environment" class="hidden" (change)="emit($event)" />
			<input #library type="file" accept="image/*" multiple class="hidden" (change)="emit($event)" />
		</div>
	`
})
export class PhotoPickerComponent implements OnDestroy {
	readonly label = input("Carica foto");
	readonly small = input(false);
	readonly disabled = input(false);
	readonly picked = output<File[]>();

	readonly isTouch = signal(false);
	private readonly mediaQuery = typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)") : null;
	private readonly onChange = (e: MediaQueryListEvent) => this.isTouch.set(e.matches);

	constructor() {
		if (this.mediaQuery) {
			this.isTouch.set(this.mediaQuery.matches);
			this.mediaQuery.addEventListener("change", this.onChange);
		}
	}

	ngOnDestroy() {
		this.mediaQuery?.removeEventListener("change", this.onChange);
	}

	sizeClass(): string {
		return this.small() ? " btn-sm" : "";
	}

	emit(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		input.value = "";
		if (files.length) this.picked.emit(files);
	}
}
