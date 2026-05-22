import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { PlantsService, Plant } from "../../core/services/plants.service";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";

@Component({
	selector: "app-plant-detail",
	standalone: true,
	imports: [CommonModule, RouterLink, AppLayoutComponent, CampCardComponent],
	template: `
		<app-layout>
			<div class="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
				<div>
					<nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
						<a routerLink="/dashboard" class="hover:text-camp-sage transition-colors">Dashboard</a>
						<span>/</span>
						<a routerLink="/land" class="hover:text-camp-sage transition-colors">Il Mio Terreno</a>
						<span>/</span>
						<span class="text-camp-sage">Dettaglio Pianta</span>
					</nav>
					<h1 class="text-4xl font-serif text-camp-earth tracking-tight">Scheda Pianta</h1>
				</div>

				@if (isLoading()) {
					<div class="h-96 bg-camp-sand/10 animate-pulse rounded-camp"></div>
				} @else if (error()) {
					<app-camp-card title="Errore" subtitle="Impossibile caricare i dettagli" icon="⚠️">
						<div class="text-center py-8">
							<p class="text-camp-olive mb-6">{{ error() }}</p>
							<a routerLink="/land" class="camp-btn-primary max-w-xs mx-auto">Torna al Terreno</a>
						</div>
					</app-camp-card>
				} @else {
					@if (plant(); as p) {
						<app-camp-card [title]="p.name" [subtitle]="p.species" icon="🌳">
							<div class="space-y-6">
								<div class="flex flex-col sm:flex-row items-center gap-6 p-6 bg-camp-cream/20 rounded-camp border border-camp-sand/30">
									<div
										class="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner border shrink-0"
										[ngClass]="{
											'bg-camp-success-light border-camp-success/20 text-camp-success': p.status === 'Ottimo',
											'bg-camp-amber-light/20 border-camp-amber/20 text-camp-amber': p.status === 'Attenzione',
											'bg-camp-error-light border-camp-error/20 text-camp-error': p.status === 'Stressato',
											'bg-camp-sand/20 border-camp-sand/40 text-camp-olive': p.status !== 'Ottimo' && p.status !== 'Attenzione' && p.status !== 'Stressato'
										}"
									>
										🌳
									</div>
									<div class="text-center sm:text-left flex-1 space-y-2">
										<h2 class="text-2xl font-serif text-camp-earth font-bold">{{ p.name }}</h2>
										<p class="text-sm text-camp-olive font-medium">Specie: <span class="text-camp-earth font-semibold">{{ p.species }}</span></p>
										<div class="flex flex-wrap justify-center sm:justify-start gap-3 mt-2">
											<span
												[ngClass]="{
													'bg-camp-success-light text-camp-success border-camp-success/15': p.status === 'Ottimo',
													'bg-camp-amber-light/30 text-camp-amber border-camp-amber/15': p.status === 'Attenzione',
													'bg-camp-error-light text-camp-error border-camp-error/15': p.status === 'Stressato',
													'bg-camp-sand/30 text-camp-olive border-camp-sand/30': p.status !== 'Ottimo' && p.status !== 'Attenzione' && p.status !== 'Stressato'
												}"
												class="mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
											>
												Stato: {{ p.status }}
											</span>
										</div>
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="bg-white rounded-camp p-5 border border-camp-sand/40 space-y-3">
										<h3 class="text-sm font-bold uppercase tracking-widest text-camp-olive opacity-80">Posizione Mappa</h3>
										<div class="space-y-2 text-sm">
											<div class="flex justify-between py-1 border-b border-camp-sand/20">
												<span class="text-camp-olive">Coordinata X relativa</span>
												<span class="font-mono text-camp-earth font-semibold">{{ p.position_x }}%</span>
											</div>
											<div class="flex justify-between py-1 border-b border-camp-sand/20">
												<span class="text-camp-olive">Coordinata Y relativa</span>
												<span class="font-mono text-camp-earth font-semibold">{{ p.position_y }}%</span>
											</div>
										</div>
									</div>

									<div class="bg-white rounded-camp p-5 border border-camp-sand/40 space-y-3">
										<h3 class="text-sm font-bold uppercase tracking-widest text-camp-olive opacity-80">Ultimo Intervento</h3>
										<div class="space-y-2 text-sm">
											<div class="flex justify-between py-1 border-b border-camp-sand/20">
												<span class="text-camp-olive">Data</span>
												<span class="font-serif text-camp-earth font-bold">{{ p.last_treatment_at ? (p.last_treatment_at | date: "d MMMM yyyy") : "Nessuno" }}</span>
											</div>
											<div class="flex justify-between py-1 border-b border-camp-sand/20">
												<span class="text-camp-olive">Tipo</span>
												<span class="font-serif text-camp-earth font-bold">{{ p.last_treatment_type || "Nessuno" }}</span>
											</div>
										</div>
									</div>
								</div>

								<div class="p-5 rounded-camp border bg-camp-cream/15 border-camp-sand/30 space-y-3">
									<div class="flex items-center gap-2">
										<span class="text-xl">👨‍🌾</span>
										<h3 class="text-xs uppercase font-bold tracking-widest text-camp-sage">Raccomandazione di Arnaldo</h3>
									</div>
									<p class="text-sm text-camp-olive leading-relaxed font-medium">
										{{ getArnaldoRecommendation(p) }}
									</p>
									<div class="mt-4 pt-3 border-t border-camp-sand/30 flex justify-end">
										<span class="text-[10px] text-camp-olive/60 font-semibold italic">Nota: Questa scheda verrà espansa con grafici storici e log dettagliati nel prossimo rilascio.</span>
									</div>
								</div>

								<div class="flex gap-4 justify-between items-center pt-4">
									<a routerLink="/land" class="camp-btn-secondary max-w-xs">
										Torna al Terreno
									</a>
								</div>
							</div>
						</app-camp-card>
					}
				}
			</div>
		</app-layout>
	`,
	styles: [
		`
			:host {
				display: block;
			}
		`
	]
})
export class PlantDetailComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private plantsService = inject(PlantsService);

	plant = signal<Plant | null>(null);
	isLoading = signal(true);
	error = signal<string | null>(null);

	async ngOnInit() {
		const id = this.route.snapshot.paramMap.get("id");
		if (!id) {
			this.error.set("Identificativo pianta mancante.");
			this.isLoading.set(false);
			return;
		}

		try {
			const data = await this.plantsService.getPlantById(id);
			this.plant.set(data);
		} catch (err: any) {
			console.error(err);
			this.error.set("Impossibile caricare i dati della pianta dal database.");
		} finally {
			this.isLoading.set(false);
		}
	}

	getArnaldoRecommendation(p: Plant): string {
		if (p.status === "Stressato") {
			return `L'albero '${p.name}' mostra segni visibili di stress biologico. Arnaldo consiglia un intervento immediato di soccorso idrico o nutrizionale per evitare danni permanenti. Clicca sul chatbot per approfondire il trattamento consigliato.`;
		}
		if (p.status === "Attenzione") {
			return `Attenzione per '${p.name}'. Ci sono sintomi di carenza o possibili attacchi fungini (occhio di pavone). Consigliata ispezione fogliare ravvicinata e un eventuale trattamento preventivo rameico leggero.`;
		}
		return `L'albero '${p.name}' è in salute ottimale. Continua con il normale monitoraggio e le attività ordinarie previste dal calendario.`;
	}
}
