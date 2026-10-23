import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AppLayoutComponent } from "../app-layout/app-layout.component";

/** Shell autenticata: layout persistente (menù, Arnaldo, notifiche) attorno alle pagine. */
@Component({
	selector: "app-shell",
	standalone: true,
	imports: [RouterOutlet, AppLayoutComponent],
	template: `
		<app-layout>
			<router-outlet />
		</app-layout>
	`
})
export class AppShellComponent {}
