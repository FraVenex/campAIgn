import { Component, inject, signal, computed, OnInit, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { LandService, Farm } from "../../core/services/land.service";
import { PlantsService, Plant } from "../../core/services/plants.service";
import { CalendarService, CalendarEvent } from "../../core/services/calendar.service";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";
import { CampDatePickerComponent } from "../../shared/components/camp-date-picker/camp-date-picker.component";
import { CampTimePickerComponent } from "../../shared/components/camp-time-picker/camp-time-picker.component";

@Component({
	selector: "app-land",
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, AppLayoutComponent, CampCardComponent, CampDialogComponent, CampDatePickerComponent, CampTimePickerComponent],
	template: `
		<app-layout>
			<div class="max-w-7xl mx-auto space-y-6 animate-fade-in relative pb-10">
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
							<a
								routerLink="/dashboard"
								class="hover:text-camp-sage transition-colors"
								>Dashboard</a
							>
							<span>/</span>
							<span class="text-camp-sage">Il Mio Terreno</span>
						</nav>
						<h1 class="text-4xl font-serif text-camp-earth tracking-tight">Mappa del Terreno</h1>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<div class="flex items-center gap-4 px-5 py-3 bg-white rounded-camp shadow-camp-sm border border-camp-sand/40">
							<div class="w-10 h-10 rounded-camp bg-camp-sage/10 flex items-center justify-center text-camp-sage shadow-inner">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-[10px] uppercase tracking-wider text-camp-olive font-bold opacity-60">Terreno Attivo</p>
								<p class="text-base font-serif text-camp-earth">{{ selectedFarm()?.name || "Seleziona terreno" }}</p>
							</div>
						</div>
					</div>
				</div>

				@if (isLoading()) {
					<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
						<div class="lg:col-span-8 h-96 bg-camp-sand/10 animate-pulse rounded-camp"></div>
						<div class="lg:col-span-4 h-96 bg-camp-sand/10 animate-pulse rounded-camp"></div>
					</div>
				} @else if (farms().length === 0) {
					<app-camp-card
						title="Nessun Terreno Trovato"
						subtitle="Attenzione"
						icon="🗺️"
					>
						<div class="text-center py-8">
							<p class="text-camp-olive mb-6">Non hai ancora registrato un terreno. Completa l'onboarding per iniziare a mappare le tue piante.</p>
							<a
								routerLink="/onboarding"
								class="camp-btn-primary max-w-xs mx-auto"
								>Inizia Onboarding</a
							>
						</div>
					</app-camp-card>
				} @else {
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="bg-white rounded-camp p-5 shadow-camp-sm border border-camp-sand/40 flex items-center gap-4">
							<div class="w-12 h-12 rounded-camp bg-camp-sage/10 text-camp-sage flex items-center justify-center text-2xl shadow-inner">🌳</div>
							<div>
								<p class="text-[10px] uppercase font-bold tracking-widest text-camp-olive opacity-60">Totale Piante</p>
								<h4 class="text-2xl font-serif text-camp-earth font-bold mt-0.5">{{ plantsCount() }}</h4>
							</div>
						</div>

						<div class="bg-white rounded-camp p-5 shadow-camp-sm border border-camp-sand/40 flex items-center gap-4">
							<div class="w-12 h-12 rounded-camp bg-camp-amber/10 text-camp-amber flex items-center justify-center text-2xl shadow-inner">🌿</div>
							<div>
								<p class="text-[10px] uppercase font-bold tracking-widest text-camp-olive opacity-60">Coltura Principale</p>
								<h4 class="text-2xl font-serif text-camp-earth font-bold mt-0.5">{{ selectedFarm()?.main_crop }}</h4>
							</div>
						</div>

						<div class="bg-white rounded-camp p-5 shadow-camp-sm border border-camp-sand/40 flex items-center gap-4">
							<div class="w-12 h-12 rounded-camp bg-camp-success/10 text-camp-success flex items-center justify-center text-2xl shadow-inner">❤️</div>
							<div>
								<p class="text-[10px] uppercase font-bold tracking-widest text-camp-olive opacity-60">Stato Ottimo</p>
								<h4 class="text-2xl font-serif text-camp-earth font-bold mt-0.5">{{ healthyPercentage() }}%</h4>
							</div>
						</div>
					</div>

					@if (plants().length === 0) {
						<div class="bg-white rounded-camp-lg border border-camp-sand/60 shadow-camp p-12 text-center max-w-2xl mx-auto my-8">
							<div class="w-20 h-20 bg-camp-sage/10 text-camp-sage rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">🌳</div>
							<h3 class="text-2xl font-serif text-camp-earth mb-3">Non hai ancora inserito piante in questo terreno</h3>
							<p class="text-camp-olive text-sm max-w-md mx-auto mb-8 leading-relaxed">Mappa il tuo terreno posizionando le piante per monitorarne lo stato di salute e programmare i trattamenti.</p>
							<button
								(click)="openAddModal()"
								class="px-6 py-3 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-md active:scale-95"
							>
								<span>Aggiungi Piante</span>
							</button>
						</div>
					} @else {
						<div class="bg-white rounded-camp-lg border border-camp-sand/60 shadow-camp p-6">
							<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
								<div>
									<h3 class="text-xl font-serif text-camp-earth">Mappa Interattiva</h3>
									<p class="text-xs text-camp-olive mt-0.5">Clicca su una pianta per visualizzarne la scheda completa o filtrale per stato.</p>
								</div>

								<div class="flex flex-wrap items-center gap-2">
									@for (s of ["Tutti", "Ottimo", "Attenzione", "Stressato"]; track s) {
										<button
											(click)="setStatusFilter(s)"
											[class]="
												statusFilter() === s
													? 'px-3 py-1.5 bg-camp-sage text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all'
													: 'px-3 py-1.5 bg-camp-cream hover:bg-camp-sand/40 text-camp-earth text-xs font-bold uppercase tracking-wider rounded-full border border-camp-sand/30 transition-all'
											"
										>
											{{ s }}
										</button>
									}
								</div>
							</div>

							<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
								<div class="flex items-center gap-3 bg-camp-cream/30 p-2.5 rounded-xl border border-camp-sand/30 w-full sm:w-72 sm:mr-auto">
									<span class="text-camp-olive pl-1">🔍</span>
									<input
										type="text"
										[ngModel]="searchQuery()"
										(ngModelChange)="searchQuery.set($event)"
										placeholder="Cerca pianta per nome o specie..."
										class="w-full bg-transparent text-sm text-camp-earth placeholder-camp-olive/40 focus:outline-none"
									/>
								</div>

								<div class="flex items-center gap-2">
									@if (farms().length > 0) {
										<button
											(click)="toggleEditMode()"
											[class]="
												isEditMode()
													? 'px-4 py-2.5 bg-camp-terracotta hover:bg-camp-bark text-white rounded-camp text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all duration-300'
													: 'px-4 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all duration-300'
											"
										>
											@if (isEditMode()) {
												<span>Termina Modifica</span>
											} @else {
												<span>Modifica Terreno</span>
											}
										</button>

											<button
												(click)="openAddModal()"
												[disabled]="isEditMode()"
												[class]="isEditMode()
													? 'px-4 py-2.5 bg-camp-sand/50 text-camp-olive/40 text-xs font-bold uppercase tracking-wider rounded-camp flex items-center gap-1.5 shadow-sm cursor-not-allowed opacity-50'
													: 'px-4 py-2.5 bg-camp-sage hover:bg-camp-earth text-white text-xs font-bold uppercase tracking-wider rounded-camp flex items-center gap-1.5 shadow-sm transition-all duration-300 cursor-pointer'
												"
											>
												<span>Aggiungi Piante</span>
											</button>
									}
								</div>
							</div>

							@if (isEditMode()) {
								<div class="mb-4 bg-camp-terracotta/10 border border-camp-terracotta/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up">
									<div class="flex items-start gap-3 flex-grow">
										<span class="text-base mt-0.5">⚙️</span>
										<div>
											<p class="text-xs font-bold text-camp-terracotta uppercase tracking-wider">Modalità Modifica Attiva</p>
											<p class="text-xs text-camp-earth/80 mt-1">
												@if (editSubMode() === 'select') { Clicca le piante per selezionarle e applicare azioni di gruppo. }
												@else { Trascina una pianta per spostarla sul terreno. }
											</p>
										</div>
									</div>
									<div class="flex items-center gap-1.5 bg-white/60 border border-camp-sand/40 rounded-xl p-1 self-start sm:self-auto shrink-0">
										<button
											type="button"
											(click)="editSubMode.set('select')"
											[class]="editSubMode() === 'select'
												? 'px-3 py-1.5 bg-camp-terracotta text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm'
												: 'px-3 py-1.5 text-camp-earth/60 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-camp-sand/30 transition-colors'
											"
										>
											<span>☑️</span><span>Seleziona</span>
										</button>
										<button
											type="button"
											(click)="editSubMode.set('move')"
											[class]="editSubMode() === 'move'
												? 'px-3 py-1.5 bg-camp-terracotta text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm'
												: 'px-3 py-1.5 text-camp-earth/60 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-camp-sand/30 transition-colors'
											"
										>
											<span>✋</span><span>Sposta</span>
										</button>
									</div>
								</div>
							}

							<div class="map-container relative w-full aspect-[4/3] bg-gradient-to-br from-[#dfd7bf] to-[#c7beaa] border border-camp-sand/40 rounded-camp overflow-hidden shadow-inner select-none">
								<svg
									class="absolute inset-0 w-full h-full text-camp-earth/10"
									xmlns="http://www.w3.org/2000/svg"
								>
									<defs>
										<pattern
											id="parcels"
											width="100"
											height="100"
											patternUnits="userSpaceOnUse"
										>
											<rect
												width="100"
												height="100"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
											/>
											<line
												x1="0"
												y1="25"
												x2="100"
												y2="25"
												stroke="currentColor"
												stroke-width="0.75"
												stroke-dasharray="3 3"
											/>
											<line
												x1="0"
												y1="50"
												x2="100"
												y2="50"
												stroke="currentColor"
												stroke-width="0.75"
												stroke-dasharray="3 3"
											/>
											<line
												x1="0"
												y1="75"
												x2="100"
												y2="75"
												stroke="currentColor"
												stroke-width="0.75"
												stroke-dasharray="3 3"
											/>
										</pattern>
									</defs>
									<rect
										width="100%"
										height="100%"
										fill="url(#parcels)"
									/>
								</svg>

								@for (t of grassTufts(); track t.x + "-" + t.y) {
									<span
										class="absolute text-[8px] opacity-15 pointer-events-none select-none text-camp-success"
										[style.left.%]="t.x"
										[style.top.%]="t.y"
										>🌿</span
									>
								}

								@for (p of filteredPlants(); track p.id) {
									<div
										class="absolute group hover:z-30"
										[class.z-20]="selectedPlantIds().has(p.id!)"
										[class.z-10]="!selectedPlantIds().has(p.id!)"
										[style.left.%]="p.position_x"
										[style.top.%]="p.position_y"
									>
										@if (!isEditMode()) {
											<a
												[routerLink]="['/land/plant', p.id]"
												[class]="getPlantMarkerClass(p)"
												class="w-9 h-9 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md select-none hover:scale-125 focus:outline-none animate-scale-in"
											>
												<span class="text-base select-none">🌳</span>
											</a>
										} @else {
											<div
												(mousedown)="editSubMode() === 'move' ? onDragStart($event, p) : null"
												(touchstart)="editSubMode() === 'move' ? onDragStart($event, p) : null"
												(click)="editSubMode() === 'select' ? toggleSelection(p, $event) : null"
												[class]="getPlantMarkerClass(p)"
												[class.ring-4]="selectedPlantIds().has(p.id!) && editSubMode() === 'select'"
												[class.ring-camp-sage]="selectedPlantIds().has(p.id!) && editSubMode() === 'select'"
												[class.cursor-move]="editSubMode() === 'move'"
												[class.cursor-pointer]="editSubMode() === 'select'"
												class="w-9 h-9 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 flex items-center justify-center shadow-md select-none hover:scale-125 focus:outline-none animate-scale-in"
											>
												<span class="text-base select-none">🌳</span>
											</div>
										}

										<div [class]="getTooltipClass(p)">
											<div class="font-bold font-serif">{{ p.name }}</div>
											<div class="text-[10px] opacity-70">{{ p.species }}</div>
											<div
												class="text-[9px] uppercase tracking-wider font-bold mt-1"
												[ngClass]="{
													'text-green-300': p.status === 'Ottimo',
													'text-yellow-300': p.status === 'Attenzione',
													'text-red-300': p.status === 'Stressato',
													'text-stone-300': p.status !== 'Ottimo' && p.status !== 'Attenzione' && p.status !== 'Stressato'
												}"
											>
												Stato: {{ p.status }}
											</div>
											@if (p.last_treatment_type) {
												<div class="text-[9px] opacity-60 mt-0.5">Trattamento: {{ p.last_treatment_type }}</div>
											}
											<div [class]="getTooltipArrowClass(p)"></div>
										</div>
									</div>
								}
							</div>
						</div>
					}
				}
			</div>

			@if (isEditMode() && selectedPlantIds().size > 0) {
				<div
					class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[45] bg-camp-earth/95 text-white px-6 py-4 rounded-camp-xl shadow-camp-xl flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 border border-white/10 backdrop-blur animate-scale-in"
				>
					<div class="flex items-center gap-3 pr-2 border-b md:border-b-0 md:border-r border-white/10 pb-3 md:pb-0">
						<span class="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-lg shadow-inner">🌳</span>
						<div class="flex flex-col">
							<span class="text-[10px] uppercase tracking-wider text-white/50 font-bold leading-none">Selezionate</span>
							<span class="text-lg font-serif font-bold text-white mt-1 leading-none">{{ selectedPlantIds().size }}</span>
						</div>
					</div>

					<div class="flex flex-col gap-1.5">
						<span class="text-[9px] uppercase tracking-widest text-white/40 font-bold">Selezione</span>
						<div class="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
							<button
								(click)="selectAll()"
								class="px-3 py-1.5 hover:bg-white/10 hover:text-white text-white/80 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>Tutte</span>
							</button>
							<button
								(click)="clearSelection()"
								class="px-3 py-1.5 hover:bg-white/10 hover:text-white text-white/80 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								<span>Deseleziona</span>
							</button>
						</div>
					</div>

					<div class="flex flex-col gap-1.5 flex-grow">
						<span class="text-[9px] uppercase tracking-widest text-white/40 font-bold">Azioni di Gruppo</span>
						<div class="flex flex-wrap items-center gap-2">
							<button
								(click)="openBulkModal('treatment')"
								class="px-3.5 py-2 bg-camp-sage hover:bg-camp-sage-light text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
							>
								<span>💧</span>
								<span>Trattamento</span>
							</button>
							<button
								(click)="openBulkModal('maintenance')"
								class="px-3.5 py-2 bg-camp-terracotta hover:bg-camp-terracotta/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
							>
								<span>🔧</span>
								<span>Manutenzione</span>
							</button>
							<button
								(click)="openBulkModal('other')"
								class="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
							>
								<span>📅</span>
								<span>Attività</span>
							</button>
							<button
								(click)="openDeleteConfirm()"
								class="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
							>
								<span>🗑️</span>
								<span>Elimina</span>
							</button>
						</div>
					</div>
				</div>
			}

			@if (isAddModalOpen()) {
				<app-camp-dialog
					title="Aggiungi Piante"
					subtitle="Mappa del Terreno"
					icon="🌳"
					(close)="isAddModalOpen.set(false)"
				>
					<div class="border-b border-camp-sand/30 flex">
						<button
							(click)="addTab.set('single')"
							[class]="addTab() === 'single' ? 'flex-1 py-3 text-sm font-bold border-b-2 border-camp-sage text-camp-sage' : 'flex-1 py-3 text-sm text-camp-olive hover:text-camp-earth'"
						>
							Pianta Singola
						</button>
						<button
							(click)="addTab.set('multiple')"
							[class]="addTab() === 'multiple' ? 'flex-1 py-3 text-sm font-bold border-b-2 border-camp-sage text-camp-sage' : 'flex-1 py-3 text-sm text-camp-olive hover:text-camp-earth'"
						>
							Più Piante
						</button>
					</div>

					<div class="p-8 space-y-6">
						@if (addTab() === "single") {
							<div class="space-y-1">
								<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Nome (opzionale)</label>
								<input
									type="text"
									[ngModel]="newName()"
									(ngModelChange)="newName.set($event)"
									placeholder="Es. Olivo Secolare 3"
									class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner"
								/>
							</div>

							<div class="space-y-1">
								<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Specie</label>
								<div class="relative">
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('speciesSingle')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ newSpecies() }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'speciesSingle'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>

									@if (openDropdown() === "speciesSingle") {
										<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-camp-sand/40 rounded-xl shadow-camp-lg py-1 animate-scale-in">
											@for (s of ["Olivo", "Agrume", "Vite", "Altro"]; track s) {
												<button
													type="button"
													(click)="newSpecies.set(s); openDropdown.set(null)"
													class="w-full text-left px-4 py-2 text-xs text-camp-earth hover:bg-camp-cream/45 transition-colors flex items-center justify-between cursor-pointer"
												>
													<span>{{ s }}</span>
													@if (newSpecies() === s) {
														<span class="text-camp-sage">✓</span>
													}
												</button>
											}
										</div>
									}
								</div>
							</div>

							<div class="space-y-1">
								<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Stato Iniziale</label>
								<div class="relative">
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('statusSingle')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ newStatus() }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'statusSingle'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>

									@if (openDropdown() === "statusSingle") {
										<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-camp-sand/40 rounded-xl shadow-camp-lg py-1 animate-scale-in">
											@for (st of ["Ottimo", "Attenzione", "Stressato"]; track st) {
												<button
													type="button"
													(click)="newStatus.set(st); openDropdown.set(null)"
													class="w-full text-left px-4 py-2 text-xs text-camp-earth hover:bg-camp-cream/45 transition-colors flex items-center justify-between cursor-pointer"
												>
													<span>{{ st }}</span>
													@if (newStatus() === st) {
														<span class="text-camp-sage">✓</span>
													}
												</button>
											}
										</div>
									}
								</div>
							</div>
						} @else {
							<div class="space-y-1">
								<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Quantità</label>
								<input
									type="number"
									[ngModel]="newQuantity()"
									(ngModelChange)="newQuantity.set($event)"
									min="2"
									max="20"
									class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner"
								/>
							</div>

							<div class="space-y-1">
								<label class="text-xs uppercase font-bold tracking-widest text-camp-olive">Specie</label>
								<div class="relative">
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('speciesMultiple')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ newMultipleSpecies() }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'speciesMultiple'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>

									@if (openDropdown() === "speciesMultiple") {
										<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-camp-sand/40 rounded-xl shadow-camp-lg py-1 animate-scale-in">
											@for (s of ["Olivo", "Agrume", "Vite", "Altro"]; track s) {
												<button
													type="button"
													(click)="newMultipleSpecies.set(s); openDropdown.set(null)"
													class="w-full text-left px-4 py-2 text-xs text-camp-earth hover:bg-camp-cream/45 transition-colors flex items-center justify-between cursor-pointer"
												>
													<span>{{ s }}</span>
													@if (newMultipleSpecies() === s) {
														<span class="text-camp-sage">✓</span>
													}
												</button>
											}
										</div>
									}
								</div>
							</div>
						}
					</div>

					<div
						footer
						class="px-8 py-6 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-4"
					>
						<button
							(click)="isAddModalOpen.set(false)"
							class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-sm font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40"
						>
							Annulla
						</button>
						<button
							(click)="saveNewPlants()"
							class="px-5 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider"
						>
							Salva
						</button>
					</div>
				</app-camp-dialog>
			}

			@if (bulkActionType()) {
				<app-camp-dialog
					[title]="bulkActionType() === 'treatment' ? 'Associa Trattamento' : bulkActionType() === 'maintenance' ? 'Associa Manutenzione' : 'Associa Attività'"
					subtitle="Azioni di Gruppo"
					[icon]="bulkActionType() === 'treatment' ? '💧' : bulkActionType() === 'maintenance' ? '🔧' : '🌿'"
					(close)="bulkActionType.set(null)"
				>
					<div class="p-8 space-y-6">
						<div class="space-y-1">
							<label class="text-xs uppercase font-bold tracking-widest text-camp-olive font-bold">Titolo Attività</label>
							<input
								type="text"
								[ngModel]="bulkTitle()"
								(ngModelChange)="bulkTitle.set($event)"
								class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner"
							/>
						</div>
						<div class="grid grid-cols-2 gap-6 pb-2">
							<div class="space-y-4">
								<div class="relative">
									<label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5"> Data Inizio </label>
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('startDate')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ formatDateLabel(bulkStartDate()) }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'startDate'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</button>

									@if (openDropdown() === "startDate") {
										<div class="absolute right-0 md:left-0 mt-1 z-50">
											<app-camp-date-picker
												[selectedDate]="bulkStartDate()"
												[disablePast]="true"
												(dateSelected)="selectPickerDate($event, 'start')"
											/>
										</div>
									}
								</div>

								<div class="relative">
									<label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5"> Ora Inizio </label>
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('startTime')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ bulkStartTime() }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'startTime'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</button>

									@if (openDropdown() === "startTime") {
										<app-camp-time-picker
											[selectedTime]="bulkStartTime()"
											(timeSelected)="selectTime($event, 'start')"
										/>
									}
								</div>
							</div>

							<div class="space-y-4">
								<div class="relative">
									<label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5"> Data Fine </label>
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('endDate')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ formatDateLabel(bulkEndDate()) }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'endDate'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</button>

									@if (openDropdown() === "endDate") {
										<div class="absolute right-0 mt-1 z-50">
											<app-camp-date-picker
												[selectedDate]="bulkEndDate()"
												[disablePast]="true"
												(dateSelected)="selectPickerDate($event, 'end')"
											/>
										</div>
									}
								</div>

								<div class="relative">
									<label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5"> Ora Fine </label>
									<button
										type="button"
										(click)="$event.stopPropagation(); toggleDropdown('endTime')"
										class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
									>
										<span>{{ bulkEndTime() }}</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
											[class.rotate-180]="openDropdown() === 'endTime'"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</button>

									@if (openDropdown() === "endTime") {
										<app-camp-time-picker
											[selectedTime]="bulkEndTime()"
											(timeSelected)="selectTime($event, 'end')"
										/>
									}
								</div>
							</div>
						</div>

						<div class="space-y-1">
							<label class="text-xs uppercase font-bold tracking-widest text-camp-olive font-bold">Stato di Salute (opzionale)</label>
							<div class="relative">
								<button
									type="button"
									(click)="$event.stopPropagation(); toggleDropdown('bulkStatus')"
									class="w-full bg-white border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
								>
									<span>{{ bulkStatus() === "Nessuna Modifica" ? "Lascia invariato" : bulkStatus() }}</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4 text-camp-olive/50 transition-transform duration-200"
										[class.rotate-180]="openDropdown() === 'bulkStatus'"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>

								@if (openDropdown() === "bulkStatus") {
									<div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-camp-sand/40 rounded-xl shadow-camp-lg py-1 animate-scale-in">
										@for (
											opt of [
												{ value: "Nessuna Modifica", label: "Lascia invariato" },
												{ value: "Ottimo", label: "Ottimo" },
												{ value: "Attenzione", label: "Attenzione" },
												{ value: "Stressato", label: "Stressato" }
											];
											track opt.value
										) {
											<button
												type="button"
												(click)="bulkStatus.set(opt.value); openDropdown.set(null)"
												class="w-full text-left px-4 py-2 text-xs text-camp-earth hover:bg-camp-cream/45 transition-colors flex items-center justify-between cursor-pointer"
											>
												<span>{{ opt.label }}</span>
												@if (bulkStatus() === opt.value) {
													<span class="text-camp-sage">✓</span>
												}
											</button>
										}
									</div>
								}
							</div>
						</div>

						<div class="space-y-1">
							<label class="text-xs uppercase font-bold tracking-widest text-camp-olive font-bold">Descrizione / Note</label>
							<textarea
								[ngModel]="bulkDescription()"
								(ngModelChange)="bulkDescription.set($event)"
								rows="3"
								class="w-full bg-camp-cream/20 border border-camp-sand/50 rounded-xl px-4 py-2.5 text-sm text-camp-earth focus:border-camp-sage focus:outline-none shadow-inner"
							></textarea>
						</div>
					</div>

					<div
						footer
						class="px-8 py-6 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-4"
					>
						<button
							(click)="bulkActionType.set(null)"
							class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-sm font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40"
						>
							Annulla
						</button>
						<button
							(click)="saveBulkActivity()"
							class="px-5 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider"
						>
							Salva
						</button>
					</div>
				</app-camp-dialog>
			}

			@if (isDeleteConfirmOpen()) {
				<app-camp-dialog
					title="Conferma Eliminazione"
					subtitle="Operazione Irreversibile"
					icon="⚠️"
					(close)="isDeleteConfirmOpen.set(false)"
				>
					<div class="p-8">
						<p class="text-sm text-camp-earth leading-relaxed">
							Sei sicuro di voler eliminare definitivamente <strong>{{ selectedPlantIds().size }}</strong> piante? Questa azione non può essere annullata.
						</p>
					</div>

					<div
						footer
						class="px-8 py-6 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-4"
					>
						<button
							(click)="isDeleteConfirmOpen.set(false)"
							class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-sm font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40"
						>
							Annulla
						</button>
						<button
							(click)="deleteSelectedPlants()"
							class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-camp text-sm font-bold uppercase tracking-wider"
						>
							Elimina
						</button>
					</div>
				</app-camp-dialog>
			}

			@if (toast()) {
				<div
					[class]="
						toast()?.type === 'success'
							? 'bg-camp-success text-white border-camp-success'
							: toast()?.type === 'error'
								? 'bg-camp-error text-white border-camp-error'
								: 'bg-camp-sage text-white border-camp-sage'
					"
					class="fixed top-6 right-6 z-[60] px-5 py-3.5 rounded-camp shadow-camp-xl border flex items-center gap-3 animate-fade-in font-medium text-sm"
				>
					@if (toast()?.type === "success") {
						<span>✔️</span>
					} @else if (toast()?.type === "error") {
						<span>❌</span>
					} @else {
						<span>ℹ️</span>
					}
					<span>{{ toast()?.message }}</span>
				</div>
			}
		</app-layout>
	`,
	styles: []
})
export class LandComponent implements OnInit {
	private landService = inject(LandService);
	private plantsService = inject(PlantsService);
	private calendarService = inject(CalendarService);

