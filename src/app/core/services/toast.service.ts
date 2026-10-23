import { Injectable, signal } from "@angular/core";

export interface Toast {
	id: number;
	message: string;
	type: "success" | "error" | "info";
}

/** Notifiche globali mostrate dal layout (sostituisce i toast locali delle singole pagine). */
@Injectable({ providedIn: "root" })
export class ToastService {
	readonly toasts = signal<Toast[]>([]);
	private nextId = 1;

	show(message: string, type: Toast["type"] = "success", durationMs = 3200) {
		const toast = { id: this.nextId++, message, type };
		this.toasts.update(list => [...list, toast]);
		setTimeout(() => this.dismiss(toast.id), durationMs);
	}

	success(message: string) {
		this.show(message, "success");
	}

	error(message: string) {
		this.show(message, "error", 4500);
	}

	info(message: string) {
		this.show(message, "info");
	}

	dismiss(id: number) {
		this.toasts.update(list => list.filter(t => t.id !== id));
	}
}
