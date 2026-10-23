import { Component, input, output } from "@angular/core";
import { CampDialogComponent } from "../camp-dialog/camp-dialog.component";

/** Conferma generica per azioni irreversibili (eliminazioni). */
@Component({
	selector: "app-confirm-dialog",
	standalone: true,
	imports: [CampDialogComponent],
	template: `
		<app-camp-dialog [title]="title()" subtitle="Conferma" icon="⚠️" maxWidth="max-w-md" (close)="cancel.emit()">
			<p class="text-sm text-camp-earth leading-relaxed">{{ message() }}</p>
			<div footer class="dialog-footer">
				<button type="button" (click)="cancel.emit()" class="btn btn-secondary">Annulla</button>
				<button type="button" (click)="confirm.emit()" class="btn btn-danger">
					{{ confirmLabel() }}
				</button>
			</div>
		</app-camp-dialog>
	`
})
export class ConfirmDialogComponent {
	readonly title = input("Sei sicuro?");
	readonly message = input.required<string>();
	readonly confirmLabel = input("Elimina");
	readonly confirm = output<void>();
	readonly cancel = output<void>();
}