	farms = signal<Farm[]>([]);
	selectedFarm = signal<Farm | null>(null);
	plants = signal<Plant[]>([]);
	isLoading = signal(true);
	loadingPlants = signal(false);
	statusFilter = signal<string>("Tutti");
	searchQuery = signal<string>("");
	grassTufts = signal<{ x: number; y: number }[]>([]);

	isEditMode = signal(false);
	editSubMode = signal<'select' | 'move'>('select');
	selectedPlantIds = signal<Set<string>>(new Set());
	isAddModalOpen = signal(false);
	openDropdown = signal<string | null>(null);
	addTab = signal<"single" | "multiple">("single");
	newName = signal("");
	newSpecies = signal("Olivo");
	newStatus = signal("Ottimo");
	newQuantity = signal(5);
	newMultipleSpecies = signal("Olivo");
	bulkActionType = signal<"treatment" | "maintenance" | "other" | null>(null);
	bulkTitle = signal("");
	bulkStartDate = signal("");
	bulkEndDate = signal("");
	bulkStartTime = signal("09:00");
	bulkEndTime = signal("10:00");
	bulkDescription = signal("");
	bulkStatus = signal("Nessuna Modifica");
	isDeleteConfirmOpen = signal(false);
	toast = signal<{ message: string; type: "success" | "error" | "info" } | null>(null);


