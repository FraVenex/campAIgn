import { Routes } from "@angular/router";
import { guestGuard } from "./core/guards/guest.guard";
import { onboardingGuard } from "./core/guards/onboarding.guard";
import { appGuard } from "./core/guards/no-onboarding.guard";
import { AppShellComponent } from "./shared/components/app-shell/app-shell.component";

export const routes: Routes = [
	{
		path: "login",
		loadComponent: () => import("./features/auth/login/login.component").then(m => m.LoginComponent),
		canActivate: [guestGuard]
	},
	{
		path: "register",
		loadComponent: () => import("./features/auth/register/register.component").then(m => m.RegisterComponent),
		canActivate: [guestGuard]
	},
	{
		path: "onboarding",
		loadComponent: () => import("./features/onboarding/onboarding.component").then(m => m.OnboardingComponent),
		canActivate: [onboardingGuard]
	},
	{
		path: "",
		component: AppShellComponent,
		canActivate: [appGuard],
		children: [
			{ path: "", pathMatch: "full", redirectTo: "journal/home" },
			{
				path: "journal",
				children: [
					{ path: "", pathMatch: "full", redirectTo: "home" },
					{ path: "home", title: "Diario · campAIgn", loadComponent: () => import("./features/journal/home/journal-home.component").then(m => m.JournalHomeComponent) },
					{ path: "notes", title: "Note · campAIgn", loadComponent: () => import("./features/journal/notes/journal-notes.component").then(m => m.JournalNotesComponent) }
				]
			},
			{ path: "calendar", title: "Calendario · campAIgn", loadComponent: () => import("./features/calendar/calendar.component").then(m => m.CalendarComponent) },
			{
				path: "land",
				children: [
					{ path: "", pathMatch: "full", redirectTo: "map" },
					{ path: "map", title: "Mappa terreno · campAIgn", loadComponent: () => import("./features/land/map/land-map.component").then(m => m.LandMapComponent) },
					{ path: "plants", title: "Lista piante · campAIgn", loadComponent: () => import("./features/land/plants/plant-list.component").then(m => m.PlantListComponent) },
					{ path: "plant/:id", title: "Scheda pianta · campAIgn", loadComponent: () => import("./features/land/plant-detail/plant-detail.component").then(m => m.PlantDetailComponent) }
				]
			},
			{
				path: "operations",
				children: [
					{ path: "", pathMatch: "full", redirectTo: "map" },
					{ path: "map", title: "Interventi · campAIgn", loadComponent: () => import("./features/operations/map/operations-map.component").then(m => m.OperationsMapComponent) },
					{ path: "log", title: "Registro interventi · campAIgn", loadComponent: () => import("./features/operations/log/operations-log.component").then(m => m.OperationsLogComponent) }
				]
			},
			{
				path: "harvest",
				children: [
					{ path: "", pathMatch: "full", redirectTo: "map" },
					{ path: "map", title: "Raccolta · campAIgn", loadComponent: () => import("./features/harvest/map/harvest-map.component").then(m => m.HarvestMapComponent) },
					{ path: "archive", title: "Archivio raccolta · campAIgn", loadComponent: () => import("./features/harvest/archive/harvest-archive.component").then(m => m.HarvestArchiveComponent) }
				]
			},
			{ path: "accounting", title: "Contabilità · campAIgn", loadComponent: () => import("./features/accounting/accounting.component").then(m => m.AccountingComponent) },
			{ path: "meteo", title: "Meteo · campAIgn", loadComponent: () => import("./features/meteo/meteo.component").then(m => m.MeteoComponent) },
			{ path: "gallery", title: "Galleria · campAIgn", loadComponent: () => import("./features/gallery/gallery.component").then(m => m.GalleryComponent) },
			// Compatibilità con i vecchi percorsi
			{ path: "dashboard", redirectTo: "journal/home" },
			{ path: "archive", redirectTo: "operations/log" }
		]
	},
	{ path: "**", redirectTo: "login" }
];
