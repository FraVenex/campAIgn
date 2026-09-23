import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AppLayoutComponent } from "../../shared/components/app-layout/app-layout.component";
import { LandService, Farm } from "../../core/services/land.service";
import { PlantsService, Plant } from "../../core/services/plants.service";
import { CalendarService, CalendarEvent } from "../../core/services/calendar.service";
import { ArnaldoService } from "../../core/services/arnaldo.service";
import { CampCardComponent } from "../../shared/components/camp-card/camp-card.component";
import { CampDialogComponent } from "../../shared/components/camp-dialog/camp-dialog.component";
import { CampDatePickerComponent } from "../../shared/components/camp-date-picker/camp-date-picker.component";
import { CampTimePickerComponent } from "../../shared/components/camp-time-picker/camp-time-picker.component";
import { PlantPopupComponent, PlantPopupData } from "../../shared/components/plant-popup/plant-popup.component";

@Component({
	selector: "app-land",
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, AppLayoutComponent, CampCardComponent, CampDialogComponent, CampDatePickerComponent, CampTimePickerComponent, PlantPopupComponent],
	template: `
		<app-layout>
			<div class="max-w-7xl mx-auto space-y-6 animate-fade-in relative pb-28 md:pb-10">
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
									<p class="text-xs text-camp-olive mt-0.5">Clicca su una pianta per visualizzarne la scheda completa o cercala per nome, specie o stato.</p>
								</div>
							</div>

							<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
								<div class="flex items-center gap-3 bg-camp-cream/30 p-2.5 rounded-xl border border-camp-sand/30 w-full sm:w-72 sm:mr-auto">
									<span class="text-camp-olive pl-1">🔍</span>
									<input
										type="text"
										[ngModel]="searchQuery()"
										(ngModelChange)="searchQuery.set($event)"
										placeholder="Cerca pianta per nome, specie o stato..."
										class="w-full bg-transparent text-sm text-camp-earth placeholder-camp-olive/40 focus:outline-none"
									/>
								</div>

								<div class="flex flex-wrap items-center gap-2">
									@if (farms().length > 0) {
										<button
											type="button"
											(click)="toggleSelectMode()"
											[disabled]="isSelectDisabled()"
											[class]="
												interactionMode() === 'select'
													? 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-sage text-white rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-inner ring-2 ring-camp-sage/40 transition-all duration-200 cursor-pointer'
													: isSelectDisabled()
														? 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-sand/20 text-camp-olive/40 rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-camp-sand/20 shadow-none cursor-not-allowed opacity-40 pointer-events-none'
														: 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-cream hover:bg-camp-sand/40 text-camp-earth rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-camp-sand/40 shadow-sm transition-all duration-200 cursor-pointer'
											"
										>
											<span>☑️</span>
											<span>Seleziona Piante</span>
										</button>

										<button
											type="button"
											(click)="toggleMoveMode()"
											[disabled]="isMoveDisabled()"
											[class]="
												interactionMode() === 'move'
													? 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-terracotta text-white rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-inner ring-2 ring-camp-terracotta/40 transition-all duration-200 cursor-pointer'
													: isMoveDisabled()
														? 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-sand/20 text-camp-olive/40 rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-camp-sand/20 shadow-none cursor-not-allowed opacity-40 pointer-events-none'
														: 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-cream hover:bg-camp-sand/40 text-camp-earth rounded-camp text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-camp-sand/40 shadow-sm transition-all duration-200 cursor-pointer'
											"
										>
											<span>✋</span>
											<span>Modifica Terreno</span>
										</button>

										<div class="h-6 w-px bg-camp-sand/40 mx-0.5 hidden sm:block"></div>

										<button
											type="button"
											(click)="openAddModal()"
											[disabled]="isAddDisabled()"
											[class]="
												isAddDisabled()
													? 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-sand/20 text-camp-olive/40 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-camp flex items-center gap-1.5 border border-camp-sand/20 shadow-none cursor-not-allowed opacity-40 pointer-events-none'
													: 'px-3.5 sm:px-4 py-2 sm:py-2.5 bg-camp-cream hover:bg-camp-sand/40 text-camp-earth text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-camp flex items-center gap-1.5 border border-camp-sand/40 shadow-sm transition-all duration-200 cursor-pointer'
											"
										>
											<span class="text-camp-sage font-bold">➕</span>
											<span>Aggiungi Piante</span>
										</button>
									}
								</div>
							</div>

							@if (interactionMode() === 'select') {
								<div class="mb-4 bg-camp-sage/10 border border-camp-sage/30 rounded-xl p-3 px-4 flex items-center justify-between gap-3 animate-slide-up">
									<div class="flex items-center gap-2.5">
										<span class="text-base">☑️</span>
										<p class="text-xs text-camp-earth">
											<strong class="font-bold text-camp-sage">Selezione Piante:</strong> Clicca sulle piante per selezionarle e applicare azioni di gruppo.
										</p>
									</div>
									<button
										type="button"
										(click)="toggleSelectMode()"
										class="px-3 py-1 bg-camp-sage hover:bg-camp-earth text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer flex items-center gap-1"
									>
										<span>✕</span>
										<span>Fine</span>
									</button>
								</div>
							}

							@if (interactionMode() === 'move') {
								<div class="mb-4 bg-camp-terracotta/10 border border-camp-terracotta/20 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 animate-slide-up">
									<div class="flex items-center gap-2.5">
										<span class="text-base">✋</span>
										<p class="text-xs text-camp-earth">
											<strong class="font-bold text-camp-terracotta">Modifica Terreno:</strong> Trascina le piante per posizionarle sui punti del reticolo.
										</p>
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											(click)="alignAllToGrid()"
											class="px-2.5 py-1 bg-white hover:bg-camp-cream text-camp-terracotta border border-camp-terracotta/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
											title="Allinea tutte le piante ai nodi liberi del reticolo"
										>
											<span>⚡</span>
											<span>Allinea al Reticolo</span>
										</button>
										<button
											type="button"
											(click)="toggleMoveMode()"
											class="px-3 py-1 bg-camp-terracotta hover:bg-camp-bark text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer flex items-center gap-1"
										>
											<span>✕</span>
											<span>Fine</span>
										</button>
									</div>
								</div>
							}

							<div class="relative w-full aspect-[4/3] max-h-[72vh] landscape:max-h-[calc(100vh-130px)] landscape:w-auto landscape:aspect-[4/3] landscape:mx-auto border border-camp-sand/40 rounded-camp shadow-inner bg-camp-sand/10 overflow-hidden">
								<div 
									#scrollContainer
									class="w-full h-full overflow-auto relative map-scroll-container cursor-grab active:cursor-grabbing touch-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
									(wheel)="onWheel($event, scrollContainer)"
									(mousedown)="onMapDragStart($event, scrollContainer)"
									(mousemove)="onMapDrag($event, scrollContainer)"
									(mouseup)="onMapDragEnd()"
									(mouseleave)="onMapDragEnd()"
									(touchstart)="onTouchStart($event, scrollContainer)"
									(touchmove)="onTouchMove($event, scrollContainer)"
									(touchend)="onTouchEnd()"
									(touchcancel)="onTouchEnd()"
								>
									<div 
										class="map-container relative bg-gradient-to-br from-[#dfd7bf] to-[#c7beaa] select-none origin-top-left w-full h-full" 
										[style.width.%]="zoom() * 100"
										[style.height.%]="zoom() * 100"
										(click)="closePlantPopup()"
									>
										<svg
											class="absolute inset-0 w-full h-full text-camp-earth/10 pointer-events-none"
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

											<!-- Reticolo geometrico del terreno: visibile SOLO in modalità Modifica Terreno -->
											@if (interactionMode() === 'move') {
												<!-- Linee verticali del reticolo -->
												@for (colX of gridColsLines; track colX) {
													<line
														[attr.x1]="colX + '%'"
														y1="7%"
														[attr.x2]="colX + '%'"
														y2="95%"
														stroke="#964f26"
														stroke-width="1.2"
														stroke-dasharray="3 3"
														opacity="0.35"
													/>
												}
												<!-- Linee orizzontali del reticolo -->
												@for (rowY of gridRowsLines; track rowY) {
													<line
														x1="5%"
														[attr.y1]="rowY + '%'"
														x2="95%"
														[attr.y2]="rowY + '%'"
														stroke="#964f26"
														stroke-width="1.2"
														stroke-dasharray="3 3"
														opacity="0.35"
													/>
												}
												<!-- Nodi del reticolo: punti discreti di aggancio -->
												@for (node of gridNodes; track node.x + '-' + node.y) {
													<circle
														[attr.cx]="node.x + '%'"
														[attr.cy]="node.y + '%'"
														r="2.5"
														fill="#964f26"
														opacity="0.4"
													/>
												}
											}
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
										class="absolute"
										[class.z-40]="activePopupPlantId() === p.id"
										[class.z-20]="selectedPlantIds().has(p.id!) && activePopupPlantId() !== p.id"
										[class.z-10]="!selectedPlantIds().has(p.id!) && activePopupPlantId() !== p.id"
										[style.left.%]="p.position_x"
										[style.top.%]="p.position_y"
									>
										@if (interactionMode() === 'view') {
											<button
												type="button"
												(click)="$event.stopPropagation(); openPlantPopup(p)"
												[class]="getPlantMarkerClass(p)"
												class="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md select-none hover:scale-125 focus:outline-none animate-scale-in before:content-[''] before:absolute before:-inset-2 before:rounded-full"
											>
												<span class="text-[9px] sm:text-xs md:text-base select-none leading-none">🌳</span>
											</button>
										} @else if (interactionMode() === 'select') {
											<button
												type="button"
												(click)="toggleSelection(p, $event)"
												[class]="getPlantMarkerClass(p)"
												[class.ring-2]="selectedPlantIds().has(p.id!)"
												[class.md:ring-4]="selectedPlantIds().has(p.id!)"
												[class.ring-camp-sage]="selectedPlantIds().has(p.id!)"
												[class.scale-110]="selectedPlantIds().has(p.id!)"
												class="relative w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md select-none hover:scale-125 focus:outline-none animate-scale-in before:content-[''] before:absolute before:-inset-2 before:rounded-full"
											>
												<span class="text-[9px] sm:text-xs md:text-base select-none leading-none">🌳</span>
												@if (selectedPlantIds().has(p.id!)) {
													<span class="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-camp-sage text-white text-[7px] md:text-[10px] font-bold rounded-full flex items-center justify-center shadow">✓</span>
												}
											</button>
										} @else if (interactionMode() === 'move') {
											<div
												(mousedown)="onDragStart($event, p)"
												(touchstart)="onDragStart($event, p)"
												[class]="getPlantMarkerClass(p)"
												class="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 flex items-center justify-center shadow-md select-none hover:scale-125 focus:outline-none animate-scale-in cursor-move active:cursor-grabbing before:content-[''] before:absolute before:-inset-2 before:rounded-full"
											>
												<span class="text-[9px] sm:text-xs md:text-base select-none leading-none">🌳</span>
											</div>
										}

										@if (interactionMode() === 'view' && activePopupPlantId() === p.id && activePopupData()) {
											<div class="hidden md:block">
												<app-plant-popup
													[data]="activePopupData()!"
													(close)="closePlantPopup()"
												/>
											</div>
										}
									</div>
								}
									</div>
								</div>
							</div>

							<!-- Mobile Bottom Sheet Scheda Pianta -->
							@if (interactionMode() === 'view' && activePopupPlantId() && activePopupData()) {
								<div class="md:hidden fixed bottom-20 inset-x-3 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-camp-xl border border-camp-sand/60 p-4 animate-slide-up">
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-center gap-3 min-w-0">
											<div
												class="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 border"
												[class]="getPlantMarkerClass(activePopupData()!.plant)"
											>
												🌳
											</div>
											<div class="min-w-0">
												<div class="flex items-center gap-2">
													<h4 class="font-serif font-bold text-sm text-camp-earth truncate">{{ activePopupData()!.plant.name || 'Pianta' }}</h4>
													<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-camp-sand/40 text-camp-earth">
														{{ activePopupData()!.plant.status || 'Non Valutato' }}
													</span>
												</div>
												<p class="text-xs text-camp-olive mt-0.5 truncate">{{ activePopupData()!.plant.species }} · ({{ activePopupData()!.plant.position_x }}%, {{ activePopupData()!.plant.position_y }}%)</p>
											</div>
										</div>
										<button
											type="button"
											(click)="closePlantPopup()"
											class="w-8 h-8 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive cursor-pointer shrink-0"
										>
											✕
										</button>
									</div>

									@if (activePopupData()!.lastEvent) {
										<div class="mt-2.5 pt-2.5 border-t border-camp-sand/30 flex items-center justify-between text-xs text-camp-olive">
											<span class="font-medium text-[11px] opacity-70">Ultima attività:</span>
											<span class="font-bold text-camp-earth truncate max-w-[180px]">{{ activePopupData()!.lastEvent!.title }}</span>
										</div>
									}

									<div class="mt-3 flex gap-2">
										<a
											[routerLink]="['/land/plant', activePopupData()!.plant.id]"
											class="flex-1 py-2 bg-camp-sage hover:bg-camp-earth text-white text-xs font-bold uppercase tracking-wider rounded-xl text-center shadow-sm transition-colors"
										>
											Apri Scheda Dettaglio
										</a>
									</div>
								</div>
							}
						</div>
					}
				}
			</div>

			@if (interactionMode() === 'select' && selectedPlantIds().size > 0) {
				<!-- Mobile: Barra flottante compatta SUBITO SOPRA la bottom navigation bar (non la copre) -->
				<div
					class="md:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] inset-x-3 z-40 bg-camp-earth/95 text-white px-4 py-2.5 rounded-2xl shadow-camp-xl border border-white/10 backdrop-blur flex items-center justify-between gap-3 animate-slide-up"
				>
					<div class="flex items-center gap-2.5">
						<span class="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-sm shadow-inner">🌳</span>
						<div class="flex items-baseline gap-1.5">
							<span class="text-sm font-bold text-white leading-none">{{ selectedPlantIds().size }}</span>
							<span class="text-[11px] text-white/70">{{ selectedPlantIds().size === 1 ? 'selezionata' : 'selezionate' }}</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							(click)="clearSelection()"
							class="px-2.5 py-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
						>
							Deseleziona
						</button>
						<button
							type="button"
							(click)="isBulkSheetOpen.set(true)"
							class="px-3.5 py-1.5 bg-camp-sage hover:bg-camp-sage-light text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
						>
							<span>Azioni</span>
							<span>⚡</span>
						</button>
					</div>
				</div>

				<!-- Mobile: Bottom Sheet Modale Azioni di Gruppo (aperto solo al tocco di 'Azioni') -->
				@if (isBulkSheetOpen()) {
					<div
						class="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
						(click)="isBulkSheetOpen.set(false)"
					></div>

					<div class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-camp-xl border-t border-camp-sand/50 p-5 pb-safe animate-slide-up max-h-[85vh] overflow-y-auto">
						<div class="w-12 h-1.5 bg-camp-sand/60 rounded-full mx-auto mb-4"></div>

						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-2.5">
								<span class="w-9 h-9 rounded-xl bg-camp-sage/10 text-camp-sage flex items-center justify-center text-lg">🌳</span>
								<div>
									<h4 class="font-serif font-bold text-base text-camp-earth">{{ selectedPlantIds().size }} Piante Selezionate</h4>
									<p class="text-[11px] text-camp-olive">Scegli l'azione di gruppo da applicare</p>
								</div>
							</div>
							<button
								type="button"
								(click)="isBulkSheetOpen.set(false)"
								class="w-8 h-8 rounded-full bg-camp-cream hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive text-sm cursor-pointer"
							>
								✕
							</button>
						</div>

						<!-- Azioni rapide di selezione -->
						<div class="flex items-center gap-2 mb-4 bg-camp-cream/50 p-1.5 rounded-xl border border-camp-sand/40">
							<button
								type="button"
								(click)="selectAll()"
								class="flex-1 py-1.5 text-xs font-bold text-camp-earth hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<span>✓</span>
								<span>Seleziona Tutte</span>
							</button>
							<div class="w-px h-4 bg-camp-sand/60"></div>
							<button
								type="button"
								(click)="clearSelection(); isBulkSheetOpen.set(false)"
								class="flex-1 py-1.5 text-xs font-bold text-camp-olive hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<span>✕</span>
								<span>Deseleziona</span>
							</button>
						</div>

						<!-- Griglia Azioni Touch-Friendly -->
						<div class="grid grid-cols-2 gap-2.5">
							<button
								type="button"
								(click)="openBulkModal('treatment')"
								class="p-3 bg-camp-sage/10 hover:bg-camp-sage/20 border border-camp-sage/30 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">💧</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Trattamento</p>
									<p class="text-[10px] text-camp-olive">Fitosanitario</p>
								</div>
							</button>

							<button
								type="button"
								(click)="openBulkModal('maintenance')"
								class="p-3 bg-camp-terracotta/10 hover:bg-camp-terracotta/20 border border-camp-terracotta/30 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">🔧</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Manutenzione</p>
									<p class="text-[10px] text-camp-olive">Potatura o sfalcio</p>
								</div>
							</button>

							<button
								type="button"
								(click)="openBulkModal('harvest')"
								class="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">🫒</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Raccolta</p>
									<p class="text-[10px] text-camp-olive">Registra resa</p>
								</div>
							</button>

							<button
								type="button"
								(click)="openDirectStatusModal()"
								class="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">🩺</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Definisci Stato</p>
									<p class="text-[10px] text-camp-olive">Aggiorna salute</p>
								</div>
							</button>

							<button
								type="button"
								(click)="openBulkModal('other')"
								class="p-3 bg-camp-cream hover:bg-camp-sand/30 border border-camp-sand/50 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">📅</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Nuova Attività</p>
									<p class="text-[10px] text-camp-olive">Personalizzata</p>
								</div>
							</button>

							<button
								type="button"
								(click)="openDeleteConfirm()"
								class="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center gap-2.5 text-left transition-all active:scale-98 cursor-pointer"
							>
								<span class="text-xl">🗑️</span>
								<div>
									<p class="text-xs font-bold text-red-700">Elimina</p>
									<p class="text-[10px] text-red-500">Rimuovi piante</p>
								</div>
							</button>
						</div>
					</div>
				}

				<!-- Desktop / Tablet: Barra Flottante Orizzontale Ricca Classica -->
				<div
					class="hidden md:flex fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[45] bg-camp-earth/95 text-white px-6 py-4 rounded-camp-xl shadow-camp-xl items-center gap-6 border border-white/10 backdrop-blur animate-scale-in max-w-3xl"
				>
					<div class="flex items-center gap-3 pr-4 border-r border-white/10">
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
								(click)="openBulkModal('harvest')"
								class="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
							>
								<span>🫒</span>
								<span>Raccolta</span>
							</button>
							<button
								(click)="openDirectStatusModal()"
								class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
							>
								<span>🩺</span>
								<span>Definisci Stato</span>
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
					(close)="closeAddModal()"
				>
					<div class="-mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 border-b border-camp-sand/30 flex">
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

					<div class="space-y-6">
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
							(click)="closeAddModal()"
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
					[title]="bulkActionType() === 'treatment' ? 'Associa Trattamento' : bulkActionType() === 'maintenance' ? 'Associa Manutenzione' : bulkActionType() === 'harvest' ? 'Associa Raccolta' : 'Associa Attività'"
					subtitle="Azioni di Gruppo"
					[icon]="bulkActionType() === 'treatment' ? '💧' : bulkActionType() === 'maintenance' ? '🔧' : bulkActionType() === 'harvest' ? '🫒' : '🌿'"
					(close)="bulkActionType.set(null)"
				>
					<div class="space-y-6">
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

			@if (isDirectStatusModalOpen()) {
				<app-camp-dialog
					title="Definisci Stato Piante"
					subtitle="Azioni di Gruppo ({{ selectedPlantIds().size }} piante)"
					icon="🩺"
					(close)="isDirectStatusModalOpen.set(false)"
				>
					<div class="space-y-4">
						<p class="text-xs text-camp-earth/80">
							Seleziona lo stato di salute da assegnare a tutte le <strong>{{ selectedPlantIds().size }}</strong> piante selezionate:
						</p>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<button
								type="button"
								(click)="directStatusValue.set('Ottimo')"
								[class]="
									directStatusValue() === 'Ottimo'
										? 'p-4 rounded-xl border-2 border-camp-success bg-camp-success-light/30 flex flex-col items-center gap-2 text-center transition-all shadow-sm'
										: 'p-4 rounded-xl border border-camp-sand/40 bg-white hover:bg-camp-cream/20 flex flex-col items-center gap-2 text-center transition-all'
								"
							>
								<span class="text-2xl">🟢</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Ottimo</p>
									<p class="text-[10px] text-camp-olive mt-0.5">Vigore e salute ideali</p>
								</div>
							</button>

							<button
								type="button"
								(click)="directStatusValue.set('Attenzione')"
								[class]="
									directStatusValue() === 'Attenzione'
										? 'p-4 rounded-xl border-2 border-camp-amber bg-camp-amber-light/30 flex flex-col items-center gap-2 text-center transition-all shadow-sm'
										: 'p-4 rounded-xl border border-camp-sand/40 bg-white hover:bg-camp-cream/20 flex flex-col items-center gap-2 text-center transition-all'
								"
							>
								<span class="text-2xl">🟡</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Attenzione</p>
									<p class="text-[10px] text-camp-olive mt-0.5">Stress o anomalie lievi</p>
								</div>
							</button>

							<button
								type="button"
								(click)="directStatusValue.set('Stressato')"
								[class]="
									directStatusValue() === 'Stressato'
										? 'p-4 rounded-xl border-2 border-camp-error bg-camp-error-light/30 flex flex-col items-center gap-2 text-center transition-all shadow-sm'
										: 'p-4 rounded-xl border border-camp-sand/40 bg-white hover:bg-camp-cream/20 flex flex-col items-center gap-2 text-center transition-all'
								"
							>
								<span class="text-2xl">🔴</span>
								<div>
									<p class="text-xs font-bold text-camp-earth">Stressato</p>
									<p class="text-[10px] text-camp-olive mt-0.5">Intervento urgente</p>
								</div>
							</button>
						</div>
					</div>

					<div
						footer
						class="px-8 py-6 bg-camp-cream/30 border-t border-camp-sand/30 flex justify-end gap-4"
					>
						<button
							type="button"
							(click)="isDirectStatusModalOpen.set(false)"
							class="px-5 py-2.5 border border-camp-sand/60 rounded-camp text-sm font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-cream/40 cursor-pointer"
						>
							Annulla
						</button>
						<button
							type="button"
							(click)="saveDirectStatus()"
							class="px-5 py-2.5 bg-camp-sage hover:bg-camp-earth text-white rounded-camp text-sm font-bold uppercase tracking-wider cursor-pointer"
						>
							Salva Stato
						</button>
					</div>
				</app-camp-dialog>
			}

			@if (isDeleteConfirmOpen()) {
				<app-camp-dialog
					title="Conferma Eliminazione"
					subtitle="Operazione Irreversibile"
					icon="⚠️"
					maxWidth="max-w-lg"
					(close)="isDeleteConfirmOpen.set(false)"
				>
					<div>
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
export class LandComponent implements OnInit, OnDestroy {
	private landService = inject(LandService);
	private plantsService = inject(PlantsService);
	private calendarService = inject(CalendarService);
	private arnaldoService = inject(ArnaldoService);
	private cdr = inject(ChangeDetectorRef);

	ngOnDestroy() {
		this.arnaldoService.setFabVisible(true);
	}

	farms = signal<Farm[]>([]);
	selectedFarm = signal<Farm | null>(null);
	plants = signal<Plant[]>([]);
	isLoading = signal(true);
	loadingPlants = signal(false);
	searchQuery = signal<string>("");
	grassTufts = signal<{ x: number; y: number }[]>([]);

	interactionMode = signal<'view' | 'select' | 'move'>('view');
	selectedPlantIds = signal<Set<string>>(new Set());
	isBulkSheetOpen = signal(false);
	isAddModalOpen = signal(false);

	isSelectDisabled = computed(() => this.interactionMode() === 'move' || this.isAddModalOpen());
	isMoveDisabled = computed(() => this.interactionMode() === 'select' || this.isAddModalOpen());
	isAddDisabled = computed(() => this.interactionMode() !== 'view');
	openDropdown = signal<string | null>(null);
	addTab = signal<"single" | "multiple">("single");
	newName = signal("");
	newSpecies = signal("Olivo");
	newStatus = signal("Ottimo");
	newQuantity = signal(5);
	newMultipleSpecies = signal("Olivo");
	bulkActionType = signal<"treatment" | "maintenance" | "harvest" | "other" | null>(null);
	bulkTitle = signal("");
	bulkStartDate = signal("");
	bulkEndDate = signal("");
	bulkStartTime = signal("09:00");
	bulkEndTime = signal("10:00");
	bulkDescription = signal("");
	bulkStatus = signal("Nessuna Modifica");
	isDirectStatusModalOpen = signal(false);
	directStatusValue = signal<"Ottimo" | "Attenzione" | "Stressato">("Ottimo");
	isDeleteConfirmOpen = signal(false);
	toast = signal<{ message: string; type: "success" | "error" | "info" } | null>(null);

	zoom = signal<number>(1);

	activePopupPlantId = signal<string | null>(null);
	activePopupData = signal<PlantPopupData | null>(null);


	// Reticolo geometrico del terreno (16 colonne x 12 righe, aspect ratio 4:3 con maglia quadrata)
	readonly GRID_COLS = 16;
	readonly GRID_ROWS = 12;
	readonly GRID_X_MIN = 5;
	readonly GRID_X_STEP = 6;
	readonly GRID_Y_MIN = 7;
	readonly GRID_Y_STEP = 8;

	readonly gridColsLines: number[] = Array.from({ length: 16 }, (_, i) => parseFloat((5 + i * 6).toFixed(2)));
	readonly gridRowsLines: number[] = Array.from({ length: 12 }, (_, i) => parseFloat((7 + i * 8).toFixed(2)));
	readonly gridNodes: { x: number; y: number }[] = (() => {
		const nodes: { x: number; y: number }[] = [];
		for (let r = 0; r < 12; r++) {
			for (let c = 0; c < 16; c++) {
				nodes.push({
					x: parseFloat((5 + c * 6).toFixed(2)),
					y: parseFloat((7 + r * 8).toFixed(2))
				});
			}
		}
		return nodes;
	})();

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
		if (!query) {
			return this.plants();
		}
		return this.plants().filter(p => {
			const matchesName = p.name.toLowerCase().includes(query);
			const matchesSpecies = p.species.toLowerCase().includes(query);
			const matchesStatus = p.status ? p.status.toLowerCase().includes(query) : false;
			return matchesName || matchesSpecies || matchesStatus;
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

	getPlantMarkerClass(p: Plant): string {
		let colorClass = "";
		if (p.status === "Ottimo") {
			colorClass = "border md:border-2 border-camp-success bg-camp-success-light text-camp-success";
		} else if (p.status === "Attenzione") {
			colorClass = "border md:border-2 border-camp-amber bg-camp-amber-light/30 text-camp-amber";
		} else if (p.status === "Stressato") {
			colorClass = "border md:border-2 border-camp-error bg-camp-error-light text-camp-error";
		} else {
			colorClass = "border md:border-2 border-camp-olive/40 bg-camp-sand/40 text-camp-olive";
		}

		return colorClass;
	}

	toggleSelectMode() {
		if (this.interactionMode() === 'select') {
			this.interactionMode.set('view');
			this.clearSelection();
			this.isBulkSheetOpen.set(false);
			this.arnaldoService.setFabVisible(true);
		} else {
			this.interactionMode.set('select');
			this.closePlantPopup();
			this.arnaldoService.setFabVisible(false);
		}
	}

	toggleMoveMode() {
		if (this.interactionMode() === 'move') {
			this.interactionMode.set('view');
			this.arnaldoService.setFabVisible(true);
		} else {
			this.interactionMode.set('move');
			this.closePlantPopup();
			this.clearSelection();
			this.isBulkSheetOpen.set(false);
			this.arnaldoService.setFabVisible(false);
		}
	}

	async openPlantPopup(plant: Plant) {
		if (!plant.id) return;
		if (this.activePopupPlantId() === plant.id) {
			this.closePlantPopup();
			return;
		}
		this.activePopupPlantId.set(plant.id);
		this.activePopupData.set({ plant, lastEvent: null });
		try {
			const lastEvent = await this.calendarService.getLastEventForPlant(plant.id);
			this.activePopupData.set({ plant, lastEvent });
		} catch {
			// mantieni popup con dati base disponibili
		}
	}

	closePlantPopup() {
		this.activePopupPlantId.set(null);
		this.activePopupData.set(null);
	}

	zoomIn() {
		this.zoom.update(z => Math.min(4, z + 0.5));
	}

	zoomOut() {
		this.zoom.update(z => Math.max(1, z - 0.5));
	}

	resetZoom() {
		this.zoom.set(1);
	}

	private mapIsDragging = false;
	private mapDragStartX = 0;
	private mapDragStartY = 0;
	private mapScrollStartX = 0;
	private mapScrollStartY = 0;
	private initialPinchDistance = 0;
	private initialZoomOnPinch = 1;

	onMapDragStart(event: MouseEvent, container: HTMLElement) {
		if (event.button !== 0 || this.interactionMode() === 'move') return;
		this.mapIsDragging = true;
		this.mapDragStartX = event.clientX;
		this.mapDragStartY = event.clientY;
		this.mapScrollStartX = container.scrollLeft;
		this.mapScrollStartY = container.scrollTop;
	}

	onMapDrag(event: MouseEvent, container: HTMLElement) {
		if (!this.mapIsDragging) return;
		event.preventDefault();
		const dx = event.clientX - this.mapDragStartX;
		const dy = event.clientY - this.mapDragStartY;
		container.scrollLeft = this.mapScrollStartX - dx;
		container.scrollTop = this.mapScrollStartY - dy;
	}

	onMapDragEnd() {
		this.mapIsDragging = false;
	}

	onWheel(event: WheelEvent, container: HTMLElement) {
		event.preventDefault();
		const zoomDelta = event.deltaY > 0 ? -0.2 : 0.2;
		const oldZoom = this.zoom();
		const newZoom = Math.max(1, Math.min(4, oldZoom + zoomDelta));
		if (oldZoom !== newZoom) {
			this.applyZoom(newZoom, event.clientX, event.clientY, container);
		}
	}

	onTouchStart(event: TouchEvent, container: HTMLElement) {
		if (event.touches.length === 1 && this.interactionMode() !== 'move') {
			this.mapIsDragging = true;
			this.mapDragStartX = event.touches[0].clientX;
			this.mapDragStartY = event.touches[0].clientY;
			this.mapScrollStartX = container.scrollLeft;
			this.mapScrollStartY = container.scrollTop;
		} else if (event.touches.length === 2) {
			this.initialPinchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
			this.initialZoomOnPinch = this.zoom();
		}
	}

	onTouchMove(event: TouchEvent, container: HTMLElement) {
		if (event.touches.length === 1 && this.mapIsDragging) {
			event.preventDefault();
			const dx = event.touches[0].clientX - this.mapDragStartX;
			const dy = event.touches[0].clientY - this.mapDragStartY;
			container.scrollLeft = this.mapScrollStartX - dx;
			container.scrollTop = this.mapScrollStartY - dy;
		} else if (event.touches.length === 2) {
			event.preventDefault();
			const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
			const scale = currentDistance / this.initialPinchDistance;
			
			const newZoom = Math.max(1, Math.min(4, this.initialZoomOnPinch * scale));
			
			const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
			const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

			this.applyZoom(newZoom, centerX, centerY, container);
		}
	}

	onTouchEnd() {
		this.mapIsDragging = false;
		this.initialPinchDistance = 0;
	}

	private getTouchDistance(t1: Touch, t2: Touch): number {
		const dx = t1.clientX - t2.clientX;
		const dy = t1.clientY - t2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private applyZoom(newZoom: number, clientX: number, clientY: number, container: HTMLElement) {
		const oldZoom = this.zoom();
		if (oldZoom === newZoom) return;

		const rect = container.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;

		const mapX = (container.scrollLeft + mouseX) / oldZoom;
		const mapY = (container.scrollTop + mouseY) / oldZoom;

		this.zoom.set(parseFloat(newZoom.toFixed(2)));
		this.cdr.detectChanges();

		container.scrollLeft = (mapX * newZoom) - mouseX;
		container.scrollTop = (mapY * newZoom) - mouseY;
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
		this.arnaldoService.setFabVisible(false);
	}

	closeAddModal() {
		this.isAddModalOpen.set(false);
		if (this.interactionMode() === 'view') {
			this.arnaldoService.setFabVisible(true);
		}
	}

	snapToGrid(rawX: number, rawY: number): { x: number; y: number } {
		const colIndex = Math.round((rawX - this.GRID_X_MIN) / this.GRID_X_STEP);
		const clampedCol = Math.max(0, Math.min(this.GRID_COLS - 1, colIndex));
		const snappedX = parseFloat((this.GRID_X_MIN + clampedCol * this.GRID_X_STEP).toFixed(2));

		const rowIndex = Math.round((rawY - this.GRID_Y_MIN) / this.GRID_Y_STEP);
		const clampedRow = Math.max(0, Math.min(this.GRID_ROWS - 1, rowIndex));
		const snappedY = parseFloat((this.GRID_Y_MIN + clampedRow * this.GRID_Y_STEP).toFixed(2));

		return { x: snappedX, y: snappedY };
	}

	isNodeOccupied(x: number, y: number, excludePlantId?: string): boolean {
		return this.plants().some(p => p.id !== excludePlantId && Math.abs(p.position_x - x) < 1.5 && Math.abs(p.position_y - y) < 1.5);
	}

	findAvailableGridSlots(count: number): { x: number; y: number }[] {
		const available: { x: number; y: number }[] = [];
		for (const node of this.gridNodes) {
			if (!this.isNodeOccupied(node.x, node.y)) {
				available.push(node);
				if (available.length === count) break;
			}
		}
		return available;
	}

	async alignAllToGrid() {
		const currentPlants = [...this.plants()];
		if (currentPlants.length === 0) return;

		const occupiedSlots = new Set<string>();
		const updates: { id: string; x: number; y: number }[] = [];

		for (const plant of currentPlants) {
			if (!plant.id) continue;
			let bestNode = this.gridNodes[0];
			let bestDist = Infinity;

			for (const node of this.gridNodes) {
				const key = `${node.x}_${node.y}`;
				if (occupiedSlots.has(key)) continue;

				const dx = plant.position_x - node.x;
				const dy = (plant.position_y - node.y) * 0.75;
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					bestNode = node;
				}
			}

			occupiedSlots.add(`${bestNode.x}_${bestNode.y}`);
			updates.push({ id: plant.id, x: bestNode.x, y: bestNode.y });
		}

		const updatedPlants = currentPlants.map(p => {
			const u = updates.find(item => item.id === p.id);
			return u ? { ...p, position_x: u.x, position_y: u.y } : p;
		});
		this.plants.set(updatedPlants);

		try {
			for (const u of updates) {
				await this.plantsService.updatePlant(u.id, { position_x: u.x, position_y: u.y });
			}
			this.showToast("Tutte le piante allineate con successo al reticolo", "success");
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante l'allineamento delle piante", "error");
		}
	}

	async saveNewPlants() {
		const farm = this.selectedFarm();
		if (!farm || !farm.id) return;

		try {
			if (this.addTab() === "single") {
				const availableSlots = this.findAvailableGridSlots(1);
				const slot = availableSlots[0] || { x: 50, y: 50 };
				const plantObj: Omit<Plant, "user_id"> = {
					farm_id: farm.id,
					name: this.newName().trim() || `${this.newSpecies()} Nuova`,
					species: this.newSpecies(),
					position_x: slot.x,
					position_y: slot.y,
					status: this.newStatus()
				};
				const created = await this.plantsService.createPlant(plantObj);
				this.plants.set([...this.plants(), created]);
			} else {
				const count = this.newQuantity();
				const species = this.newMultipleSpecies();
				const availableSlots = this.findAvailableGridSlots(count);
				const newPlants: Omit<Plant, "user_id">[] = [];
				for (let i = 0; i < count; i++) {
					const slot = availableSlots[i] || { x: parseFloat((Math.random() * 80 + 10).toFixed(2)), y: parseFloat((Math.random() * 80 + 10).toFixed(2)) };
					newPlants.push({
						farm_id: farm.id,
						name: `${species} Nuova ${this.plants().length + i + 1}`,
						species: species,
						position_x: slot.x,
						position_y: slot.y,
						status: "Ottimo"
					});
				}
				const created = await this.plantsService.createPlants(newPlants);
				this.plants.set([...this.plants(), ...created]);
			}
			this.showToast("Piante aggiunte sul reticolo", "success");
			this.closeAddModal();
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante l'aggiunta delle piante", "error");
		}
	}

	openBulkModal(type: "treatment" | "maintenance" | "harvest" | "other") {
		this.isBulkSheetOpen.set(false);
		this.bulkActionType.set(type);
		const titlePrefix = type === "treatment" ? "Trattamento di gruppo" : type === "maintenance" ? "Manutenzione di gruppo" : type === "harvest" ? "Raccolta di gruppo" : "Attività di gruppo";
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
				harvest: "harvest",
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

			const successMessage = this.bulkActionType() === "harvest" ? "Raccolta di gruppo registrata" : "Attività di gruppo registrata";
			this.showToast(successMessage, "success");
			this.clearSelection();
			this.bulkActionType.set(null);
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante il salvataggio", "error");
		}
	}

	openDirectStatusModal() {
		this.isBulkSheetOpen.set(false);
		this.directStatusValue.set("Ottimo");
		this.isDirectStatusModalOpen.set(true);
	}

	async saveDirectStatus() {
		const selectedIds = Array.from(this.selectedPlantIds());
		if (selectedIds.length === 0) return;

		const targetStatus = this.directStatusValue();
		try {
			await this.plantsService.updatePlants(selectedIds, { status: targetStatus });
			const updatedPlants = this.plants().map(p => {
				if (selectedIds.includes(p.id!)) {
					return { ...p, status: targetStatus };
				}
				return p;
			});
			this.plants.set(updatedPlants);
			this.showToast(`Stato aggiornato per ${selectedIds.length} piante`, "success");
			this.clearSelection();
			this.isDirectStatusModalOpen.set(false);
		} catch (error) {
			console.error(error);
			this.showToast("Errore durante l'aggiornamento dello stato", "error");
		}
	}

	openDeleteConfirm() {
		this.isBulkSheetOpen.set(false);
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
		if (this.interactionMode() !== 'move') return;
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

		if (finalPlant && finalPlant.id && this.hasDragged) {
			// Calcola lo snap magnetico al punto del reticolo più vicino
			const snapped = this.snapToGrid(finalPlant.position_x, finalPlant.position_y);

			// Controlla se il nodo è già occupato da un'altra pianta
			const isOccupied = this.isNodeOccupied(snapped.x, snapped.y, plantId);

			if (isOccupied) {
				// Ripristina alla posizione di partenza se lo slot del reticolo è già preso
				const revertedPlants = this.plants().map(p => {
					if (p.id === plantId) {
						return { ...p, position_x: this.initialPlantX, position_y: this.initialPlantY };
					}
					return p;
				});
				this.plants.set(revertedPlants);
				this.showToast("Punto del reticolo già occupato da un'altra pianta", "info");
			} else {
				// Assegna e salva la coordinata esatta del reticolo
				const updatedPlants = this.plants().map(p => {
					if (p.id === plantId) {
						return { ...p, position_x: snapped.x, position_y: snapped.y };
					}
					return p;
				});
				this.plants.set(updatedPlants);

				try {
					await this.plantsService.updatePlant(finalPlant.id, {
						position_x: snapped.x,
						position_y: snapped.y
					});
					this.showToast("Pianta agganciata al reticolo", "success");
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
		}

		this.activeDragPlant = null;
		setTimeout(() => {
			this.hasDragged = false;
		}, 100);
	}
}