	private activeDragPlant: Plant | null = null;
	private dragStartX = 0;
	private dragStartY = 0;
	private initialPlantX = 0;
	private initialPlantY = 0;
	private hasDragged = false;

	plantsCount = computed(() => this.filteredPlants().length);

	healthyPercentage = computed(() => {
		const list = this.plants();
		if (!list.length) {
			return 0;
		}
		const healthy = list.filter(p => p.status === "Ottimo").length;
		return Math.round((healthy / list.length) * 100);
	});

	filteredPlants = computed(() => {
		const query = this.searchQuery().toLowerCase().trim();
		const filter = this.statusFilter();
		return this.plants().filter(p => {
			const matchesQuery = p.name.toLowerCase().includes(query) || p.species.toLowerCase().includes(query);
			const matchesFilter = filter === "Tutti" || p.status === filter;
			return matchesQuery && matchesFilter;
		});
	});


	async ngOnInit() {
		this.generateGrassTufts();
		try {
			this.isLoading.set(true);
			const dbFarms = await this.landService.getFarms();
			this.farms.set(dbFarms);
			if (dbFarms && dbFarms.length > 0) {
				this.selectedFarm.set(dbFarms[0]);
				if (dbFarms[0].id) {
					await this.loadPlants(dbFarms[0].id);
				}
			}
		} catch (error) {
			console.error(error);
		} finally {
			this.isLoading.set(false);
		}
	}

