import { Component, inject } from "@angular/core";
import { ToastService } from "../../../core/services/toast.service";

@Component({
	selector: "app-toast-host",
	standalone: true,
	template: `
		<div class="fixed top-4 right-4 left-4 sm:left-auto z-[120] flex flex-col items-end gap-2 pointer-events-none">
			@for (t of toasts(); track t.id) {
				<button
					type="button"
					(click)="dismiss(t.id)"
					class="pointer-events-auto px-4 py-3 rounded-camp shadow-camp-xl border flex items-center gap-3 animate-fade-in text-sm font-medium text-white max-w-sm text-left"
					[class.bg-camp-success]="t.type === 'success'"
					[class.bg-camp-error]="t.type === 'error'"
					[class.bg-camp-sage]="t.type === 'info'"
				>
					<span>{{ t.type === "success" ? "✔️" : t.type === "error" ? "❌" : "ℹ️" }}</span>
					<span>{{ t.message }}</span>
				</button>
			}
		</div>
	`
})
export class ToastHostComponent {
	private toast = inject(ToastService);
	readonly toasts = this.toast.toasts;

	dismiss(id: number) {
		this.toast.dismiss(id);
	}
}
