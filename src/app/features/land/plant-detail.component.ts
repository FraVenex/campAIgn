import { Component, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { PlantsService, Plant } from "../../core/services/plants.service";
import { CalendarService, CalendarEvent } from "../../core/services/calendar.service";
import { LandService } from "../../core/services/land.service";
import { SupabaseService } from "../../core/services/supabase.service";
import { AuthService } from "../../core/services/auth.service";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";
import { CampDatePickerComponent } from "../../shared/components/camp-date-picker/camp-date-picker.component";
import { NgApexchartsModule } from "ng-apexcharts";

export interface PlantPhoto {
	id: string;
	plant_id: string;
	user_id: string;
	storage_path: string;
	public_url: string;
	caption?: string | null;
	created_at: string;
}

@Component({
	selector: "app-plant-detail",
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		AppLayoutComponent,
		CampCardComponent,
		CampDialogComponent,
		CampDatePickerComponent,
		NgApexchartsModule
	],
	template: `
		<app-layout>
			<div class="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">

				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
							<a routerLink="/dashboard" class="hover:text-camp-sage transition-colors">Dashboard</a>
							<span>/</span>
							<a routerLink="/land" class="hover:text-camp-sage transition-colors">Il Mio Terreno</a>
							<span>/</span>
							<span class="text-camp-sage">Dettaglio Pianta</span>
						</nav>

						@if (isLoading()) {
							<div class="h-10 w-64 bg-camp-sand/20 animate-pulse rounded-camp mt-1"></div>
						} @else if (plant()) {
							<div class="flex items-center gap-3 mt-1">
								<h1 class="text-3xl font-serif text-camp-earth tracking-tight">{{ plant()!.name }}</h1>
								<span
									class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
									[class]="statusBadgeClass()"
								>
									{{ plant()!.status || 'Non Valutato' }}
								</span>
							</div>
							<p class="text-sm text-camp-olive mt-0.5">{{ plant()!.species }}</p>
						}
					</div>

					@if (!isLoading() && plant()) {
						<button
							id="btn-programma-manutenzione"
							(click)="openMaintenanceDialog()"
							class="px-5 py-3 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 self-start md:self-auto"
						>
							<span>🔧</span>
							<span>Programma Manutenzione</span>
						</button>
					}
				</div>

				@if (isLoading()) {
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div class="h-48 bg-camp-sand/10 animate-pulse rounded-camp-lg"></div>
						<div class="h-48 bg-camp-sand/10 animate-pulse rounded-camp-lg"></div>
						<div class="h-64 bg-camp-sand/10 animate-pulse rounded-camp-lg lg:col-span-2"></div>
					</div>
				} @else if (error()) {
					<app-camp-card title="Errore" subtitle="Caricamento" icon="⚠️">
						<div class="text-center py-8">
							<p class="text-camp-olive mb-6">{{ error() }}</p>
							<a routerLink="/land" class="camp-btn-primary max-w-xs mx-auto">Torna al Terreno</a>
						</div>
					</app-camp-card>
				} @else if (plant()) {

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

						<app-camp-card subtitle="Anagrafica" title="Scheda Pianta" icon="🌳" [fullHeight]="true">
							<div class="space-y-0">
								<div class="flex items-center gap-4 pb-5 mb-5 border-b border-camp-sand/30">
									<div
										class="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner border shrink-0"
										[class]="statusIconClass()"
									>
										🌳
									</div>
									<div>
										<p class="text-xl font-serif text-camp-earth font-bold">{{ plant()!.name }}</p>
										<p class="text-sm text-camp-olive mt-0.5">{{ plant()!.species }}</p>
									</div>
								</div>

								<div class="space-y-3 text-sm">
									<div class="flex justify-between items-center py-2.5 border-b border-camp-sand/20">
										<span class="text-camp-olive text-xs font-semibold uppercase tracking-wider">Identificativo</span>
										<span class="font-mono text-camp-earth text-xs">{{ plant()!.id ? plant()!.id!.slice(0, 8).toUpperCase() : '—' }}</span>
									</div>

									<div class="flex justify-between items-center py-2.5 border-b border-camp-sand/20">
										<span class="text-camp-olive text-xs font-semibold uppercase tracking-wider">Specie</span>
										<span class="font-medium text-camp-earth">{{ plant()!.species || '—' }}</span>
									</div>

									<div class="flex justify-between items-center py-2.5 border-b border-camp-sand/20">
										<span class="text-camp-olive text-xs font-semibold uppercase tracking-wider">Posizione (X, Y)</span>
										<span class="font-mono text-camp-earth text-xs">{{ plant()!.position_x }}% · {{ plant()!.position_y }}%</span>
									</div>

									@if (plant()!.created_at) {
										<div class="flex justify-between items-center py-2.5 border-b border-camp-sand/20">
											<span class="text-camp-olive text-xs font-semibold uppercase tracking-wider">Data Inserimento</span>
											<span class="text-camp-earth text-sm">{{ formatDate(plant()!.created_at!) }}</span>
										</div>
									}

									@if (farmName()) {
										<div class="flex justify-between items-center py-2.5">
											<span class="text-camp-olive text-xs font-semibold uppercase tracking-wider">Terreno</span>
											<span class="text-camp-earth font-medium text-sm">{{ farmName() }}</span>
										</div>
									}
								</div>
							</div>
						</app-camp-card>

						<app-camp-card subtitle="Diagnostica" title="Stato di Salute" icon="🩺" [fullHeight]="true">
							<div class="space-y-5">
								<div class="flex items-center justify-between p-4 rounded-camp border" [class]="statusPanelClass()">
									<div>
										<p class="text-[10px] uppercase tracking-widest font-bold opacity-70">Stato Attuale</p>
										<p class="text-lg font-serif font-bold mt-1">{{ plant()!.status || 'Non Valutato' }}</p>
									</div>
									<span class="text-3xl">{{ statusEmoji() }}</span>
								</div>

								@if (plant()!.last_treatment_at || plant()!.last_treatment_type) {
									<div class="space-y-3 border-t border-camp-sand/20 pt-4">
										<p class="text-[10px] uppercase tracking-widest font-bold text-camp-olive/70">Ultimo Intervento</p>

										@if (plant()!.last_treatment_type) {
											<div class="flex items-center justify-between text-sm">
												<span class="text-camp-olive">Tipo</span>
												<span class="font-semibold text-camp-earth">{{ plant()!.last_treatment_type }}</span>
											</div>
										}
										@if (plant()!.last_treatment_at) {
											<div class="flex items-center justify-between text-sm">
												<span class="text-camp-olive">Data</span>
												<span class="font-semibold text-camp-earth">{{ formatDate(plant()!.last_treatment_at!) }}</span>
											</div>
										}
									</div>
								} @else {
									<div class="border-t border-camp-sand/20 pt-4">
										<p class="text-[10px] uppercase tracking-widest font-bold text-camp-olive/70 mb-2">Ultimo Intervento</p>
										<p class="text-sm text-camp-olive/60 italic">Nessun intervento registrato</p>
									</div>
								}

								@if (lastEvent()) {
									<div class="border-t border-camp-sand/20 pt-4">
										<p class="text-[10px] uppercase tracking-widest font-bold text-camp-olive/70 mb-2">Ultima Attività nel Calendario</p>
										<div class="flex items-start gap-3 bg-camp-cream/40 rounded-camp p-3 border border-camp-sand/20">
											<span class="text-lg mt-0.5">{{ eventTypeIcon(lastEvent()!.type) }}</span>
											<div>
												<p class="text-sm font-semibold text-camp-earth">{{ lastEvent()!.title }}</p>
												<p class="text-xs text-camp-olive mt-0.5">{{ formatDate(lastEvent()!.start) }}</p>
											</div>
										</div>
									</div>
								} @else {
									<div class="border-t border-camp-sand/20 pt-4">
										<p class="text-[10px] uppercase tracking-widest font-bold text-camp-olive/70 mb-2">Attività nel Calendario</p>
										<p class="text-sm text-camp-olive/60 italic">Nessuna attività registrata per questa pianta</p>
									</div>
								}

								<div class="border-t border-camp-sand/20 pt-4 bg-camp-cream/20 rounded-camp p-4">
									<div class="flex items-center gap-2 mb-2">
										<span>👨‍🌾</span>
										<p class="text-[10px] font-bold uppercase tracking-widest text-camp-sage">Arnaldo suggerisce</p>
									</div>
									<p class="text-sm text-camp-olive leading-relaxed">{{ arnaldoRecommendation() }}</p>
								</div>
							</div>
						</app-camp-card>
					</div>

					<app-camp-card subtitle="Storico Attività" title="Andamento nel Tempo" icon="📊" [fullHeight]="false">
						@if (isLoadingEvents()) {
							<div class="h-48 bg-camp-sand/10 animate-pulse rounded-camp"></div>
						} @else if (plantEvents().length === 0) {
							<div class="flex flex-col items-center justify-center py-14 text-center">
								<span class="text-5xl mb-4 opacity-30">📊</span>
								<p class="text-camp-olive font-medium">Nessuna attività registrata per questa pianta.</p>
								<p class="text-sm text-camp-olive/60 mt-1">Le attività pianificate compariranno qui nel grafico.</p>
							</div>
						} @else {
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<p class="text-xs font-bold uppercase tracking-widest text-camp-olive/70 mb-3">Attività per Mese</p>
									<apx-chart
										[series]="barSeries"
										[chart]="barChart"
										[xaxis]="barXaxis"
										[colors]="barColors"
										[plotOptions]="barPlotOptions"
										[dataLabels]="barDataLabels"
										[grid]="barGrid"
										[tooltip]="barTooltip"
									></apx-chart>
								</div>
								<div>
									<p class="text-xs font-bold uppercase tracking-widest text-camp-olive/70 mb-3">Distribuzione per Tipo</p>
									<apx-chart
										[series]="donutSeries"
										[chart]="donutChart"
										[labels]="donutLabels"
										[colors]="donutColors"
										[legend]="donutLegend"
										[dataLabels]="donutDataLabels"
										[tooltip]="donutTooltip"
									></apx-chart>
								</div>
							</div>
						}
					</app-camp-card>

					<app-camp-card subtitle="Galleria" title="Foto della Pianta" icon="📸" [fullHeight]="false">
						<div class="space-y-6">
							<div
								id="upload-drop-zone"
								class="border-2 border-dashed rounded-camp-lg p-8 text-center transition-all cursor-pointer"
								[ngClass]="{
									'border-camp-sage bg-camp-sage/10': isDragging(),
									'border-camp-sand/50': !isDragging()
								}"
								(click)="photoInput.click()"
								(dragover)="$event.preventDefault(); isDragging.set(true)"
								(dragleave)="isDragging.set(false)"
								(drop)="onFileDrop($event)"
							>
								<input
									#photoInput
									type="file"
									accept="image/*"
									multiple
									class="hidden"
									(change)="onFileSelected($event)"
								/>
								@if (isUploading()) {
									<div class="flex flex-col items-center gap-3">
										<div class="w-10 h-10 border-4 border-camp-sage border-t-transparent rounded-full animate-spin"></div>
										<p class="text-sm text-camp-olive font-medium">Caricamento in corso...</p>
									</div>
								} @else {
									<div class="flex flex-col items-center gap-3">
										<span class="text-4xl opacity-40">📷</span>
										<div>
											<p class="text-sm font-semibold text-camp-earth">Carica foto della pianta</p>
											<p class="text-xs text-camp-olive/60 mt-1">Clicca o trascina qui le immagini (JPG, PNG, WebP)</p>
										</div>
									</div>
								}
							</div>

							@if (uploadError()) {
								<div class="camp-alert-error">
									<span>⚠️</span>
									<div>
										<p class="font-semibold">Errore nel caricamento</p>
										<p class="text-xs mt-0.5">{{ uploadError() }}</p>
									</div>
									<button (click)="uploadError.set(null)" class="ml-auto text-camp-error/70 hover:text-camp-error text-lg leading-none">&times;</button>
								</div>
							}

							@if (uploadSuccess()) {
								<div class="camp-alert-success">
									<span>✅</span>
									<p class="font-semibold">Foto caricata con successo!</p>
								</div>
							}

							@if (isLoadingPhotos()) {
								<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									@for (i of [1,2,3,4]; track i) {
										<div class="aspect-square bg-camp-sand/20 animate-pulse rounded-camp"></div>
									}
								</div>
							} @else if (photos().length === 0) {
								<div class="text-center py-8">
									<span class="text-4xl opacity-20">🖼️</span>
									<p class="text-sm text-camp-olive/60 mt-3">Nessuna foto ancora. Carica la prima immagine!</p>
								</div>
							} @else {
								<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									@for (photo of photos(); track photo.id) {
										<div class="relative group aspect-square rounded-camp overflow-hidden border border-camp-sand/30 shadow-camp-sm">
											<img
												[src]="photo.public_url"
												[alt]="photo.caption || 'Foto pianta'"
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div class="absolute inset-0 bg-camp-earth/0 group-hover:bg-camp-earth/20 transition-all duration-300 flex items-end justify-start p-2">
												<button
													(click)="deletePhoto(photo)"
													class="opacity-0 group-hover:opacity-100 transition-opacity bg-camp-error text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md"
												>
													🗑
												</button>
											</div>
										</div>
									}
								</div>
							}
						</div>
					</app-camp-card>

					<app-camp-card subtitle="Pianificazione" title="Attività Collegate" icon="📅" [fullHeight]="false">
						<div class="space-y-4">
							@if (isLoadingEvents()) {
								<div class="h-32 bg-camp-sand/10 animate-pulse rounded-camp"></div>
							} @else if (plantEvents().length === 0) {
								<div class="flex flex-col items-center justify-center py-10 text-center">
									<span class="text-4xl mb-3 opacity-25">📅</span>
									<p class="text-camp-olive font-medium">Nessuna manutenzione ancora pianificata.</p>
									<p class="text-sm text-camp-olive/60 mt-1 mb-5">Usa il pulsante qui sopra per programmare il primo intervento.</p>
									<button
										(click)="openMaintenanceDialog()"
										class="px-5 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
									>
										<span>➕</span>
										<span>Programma ora</span>
									</button>
								</div>
							} @else {
								<div class="space-y-3">
									@for (event of plantEvents(); track event.id) {
										<div class="flex items-start gap-4 p-4 rounded-camp bg-white border border-camp-sand/30 shadow-camp-sm hover:shadow-camp transition-shadow">
											<div class="w-10 h-10 rounded-camp flex items-center justify-center text-xl shrink-0" [class]="eventBgClass(event.type)">
												{{ eventTypeIcon(event.type) }}
											</div>
											<div class="flex-1 min-w-0">
												<p class="font-semibold text-camp-earth text-sm">{{ event.title }}</p>
												<p class="text-xs text-camp-olive mt-0.5">{{ formatDate(event.start) }}</p>
												@if (event.description) {
													<p class="text-xs text-camp-olive/70 mt-1 event-desc">{{ event.description }}</p>
												}
											</div>
											<span
												class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
												[class]="eventStatusClass(event.status)"
											>
												{{ event.status }}
											</span>
										</div>
									}
								</div>
							}
						</div>
					</app-camp-card>

				}
			</div>
		</app-layout>

		@if (showMaintenanceDialog()) {
			<app-camp-dialog
				title="Programma Manutenzione"
				subtitle="Scheda Pianta"
				icon="🔧"
				(close)="showMaintenanceDialog.set(false)"
			>
				<div class="p-8 space-y-6">
					<div class="space-y-1.5">
						<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Titolo attività</label>
						<input
							type="text"
							[(ngModel)]="maintenanceTitle"
							placeholder="Es. Potatura annuale"
							class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner"
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div class="space-y-1.5">
							<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Tipo</label>
							<div class="relative">
								<button
									type="button"
									(click)="maintenanceTypeOpen.set(!maintenanceTypeOpen())"
									class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth text-left flex items-center justify-between shadow-sm cursor-pointer focus:border-camp-sage focus:outline-none"
								>
									<span>{{ maintenanceTypeLabel() }}</span>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								@if (maintenanceTypeOpen()) {
									<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-camp-sand/40 rounded-xl shadow-camp-lg py-1 animate-scale-in">
										@for (opt of maintenanceTypeOptions; track opt.value) {
											<button
												type="button"
												(click)="maintenanceType.set(opt.value); maintenanceTypeOpen.set(false)"
												class="w-full text-left px-4 py-2 text-xs text-camp-earth hover:bg-camp-cream/45 transition-colors flex items-center gap-2 cursor-pointer"
											>
												<span>{{ opt.icon }}</span>
												<span>{{ opt.label }}</span>
												@if (maintenanceType() === opt.value) { <span class="ml-auto text-camp-sage">✓</span> }
											</button>
										}
									</div>
								}
							</div>
						</div>

						<div class="space-y-1.5">
							<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Data</label>
							<div class="relative">
								<button
									type="button"
									(click)="maintenanceDateOpen.set(!maintenanceDateOpen())"
									class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth text-left flex items-center justify-between shadow-sm cursor-pointer focus:border-camp-sage focus:outline-none"
								>
									<span>{{ maintenanceDateLabel() }}</span>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</button>
								@if (maintenanceDateOpen()) {
									<div class="absolute z-50 left-0 mt-1">
										<app-camp-date-picker
											[selectedDate]="maintenanceDate()"
											[disablePast]="true"
											(dateSelected)="maintenanceDate.set($event); maintenanceDateOpen.set(false)"
										/>
									</div>
								}
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Note (opzionale)</label>
						<textarea
							[(ngModel)]="maintenanceNotes"
							rows="3"
							placeholder="Aggiungi dettagli sull'intervento..."
							class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner resize-none"
						></textarea>
					</div>

					@if (maintenanceError()) {
						<div class="camp-alert-error">
							<span>⚠️</span>
							<p>{{ maintenanceError() }}</p>
						</div>
					}
				</div>

				<div footer class="px-8 py-5 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-4">
					<button
						(click)="showMaintenanceDialog.set(false)"
						class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-sm font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40 transition-colors"
					>
						Annulla
					</button>
					<button
						id="btn-salva-manutenzione"
						(click)="saveMaintenance()"
						[disabled]="isSavingMaintenance()"
						class="px-5 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-2"
					>
						@if (isSavingMaintenance()) {
							<span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
							<span>Salvo...</span>
						} @else {
							<span>Salva</span>
						}
					</button>
				</div>
			</app-camp-dialog>
		}
	`,
	styles: [`
		:host { display: block; }
		.event-desc {
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	`]
})
export class PlantDetailComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private plantsService = inject(PlantsService);
	private calendarService = inject(CalendarService);
	private landService = inject(LandService);
	private supabaseService = inject(SupabaseService);
	private authService = inject(AuthService);

	plant = signal<Plant | null>(null);
	isLoading = signal(true);
	error = signal<string | null>(null);

	plantEvents = signal<CalendarEvent[]>([]);
	isLoadingEvents = signal(true);
	lastEvent = signal<CalendarEvent | null>(null);

	photos = signal<PlantPhoto[]>([]);
	isLoadingPhotos = signal(true);
	isUploading = signal(false);
	isDragging = signal(false);
	uploadError = signal<string | null>(null);
	uploadSuccess = signal(false);

	farmName = signal<string | null>(null);

	showMaintenanceDialog = signal(false);
	maintenanceTitle = "";
	maintenanceNotes = "";
	maintenanceType = signal<"maintenance" | "harvest" | "irrigation" | "other">("maintenance");
	maintenanceDate = signal<string>("");
	maintenanceTypeOpen = signal(false);
	maintenanceDateOpen = signal(false);
	isSavingMaintenance = signal(false);
	maintenanceError = signal<string | null>(null);

	readonly maintenanceTypeOptions: { value: "maintenance" | "harvest" | "irrigation" | "other"; label: string; icon: string }[] = [
		{ value: "maintenance", label: "Manutenzione", icon: "🔧" },
		{ value: "irrigation", label: "Irrigazione", icon: "💧" },
		{ value: "harvest", label: "Raccolta", icon: "🌿" },
		{ value: "other", label: "Altra Attività", icon: "📅" }
	];

	readonly barColors: string[] = ["#6B705C"];
	readonly barChart = { type: "bar" as const, height: 200, toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif", background: "transparent" };
	readonly barPlotOptions = { bar: { borderRadius: 6, columnWidth: "55%" } };
	readonly barDataLabels = { enabled: false };
	readonly barGrid = { borderColor: "#E8E4D9", strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } };
	readonly barTooltip = { theme: "light" as const };

	readonly donutChart = { type: "donut" as const, height: 200, toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif" };
	readonly donutLegend = { position: "bottom" as const, fontSize: "11px", fontWeight: 600, labels: { colors: "#A5A58D" } };
	readonly donutDataLabels = { enabled: false };
	readonly donutTooltip = { theme: "light" as const };

	barSeries: { name: string; data: number[] }[] = [{ name: "Attività", data: [0, 0, 0, 0, 0, 0] }];
	barXaxis: { categories: string[]; labels: { style: { colors: string; fontSize: string; fontWeight: number } }; axisBorder: { show: boolean }; axisTicks: { show: boolean } } = {
		categories: ["", "", "", "", "", ""],
		labels: { style: { colors: "#A5A58D", fontSize: "11px", fontWeight: 600 } },
		axisBorder: { show: false },
		axisTicks: { show: false }
	};

	donutSeries: number[] = [1];
	donutLabels: string[] = ["Nessuna Attività"];
	donutColors: string[] = ["#E8E4D9"];

	private plantId: string | null = null;

	maintenanceTypeLabel = computed(() => {
		const opt = this.maintenanceTypeOptions.find(o => o.value === this.maintenanceType());
		return opt ? `${opt.icon} ${opt.label}` : "Manutenzione";
	});

	maintenanceDateLabel = computed(() => {
		const d = this.maintenanceDate();
		if (!d) return "Seleziona data";
		return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
	});

	statusBadgeClass = computed(() => {
		const s = this.plant()?.status;
		if (s === "Ottimo") return "bg-camp-success-light text-camp-success border-camp-success/15";
		if (s === "Attenzione") return "bg-camp-amber-light/30 text-camp-amber border-camp-amber/15";
		if (s === "Stressato") return "bg-camp-error-light text-camp-error border-camp-error/15";
		return "bg-camp-sand/30 text-camp-olive border-camp-sand/30";
	});

	statusIconClass = computed(() => {
		const s = this.plant()?.status;
		if (s === "Ottimo") return "bg-camp-success-light border-camp-success/20 text-camp-success";
		if (s === "Attenzione") return "bg-camp-amber-light/20 border-camp-amber/20 text-camp-amber";
		if (s === "Stressato") return "bg-camp-error-light border-camp-error/20 text-camp-error";
		return "bg-camp-sand/20 border-camp-sand/40 text-camp-olive";
	});

	statusPanelClass = computed(() => {
		const s = this.plant()?.status;
		if (s === "Ottimo") return "bg-camp-success-light border-camp-success/20 text-camp-success";
		if (s === "Attenzione") return "bg-camp-amber-light/20 border-camp-amber/30 text-camp-amber";
		if (s === "Stressato") return "bg-camp-error-light border-camp-error/20 text-camp-error";
		return "bg-camp-sand/20 border-camp-sand/40 text-camp-olive";
	});

	statusEmoji = computed(() => {
		const s = this.plant()?.status;
		if (s === "Ottimo") return "💚";
		if (s === "Attenzione") return "⚠️";
		if (s === "Stressato") return "🆘";
		return "❓";
	});

	arnaldoRecommendation = computed(() => {
		const p = this.plant();
		if (!p) return "";
		if (p.status === "Stressato") {
			return `'${p.name}' mostra segni di stress biologico. Valuta un intervento idrico o nutrizionale urgente. Controlla le radici e le foglie per sintomi di parassiti o carenze.`;
		}
		if (p.status === "Attenzione") {
			return `'${p.name}' necessita di monitoraggio ravvicinato. Ispeziona visivamente foglie e corteccia. Un trattamento preventivo rameico potrebbe essere indicato.`;
		}
		return `'${p.name}' è in piena salute. Continua con le attività ordinarie di monitoraggio e concimazione stagionale.`;
	});

	async ngOnInit() {
		this.plantId = this.route.snapshot.paramMap.get("id");
		if (!this.plantId) {
			this.error.set("Identificativo pianta mancante.");
			this.isLoading.set(false);
			return;
		}

		await this.loadPlant();
		await Promise.all([this.loadEvents(), this.loadPhotos()]);
	}

	private async loadPlant() {
		try {
			const data = await this.plantsService.getPlantById(this.plantId!);
			this.plant.set(data);

			try {
				const farms = await this.landService.getFarms();
				const farm = farms.find(f => f.id === data.farm_id);
				if (farm) this.farmName.set(farm.name);
			} catch {
				// Fallback silenzioso per nome terreno
			}
		} catch {
			this.error.set("Impossibile caricare i dati della pianta dal database.");
		} finally {
			this.isLoading.set(false);
		}
	}

	private async loadEvents() {
		this.isLoadingEvents.set(true);
		try {
			const events = await this.calendarService.getEventsForPlant(this.plantId!);
			this.plantEvents.set(events);
			this.buildCharts(events);

			const last = await this.calendarService.getLastEventForPlant(this.plantId!);
			this.lastEvent.set(last);
		} catch {
			this.plantEvents.set([]);
		} finally {
			this.isLoadingEvents.set(false);
		}
	}

	private buildCharts(events: CalendarEvent[]) {
		const monthMap: Record<string, number> = {};
		const monthLabelMap: Record<string, string> = {};

		for (let i = 5; i >= 0; i--) {
			const d = new Date();
			d.setMonth(d.getMonth() - i);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			monthMap[key] = 0;
			monthLabelMap[key] = d.toLocaleDateString("it-IT", { month: "short" });
		}

		events.forEach(e => {
			const d = new Date(e.start);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			if (key in monthMap) monthMap[key]++;
		});

		this.barSeries = [{ name: "Attività", data: Object.values(monthMap) }];
		this.barXaxis = {
			categories: Object.values(monthLabelMap),
			labels: { style: { colors: "#A5A58D", fontSize: "11px", fontWeight: 600 } },
			axisBorder: { show: false },
			axisTicks: { show: false }
		};

		const typeCounts = { maintenance: 0, irrigation: 0, harvest: 0, other: 0 };
		events.forEach(e => {
			if (e.type in typeCounts) (typeCounts as Record<string, number>)[e.type]++;
			else typeCounts.other++;
		});

		const allLabels = ["Manutenzione", "Irrigazione", "Raccolta", "Altro"];
		const allValues = [typeCounts.maintenance, typeCounts.irrigation, typeCounts.harvest, typeCounts.other];
		const filtered = allValues.map((v, i) => ({ v, l: allLabels[i] })).filter(x => x.v > 0);

		if (filtered.length > 0) {
			this.donutSeries = filtered.map(x => x.v);
			this.donutLabels = filtered.map(x => x.l);
			this.donutColors = ["#6B705C", "#A5A58D", "#C9A96E", "#B07D62"].slice(0, filtered.length);
		} else {
			this.donutSeries = [1];
			this.donutLabels = ["Nessuna Attività"];
			this.donutColors = ["#E8E4D9"];
		}
	}

	private async loadPhotos() {
		this.isLoadingPhotos.set(true);
		try {
			const { data, error } = await this.supabaseService.client
				.from("plant_photos")
				.select("*")
				.eq("plant_id", this.plantId!)
				.order("created_at", { ascending: false });

			if (error) throw error;
			this.photos.set((data || []) as PlantPhoto[]);
		} catch {
			this.photos.set([]);
		} finally {
			this.isLoadingPhotos.set(false);
		}
	}

	onFileSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			this.uploadFiles(Array.from(input.files));
			input.value = "";
		}
	}

	onFileDrop(event: DragEvent) {
		event.preventDefault();
		this.isDragging.set(false);
		const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
		if (files.length) this.uploadFiles(files);
	}

	private async uploadFiles(files: File[]) {
		this.isUploading.set(true);
		this.uploadError.set(null);
		this.uploadSuccess.set(false);

		const user = this.authService.currentUser();
		if (!user) {
			this.uploadError.set("Utente non autenticato.");
			this.isUploading.set(false);
			return;
		}

		const uploadedPhotos: PlantPhoto[] = [];

		for (const file of files) {
			try {
				const ext = file.name.split(".").pop() || "jpg";
				const fileName = `${user.id}/${this.plantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

				const { error: storageError } = await this.supabaseService.client.storage
					.from("plant-photos")
					.upload(fileName, file, { contentType: file.type, upsert: false });

				if (storageError) throw storageError;

				const { data: urlData } = this.supabaseService.client.storage
					.from("plant-photos")
					.getPublicUrl(fileName);

				const { data: dbData, error: dbError } = await this.supabaseService.client
					.from("plant_photos")
					.insert([{
						plant_id: this.plantId,
						user_id: user.id,
						storage_path: fileName,
						public_url: urlData.publicUrl
					}])
					.select()
					.single();

				if (dbError) throw dbError;

				uploadedPhotos.push(dbData as PlantPhoto);
			} catch (err: any) {
				this.uploadError.set(err.message || "Errore durante il caricamento del file.");
			}
		}

		if (uploadedPhotos.length) {
			this.photos.update(prev => [...uploadedPhotos, ...prev]);
			this.uploadSuccess.set(true);
			setTimeout(() => this.uploadSuccess.set(false), 3000);
		}

		this.isUploading.set(false);
	}

	async deletePhoto(photo: PlantPhoto) {
		try {
			await this.supabaseService.client.storage.from("plant-photos").remove([photo.storage_path]);
			await this.supabaseService.client.from("plant_photos").delete().eq("id", photo.id);
			this.photos.update(prev => prev.filter(p => p.id !== photo.id));
		} catch (err: any) {
			this.uploadError.set("Impossibile eliminare la foto: " + (err.message || ""));
		}
	}

	openMaintenanceDialog() {
		this.maintenanceTitle = "";
		this.maintenanceNotes = "";
		this.maintenanceType.set("maintenance");
		this.maintenanceDate.set("");
		this.maintenanceError.set(null);
		this.showMaintenanceDialog.set(true);
	}

	async saveMaintenance() {
		if (!this.maintenanceTitle.trim()) {
			this.maintenanceError.set("Inserisci un titolo per l'attività.");
			return;
		}
		if (!this.maintenanceDate()) {
			this.maintenanceError.set("Seleziona una data per l'attività.");
			return;
		}

		const p = this.plant();
		if (!p) return;

		this.isSavingMaintenance.set(true);
		this.maintenanceError.set(null);

		try {
			const startDate = new Date(this.maintenanceDate());
			startDate.setHours(9, 0, 0, 0);
			const endDate = new Date(startDate);
			endDate.setHours(11, 0, 0, 0);

			await this.calendarService.createEvent({
				farm_id: p.farm_id,
				title: this.maintenanceTitle.trim(),
				description: this.maintenanceNotes.trim() || null,
				type: this.maintenanceType(),
				start: startDate.toISOString(),
				end: endDate.toISOString(),
				all_day: false,
				source: "user",
				status: "confirmed",
				plant_ids: [p.id!]
			});

			this.showMaintenanceDialog.set(false);
			await this.loadEvents();
		} catch (err: any) {
			this.maintenanceError.set(err.message || "Errore durante il salvataggio dell'attività.");
		} finally {
			this.isSavingMaintenance.set(false);
		}
	}

	eventTypeIcon(type: string): string {
		if (type === "maintenance") return "🔧";
		if (type === "harvest") return "🌿";
		if (type === "irrigation") return "💧";
		return "📅";
	}

	eventBgClass(type: string): string {
		if (type === "maintenance") return "bg-camp-terracotta/10 text-camp-terracotta";
		if (type === "harvest") return "bg-camp-success/10 text-camp-success";
		if (type === "irrigation") return "bg-blue-50 text-blue-500";
		return "bg-camp-sand/30 text-camp-olive";
	}

	eventStatusClass(status: string): string {
		if (status === "confirmed") return "bg-camp-success-light text-camp-success border-camp-success/20";
		if (status === "suggested") return "bg-camp-amber-light/30 text-camp-amber border-camp-amber/20";
		return "bg-camp-sand/30 text-camp-olive border-camp-sand/40";
	}

	formatDate(dateStr: string): string {
		if (!dateStr) return "—";
		try {
			return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
		} catch {
			return dateStr;
		}
	}
}