	private generateGrassTufts() {
		const tufts: { x: number; y: number }[] = [];
		for (let i = 0; i < 20; i++) {
			tufts.push({
				x: parseFloat((Math.random() * 90 + 5).toFixed(2)),
				y: parseFloat((Math.random() * 90 + 5).toFixed(2))
			});
		}
		this.grassTufts.set(tufts);
	}

	toggleDropdown(name: string) {
		this.openDropdown.update(current => (current === name ? null : name));
	}


	isPastDate(date: Date | string): boolean {
		if (!date) return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const compareDate = new Date(date);
		compareDate.setHours(0, 0, 0, 0);
		return compareDate.getTime() < today.getTime();
	}

	formatDateLabel(dateStr: string): string {
		if (!dateStr) return "Seleziona data";
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
	}

	selectPickerDate(dateStr: string, type: "start" | "end") {
		if (type === "start") {
			this.bulkStartDate.set(dateStr);
			if (this.bulkEndDate() && dateStr > this.bulkEndDate()) {
				this.bulkEndDate.set(dateStr);
			}
		} else {
			this.bulkEndDate.set(dateStr);
			if (this.bulkStartDate() && dateStr < this.bulkStartDate()) {
				this.bulkStartDate.set(dateStr);
			}
		}
		this.openDropdown.set(null);
	}

	selectTime(time: string, type: "start" | "end") {
		if (type === "start") {
			this.bulkStartTime.set(time);
			const startDateTimeStr = `${this.bulkStartDate()}T${time}:00`;
			const endDateTimeStr = `${this.bulkEndDate()}T${this.bulkEndTime()}:00`;
			if (new Date(startDateTimeStr).getTime() > new Date(endDateTimeStr).getTime()) {
				this.bulkEndDate.set(this.bulkStartDate());
				this.bulkEndTime.set(time);
			}
		} else {
			this.bulkEndTime.set(time);
			const startDateTimeStr = `${this.bulkStartDate()}T${this.bulkStartTime()}:00`;
			const endDateTimeStr = `${this.bulkEndDate()}T${time}:00`;
			if (new Date(startDateTimeStr).getTime() > new Date(endDateTimeStr).getTime()) {
				this.bulkStartDate.set(this.bulkEndDate());
				this.bulkStartTime.set(time);
			}
		}
		this.openDropdown.set(null);
	}


	@HostListener("document:click", ["$event"])
	onDocumentClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest(".relative")) {
			this.openDropdown.set(null);
		}
	}

	private async loadPlants(farmId: string) {
		try {
			this.loadingPlants.set(true);
			let dbPlants = await this.plantsService.getPlantsByFarm(farmId);
			if (dbPlants && dbPlants.length > 0) {
				this.plants.set(dbPlants);
			} else {
				const farm = this.selectedFarm();
				if (farm && farm.id === farmId && farm.plants_count > 0) {
					const generated = this.plantsService.generateGridPlants(farmId, farm.main_crop, farm.plants_count);
					dbPlants = await this.plantsService.createPlants(generated);
					this.plants.set(dbPlants);
				} else {
					this.plants.set([]);
				}
			}
		} catch (error) {
			console.error(error);
			this.plants.set([]);
		} finally {
			this.loadingPlants.set(false);
		}
	}

	setStatusFilter(s: string) {
		this.statusFilter.set(s);
	}

	getPlantMarkerClass(p: Plant): string {
		let colorClass = "";
		if (p.status === "Ottimo") {
			colorClass = "border-2 border-camp-success bg-camp-success-light text-camp-success";
		} else if (p.status === "Attenzione") {
			colorClass = "border-2 border-camp-amber bg-camp-amber-light/30 text-camp-amber";
		} else if (p.status === "Stressato") {
			colorClass = "border-2 border-camp-error bg-camp-error-light text-camp-error";
		} else {
			colorClass = "border-2 border-camp-olive/40 bg-camp-sand/40 text-camp-olive";
		}

		return colorClass;
	}

	getTooltipClass(p: Plant): string {
		let verticalClass = "bottom-full mb-3";
		if (p.position_y < 25) {
			verticalClass = "top-full mt-3";
		}
		let horizontalClass = "left-1/2 -translate-x-1/2";
		if (p.position_x < 20) {
			horizontalClass = "left-0 translate-x-0 ml-[-12px]";
		} else if (p.position_x > 80) {
			horizontalClass = "right-0 translate-x-0 mr-[-12px]";
		}
		return `absolute ${verticalClass} ${horizontalClass} bg-camp-earth text-white text-xs rounded-lg py-2 px-3 shadow-camp-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30 border border-white/5`;
	}

	getTooltipArrowClass(p: Plant): string {
		let verticalClass = "top-full -mt-1 border-r border-b";
		if (p.position_y < 25) {
			verticalClass = "bottom-full -mb-1 border-t border-l";
		}
		let horizontalClass = "left-1/2 -translate-x-1/2";
		if (p.position_x < 20) {
			horizontalClass = "left-4 translate-x-0";
		} else if (p.position_x > 80) {
			horizontalClass = "right-4 translate-x-0";
		}
		return `absolute ${verticalClass} ${horizontalClass} w-2 h-2 bg-camp-earth rotate-45 border-white/5`;
	}

	toggleEditMode() {
		this.isEditMode.set(!this.isEditMode());
		if (this.isEditMode()) {
			this.editSubMode.set('select');
		} else {
			this.clearSelection();
		}
	}

	toggleSelection(plant: Plant, event?: Event) {
		if (event) {
			event.stopPropagation();
			event.preventDefault();
		}
		if (this.hasDragged) {
			return;
		}
		if (!plant.id) return;
		const currentSelected = new Set(this.selectedPlantIds());
		if (currentSelected.has(plant.id)) {
			currentSelected.delete(plant.id);
		} else {
			currentSelected.add(plant.id);
		}
		this.selectedPlantIds.set(currentSelected);
	}

	selectAll() {
		const allIds = this.filteredPlants()
			.map(p => p.id)
			.filter((id): id is string => !!id);
		this.selectedPlantIds.set(new Set(allIds));
	}

	clearSelection() {
		this.selectedPlantIds.set(new Set());
	}

	openAddModal() {
		this.newName.set("");
		this.newSpecies.set("Olivo");
		this.newStatus.set("Ottimo");
		this.newQuantity.set(5);
		this.newMultipleSpecies.set("Olivo");
		this.isAddModalOpen.set(true);
	}

	async saveNewPlants() {
		const farm = this.selectedFarm();
		if (!farm || !farm.id) return;

		try {
			if (this.addTab() === "single") {
				const plantObj: Omit<Plant, "user_id"> = {
					farm_id: farm.id,
					name: this.newName().trim() || `${this.newSpecies()} Nuova`,
					species: this.newSpecies(),
					position_x: parseFloat((Math.random() * 80 + 10).toFixed(2)),
					position_y: parseFloat((Math.random() * 80 + 10).toFixed(2)),
					status: this.newStatus()
				};
				const created = await this.plantsService.createPlant(plantObj);
				this.plants.set([...this.plants(), created]);
			} else {
				const count = this.newQuantity();
				const species = this.newMultipleSpecies();
				const newPlants: Omit<Plant, "user_id">[] = [];
				for (let i = 0; i < count; i++) {
					newPlants.push({
						farm_id: farm.id,
						name: `${species} Nuova ${this.plants().length + i + 1}`,
						species: species,
						position_x: parseFloat((Math.random() * 80 + 10).toFixed(2)),
						position_y: parseFloat((Math.random() * 80 + 10).toFixed(2)),
						status: "Ottimo"
					});
				}
				const created = await this.plantsService.createPlants(newPlants);
				this.plants.set([...this.plants(), ...created]);
			}
			this.showToast("Piante aggiunte con successo", "success");
			this.isAddModalOpen.set(false);
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante l'aggiunta delle piante", "error");
		}
	}

	openBulkModal(type: "treatment" | "maintenance" | "other") {
		this.bulkActionType.set(type);
		const titlePrefix = type === "treatment" ? "Trattamento di gruppo" : type === "maintenance" ? "Manutenzione di gruppo" : "Attività di gruppo";
		this.bulkTitle.set(titlePrefix);

		const today = new Date();
		const yearStr = today.getFullYear();
		const monthStr = String(today.getMonth() + 1).padStart(2, "0");
		const dayStr = String(today.getDate()).padStart(2, "0");
		const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

		this.bulkStartDate.set(dateStr);
		this.bulkStartTime.set("09:00");
		this.bulkEndDate.set(dateStr);
		this.bulkEndTime.set("10:00");
		this.bulkDescription.set("");
		this.bulkStatus.set("Nessuna Modifica");
	}

	async saveBulkActivity() {
		const farm = this.selectedFarm();
		if (!farm || !farm.id) return;

		const selectedIds = Array.from(this.selectedPlantIds());
		if (selectedIds.length === 0) return;

		try {
			const typeMap: Record<string, "maintenance" | "harvest" | "irrigation" | "other"> = {
				treatment: "other",
				maintenance: "maintenance",
				other: "other"
			};
			const eventType = typeMap[this.bulkActionType() || "other"] || "other";

			const startDateTimeStr = `${this.bulkStartDate()}T${this.bulkStartTime()}:00`;
			const endDateTimeStr = `${this.bulkEndDate()}T${this.bulkEndTime()}:00`;
			const startIso = new Date(startDateTimeStr).toISOString();
			const endIso = new Date(endDateTimeStr).toISOString();

			const eventData: Omit<CalendarEvent, "id" | "user_id"> = {
				farm_id: farm.id,
				title: this.bulkTitle().trim() || "Attività di gruppo",
				description: this.bulkDescription() || "",
				type: eventType,
				start: startIso,
				end: endIso,
				all_day: false,
				source: "user",
				status: "confirmed",
				plant_ids: selectedIds
			};

			await this.calendarService.createEvent(eventData);

			const updates: Partial<Plant> = {};
			const targetStatus = this.bulkStatus();
			if (targetStatus && targetStatus !== "Nessuna Modifica") {
				updates.status = targetStatus;
			}

			if (this.bulkActionType() === "treatment") {
				updates.last_treatment_type = this.bulkTitle().trim() || "Trattamento";
				updates.last_treatment_at = startIso;
			}

			if (Object.keys(updates).length > 0) {
				await this.plantsService.updatePlants(selectedIds, updates);
				const updatedPlants = this.plants().map(p => {
					if (selectedIds.includes(p.id!)) {
						return { ...p, ...updates };
					}
					return p;
				});
				this.plants.set(updatedPlants);
			}

			this.showToast("Attività di gruppo registrata", "success");
			this.clearSelection();
			this.bulkActionType.set(null);
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante il salvataggio", "error");
		}
	}

	openDeleteConfirm() {
		this.isDeleteConfirmOpen.set(true);
	}

	async deleteSelectedPlants() {
		const selectedIds = Array.from(this.selectedPlantIds());
		if (selectedIds.length === 0) return;

		try {
			await this.plantsService.deletePlants(selectedIds);
			const updatedPlants = this.plants().filter(p => !selectedIds.includes(p.id!));
			this.plants.set(updatedPlants);
			this.showToast("Piante eliminate con successo", "success");
			this.clearSelection();
			this.isDeleteConfirmOpen.set(false);
		} catch (error) {
			console.error(error);
			this.showToast("Impossibile eliminare le piante", "error");
		}
	}

	showToast(message: string, type: "success" | "error" | "info" = "success") {
		this.toast.set({ message, type });
		setTimeout(() => {
			this.toast.set(null);
		}, 3000);
	}

	onDragStart(event: MouseEvent | TouchEvent, plant: Plant) {
		if (this.editSubMode() !== 'move') return;
		event.stopPropagation();
		this.activeDragPlant = plant;
		this.hasDragged = false;

		const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
		const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

		this.dragStartX = clientX;
		this.dragStartY = clientY;
		this.initialPlantX = plant.position_x;
		this.initialPlantY = plant.position_y;

		const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
			this.onDragging(moveEvent);
		};

		const endHandler = () => {
			this.onDragEnd();
			document.removeEventListener("mousemove", moveHandler);
			document.removeEventListener("mouseup", endHandler);
			document.removeEventListener("touchmove", moveHandler);
			document.removeEventListener("touchend", endHandler);
		};

		document.addEventListener("mousemove", moveHandler, { passive: false });
		document.addEventListener("mouseup", endHandler);
		document.addEventListener("touchmove", moveHandler, { passive: false });
		document.addEventListener("touchend", endHandler);
	}

	private onDragging(event: MouseEvent | TouchEvent) {
		if (!this.activeDragPlant) return;

		const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
		const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

		const deltaX = clientX - this.dragStartX;
		const deltaY = clientY - this.dragStartY;

		if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
			this.hasDragged = true;
		}

		const container = document.querySelector(".map-container");
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const deltaPctX = (deltaX / rect.width) * 100;
		const deltaPctY = (deltaY / rect.height) * 100;

		let newX = this.initialPlantX + deltaPctX;
		let newY = this.initialPlantY + deltaPctY;

		newX = Math.max(5, Math.min(95, newX));
		newY = Math.max(5, Math.min(95, newY));

		const updatedPlants = this.plants().map(p => {
			if (p.id === this.activeDragPlant!.id) {
				return { ...p, position_x: parseFloat(newX.toFixed(2)), position_y: parseFloat(newY.toFixed(2)) };
			}
			return p;
		});
		this.plants.set(updatedPlants);

		if (event.cancelable) {
			event.preventDefault();
		}
	}

	private async onDragEnd() {
		if (!this.activeDragPlant) return;

		const plantId = this.activeDragPlant.id;
		const finalPlant = this.plants().find(p => p.id === plantId);

		if (finalPlant && finalPlant.id) {
			try {
				await this.plantsService.updatePlant(finalPlant.id, {
					position_x: finalPlant.position_x,
					position_y: finalPlant.position_y
				});
				this.showToast("Posizione pianta aggiornata", "success");
			} catch (error) {
				console.error(error);
				this.showToast("Impossibile salvare la posizione", "error");
				const revertedPlants = this.plants().map(p => {
					if (p.id === plantId) {
						return { ...p, position_x: this.initialPlantX, position_y: this.initialPlantY };
					}
					return p;
				});
				this.plants.set(revertedPlants);
			}
		}

		this.activeDragPlant = null;
	}
}
