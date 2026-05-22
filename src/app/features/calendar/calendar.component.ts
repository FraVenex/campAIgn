import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CalendarService, CalendarEvent } from '../../core/services/calendar.service';
import { LandService, Farm } from '../../core/services/land.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout.component';
import { CampCardComponent } from '../../shared/components/camp-card/camp-card.component';
import { CampDialogComponent } from '../../shared/components/camp-dialog/camp-dialog.component';
import { CampDatePickerComponent } from '../../shared/components/camp-date-picker/camp-date-picker.component';
import { CampTimePickerComponent } from '../../shared/components/camp-time-picker/camp-time-picker.component';

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  label: string;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AppLayoutComponent,
    CampCardComponent,
    CampDialogComponent,
    CampDatePickerComponent,
    CampTimePickerComponent
  ],
  template: `
    <app-layout>
      <div class="max-w-7xl mx-auto space-y-8 animate-fade-in relative pb-10">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
              <a routerLink="/dashboard" class="hover:text-camp-sage transition-colors">Dashboard</a>
              <span>/</span>
              <span class="text-camp-sage">Calendario</span>
            </nav>
            <h1 class="text-4xl font-serif text-camp-earth tracking-tight">Calendario Attività</h1>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <a 
              routerLink="/archive"
              class="px-5 py-3 bg-white border border-camp-sand/40 rounded-camp text-camp-earth hover:text-camp-sage transition-all text-sm font-bold uppercase tracking-wider shadow-camp-sm flex items-center gap-2"
            >
              <span>📂</span> Archivio attività
            </a>

            <div class="flex items-center gap-4 px-5 py-3 bg-white rounded-camp shadow-camp-sm border border-camp-sand/40 relative">
            <div class="w-10 h-10 rounded-camp bg-camp-sage/10 flex items-center justify-center text-camp-sage shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <button 
              type="button"
              (click)="$event.stopPropagation(); toggleDropdown('farmActive')"
              class="text-left bg-transparent border-none p-0 focus:ring-0 focus:outline-none cursor-pointer flex flex-col"
            >
              <p class="text-[10px] uppercase tracking-wider text-camp-olive font-bold opacity-60 leading-none mb-1">Terreno Attivo</p>
              <div class="flex items-center gap-1.5 font-serif text-camp-earth text-base">
                <span>{{ getActiveFarmName() }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-camp-olive/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            @if (openDropdown() === 'farmActive') {
              <div class="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-camp-sand rounded-xl shadow-camp-lg py-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-slide-up min-w-[200px]">
                @for (farm of farms(); track farm.id) {
                  <button
                    type="button"
                    (click)="selectActiveFarm(farm.id)"
                    class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between"
                  >
                    <span>{{ farm.name }}</span>
                    @if (selectedFarmId() === farm.id) { <span class="text-camp-sage">✓</span> }
                  </button>
                }
                @if (farms().length === 0) {
                  <p class="px-4 py-2 text-xs text-camp-olive/60 font-medium">Nessun terreno</p>
                }
              </div>
            }
          </div>
        </div>
      </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-camp-sand/40 shadow-sm">
          <div class="flex items-center gap-2">
            <button 
              (click)="navigateDate(-1)"
              class="w-10 h-10 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              (click)="setToday()"
              class="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-camp-sand text-camp-olive rounded-full hover:bg-camp-sand/20 transition-all"
            >
              Oggi
            </button>
            <button 
              (click)="navigateDate(1)"
              class="w-10 h-10 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 class="text-xl font-serif text-camp-earth tracking-tight font-medium text-center">
            {{ viewTitle() }}
          </h2>

          <div class="flex items-center gap-3 flex-wrap justify-end">
            <div class="bg-camp-sand/20 p-1 rounded-full flex gap-1 border border-camp-sand/30">
              <button 
                (click)="setView('month')"
                [class.bg-white]="currentView() === 'month'"
                [class.text-camp-earth]="currentView() === 'month'"
                [class.shadow-sm]="currentView() === 'month'"
                class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-camp-olive transition-all"
              >
                Mese
              </button>
              <button 
                (click)="setView('week')"
                [class.bg-white]="currentView() === 'week'"
                [class.text-camp-earth]="currentView() === 'week'"
                [class.shadow-sm]="currentView() === 'week'"
                class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-camp-olive transition-all"
              >
                Settimana
              </button>
              <button 
                (click)="setView('day')"
                [class.bg-white]="currentView() === 'day'"
                [class.text-camp-earth]="currentView() === 'day'"
                [class.shadow-sm]="currentView() === 'day'"
                class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-camp-olive transition-all"
              >
                Giorno
              </button>
            </div>

            <button
              (click)="openCreateModal()"
              class="px-5 py-2.5 bg-camp-sage text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-camp-olive hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md flex items-center gap-2"
            >
              <span>+</span> Attività
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="min-h-[400px] flex items-center justify-center bg-white rounded-2xl border border-camp-sand/40">
            <div class="w-12 h-12 rounded-full border-4 border-camp-sand border-t-camp-sage animate-spin"></div>
          </div>
        } @else {
          <!-- views -->
          @if (currentView() === 'month') {
            <div class="bg-white rounded-2xl border border-camp-sand/40 shadow-sm overflow-hidden flex flex-col">
              <!-- Weekday Headers -->
              <div class="grid grid-cols-7 border-b border-camp-sand/30 bg-camp-cream/20 divide-x divide-camp-sand/20">
                @for (day of weekdayLabels; track day) {
                  <div class="py-3 text-center text-xs font-bold uppercase tracking-wider text-camp-olive opacity-80">
                    {{ day }}
                  </div>
                }
              </div>

              <!-- Days Grid -->
              <div class="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-camp-sand/20 -mt-[1px] -ml-[1px]">
                @for (cell of monthDays(); track $index) {
                  <div 
                    (dragover)="allowDrop($event)"
                    (dragenter)="onDragEnterCell(cell.date)"
                    (dragleave)="onDragLeaveCell(cell.date)"
                    (drop)="onEventDropped($event, cell.date)"
                    [class.bg-camp-cream]="!cell.isCurrentMonth"
                    [class.opacity-40]="!cell.isCurrentMonth"
                    [class.bg-camp-sand]="isDragOver(cell.date)"
                    [class.bg-camp-cream]="isToday(cell.date)"
                    class="min-h-[100px] p-2 flex flex-col gap-1 transition-all group relative border-r border-b border-camp-sand/20"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span 
                        [class.bg-camp-sage]="isToday(cell.date)"
                        [class.text-white]="isToday(cell.date)"
                        [class.font-bold]="isToday(cell.date)"
                        [class.w-6]="isToday(cell.date)"
                        [class.h-6]="isToday(cell.date)"
                        [class.rounded-full]="isToday(cell.date)"
                        [class.flex]="isToday(cell.date)"
                        [class.items-center]="isToday(cell.date)"
                        [class.justify-center]="isToday(cell.date)"
                        [class.opacity-40]="!cell.isCurrentMonth"
                        class="text-xs text-camp-earth font-semibold select-none"
                      >
                        {{ cell.label }}
                      </span>
                    </div>

                    <div class="flex-1 space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                      @for (event of cell.events; track event.id) {
                        <div 
                          draggable="true"
                          (dragstart)="onDragStart($event, event)"
                          (click)="$event.stopPropagation(); openEditModal(event)"
                          [class]="getEventColorClasses(event.type)"
                          class="px-2 py-1 text-[10px] font-medium rounded-lg cursor-grab active:cursor-grabbing border shadow-sm transition-all hover:scale-[1.02] flex items-center justify-between gap-1 overflow-hidden"
                        >
                          <div class="flex items-center gap-1 min-w-0 flex-1">
                            @if (isPastEvent(event)) {
                              @switch (getEventCompletionStatus(event)) {
                                @case ('completata') { <span class="text-green-600 shrink-0">✓</span> }
                                @case ('completata_note') { <span class="text-amber-600 shrink-0">📝</span> }
                                @case ('non_completata') { <span class="text-red-600 shrink-0">✗</span> }
                              }
                            }
                            <span class="truncate pr-1">{{ event.title }}</span>
                          </div>
                          <span class="shrink-0 opacity-70">{{ getEventIcon(event.type) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (currentView() === 'week') {
            <div class="bg-white rounded-2xl border border-camp-sand/40 shadow-sm p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
                @for (day of weekDays(); track $index) {
                  <div 
                    (dragover)="allowDrop($event)"
                    (dragenter)="onDragEnterCell(day)"
                    (dragleave)="onDragLeaveCell(day)"
                    (drop)="onEventDropped($event, day)"
                    [class.bg-camp-cream]="isToday(day)"
                    [class.border-camp-sage]="isToday(day)"
                    [class.bg-camp-sand]="isDragOver(day)"
                    class="flex flex-col min-h-[300px] border border-camp-sand/30 rounded-2xl p-4 transition-all"
                  >
                    <div class="text-center pb-3 border-b border-camp-sand/20 mb-3">
                      <p class="text-[10px] font-bold text-camp-olive uppercase tracking-[0.15em] opacity-60">
                        {{ day | date: 'EEEE' }}
                      </p>
                      <h4 class="text-2xl font-serif text-camp-earth font-bold mt-0.5">
                        {{ day.getDate() }}
                      </h4>
                    </div>

                    <div class="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                      @for (event of getEventsForDate(day); track event.id) {
                        <div 
                          draggable="true"
                          (dragstart)="onDragStart($event, event)"
                          (click)="openEditModal(event)"
                          [class]="getEventColorClasses(event.type)"
                          class="p-3 text-xs font-medium rounded-xl cursor-grab active:cursor-grabbing border shadow-sm transition-all hover:translate-y-[-1px] space-y-1.5"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                              @if (isPastEvent(event)) {
                                @switch (getEventCompletionStatus(event)) {
                                  @case ('completata') { <span class="text-green-600 shrink-0">✓</span> }
                                  @case ('completata_note') { <span class="text-amber-600 shrink-0">📝</span> }
                                  @case ('non_completata') { <span class="text-red-600 shrink-0">✗</span> }
                                }
                              }
                              <span class="font-serif font-bold text-camp-earth truncate">{{ event.title }}</span>
                            </div>
                            <span>{{ getEventIcon(event.type) }}</span>
                          </div>
                          @if (event.description) {
                            <p class="text-[10px] opacity-75 line-clamp-2 leading-relaxed">
                              {{ event.description }}
                            </p>
                          }
                          <div class="text-[9px] uppercase tracking-wider opacity-60 font-bold pt-1 flex items-center gap-1">
                            <span>🕒</span>
                            <span>{{ getFormattedEventTime(event) }}</span>
                          </div>
                        </div>
                      }
                      @if (getEventsForDate(day).length === 0) {
                        <div class="h-full flex items-center justify-center text-center p-4">
                          <p class="text-[10px] text-camp-olive/40 font-bold uppercase tracking-widest leading-relaxed">
                            Nessuna Attività
                          </p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (currentView() === 'day') {
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Left side: Timeline list -->
              <div class="lg:col-span-2 flex">
                <app-camp-card 
                  title="Orario della Giornata"
                  subtitle="Timeline Attività"
                  class="w-full"
                >
                  <div class="divide-y divide-camp-sand/20 pr-2">
                    @for (hour of dayHours; track hour) {
                      <div class="flex items-start gap-4 py-4 min-h-[90px] relative">
                        <div class="w-16 text-right shrink-0">
                          <span class="text-xs font-bold text-camp-olive/60 uppercase tracking-widest leading-none block pt-0.5">
                            {{ hour }}
                          </span>
                        </div>

                        <div class="flex-1 space-y-2">
                          @for (event of getEventsForDayAndHour(currentDate(), hour); track event.id) {
                            <div 
                              (click)="openEditModal(event)"
                              [class]="getEventColorClasses(event.type)"
                              class="p-4 rounded-2xl border shadow-sm transition-all hover:scale-[1.01] cursor-pointer space-y-2"
                            >
                              <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                  @if (isPastEvent(event)) {
                                    <span [class]="'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ' + getEventStatusClass(getEventCompletionStatus(event))">
                                      {{ getEventStatusLabel(getEventCompletionStatus(event)) }}
                                    </span>
                                  }
                                  <h4 class="text-base font-serif font-bold text-camp-earth">{{ event.title }}</h4>
                                </div>
                                <span class="text-xl">{{ getEventIcon(event.type) }}</span>
                              </div>
                              @if (event.description) {
                                <p class="text-xs opacity-80 leading-relaxed font-medium">
                                  {{ event.description }}
                                </p>
                              }
                              <div class="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                <span class="flex items-center gap-1">🕒 {{ getFormattedEventTime(event) }}</span>
                                @if (event.all_day) {
                                  <span class="px-2 py-0.5 rounded-full bg-black/5">Tutto il giorno</span>
                                }
                              </div>
                            </div>
                          }
                          
                          @if (getEventsForDayAndHour(currentDate(), hour).length === 0 && !isPastDate(currentDate())) {
                            <div 
                              (click)="openCreateModalAtHour(hour)"
                              class="h-10 border border-dashed border-camp-sand/40 hover:border-camp-sage/40 hover:bg-camp-cream/10 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            >
                              <span class="text-[10px] font-bold uppercase tracking-widest text-camp-olive/30 hover:text-camp-sage/60 select-none">
                                + Aggiungi Attività
                              </span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </app-camp-card>
              </div>

              <!-- Right side: Day overview & quick notes -->
              <div class="flex flex-col gap-6">
                <app-camp-card 
                  variant="primary"
                  title="Attività in Evidenza"
                  subtitle="Riepilogo Giornaliero"
                  [icon]="'📅'"
                >
                  <div class="space-y-6 pt-2 text-white">
                    <div>
                      <p class="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Data</p>
                      <p class="text-xl font-serif text-white/95">{{ currentDate() | date: 'EEEE d MMMM yyyy' }}</p>
                    </div>

                    <div class="space-y-4">
                      @for (event of getEventsForDate(currentDate()); track event.id) {
                        <div class="flex items-start gap-3 bg-white/10 p-3.5 rounded-xl border border-white/10">
                          <span class="text-xl mt-0.5 shrink-0">{{ getEventIcon(event.type) }}</span>
                          <div>
                            <p class="font-serif font-bold text-white/95 text-sm">{{ event.title }}</p>
                            <p class="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">
                              🕒 {{ getFormattedEventTime(event) }}
                            </p>
                          </div>
                        </div>
                      }
                      @if (getEventsForDate(currentDate()).length === 0) {
                        <div class="text-center py-6 bg-white/5 rounded-xl border border-white/5">
                          <p class="text-xs text-white/40 uppercase tracking-widest font-bold">
                            Nessuna attività programmata
                          </p>
                        </div>
                      }
                    </div>
                  </div>
                </app-camp-card>

                <app-camp-card 
                  title="Consiglio di Arnaldo"
                  subtitle="Suggerimento Agronomico"
                  [icon]="'🌿'"
                >
                  <p class="text-xs text-camp-olive/80 leading-relaxed font-medium pt-2">
                    In questo periodo dell'anno, la cura degli ulivi richiede particolare attenzione all'irrigazione controllata e al monitoraggio preventivo. Cerca di programmare i trattamenti la mattina presto per massimizzare l'assorbimento ed evitare l'evaporazione causata dal caldo.
                  </p>
                </app-camp-card>
              </div>
            </div>
          }
        }


        <!-- Sezione Suggerimenti di Arnaldo -->
        <div class="space-y-5 animate-fade-in">

          @if (isLoadingSuggestions()) {
            <div class="flex items-center gap-3 p-5 bg-white rounded-2xl border border-camp-sand/40">
              <div class="w-5 h-5 rounded-full border-2 border-camp-sand border-t-camp-sage animate-spin shrink-0"></div>
              <p class="text-xs text-camp-olive/60 font-bold uppercase tracking-widest">Caricamento suggerimenti...</p>
            </div>
          } @else if (suggestedEvents().length > 0) {
            <div class="bg-white rounded-2xl border border-camp-sand/40 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-camp-sand/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-camp-sage/10 flex items-center justify-center text-camp-sage border border-camp-sage/20">
                    <span class="text-sm">👨‍🌾</span>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase font-bold tracking-widest text-camp-olive/60">Arnaldo suggerisce</p>
                    <h3 class="text-sm font-serif font-bold text-camp-earth leading-tight">
                      {{ suggestedEvents().length }} {{ suggestedEvents().length === 1 ? 'attività proposta' : 'attività proposte' }}
                    </h3>
                  </div>
                </div>
                <span class="px-3 py-1 bg-camp-sage/10 text-camp-sage text-[10px] font-bold uppercase tracking-widest rounded-full border border-camp-sage/20">
                  Da confermare
                </span>
              </div>

              <div class="divide-y divide-camp-sand/20">
                @for (suggestion of suggestedEvents(); track suggestion.id) {
                  <div class="px-6 py-5 flex flex-col md:flex-row md:items-start gap-4 hover:bg-camp-cream/20 transition-all group">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                      <span class="w-9 h-9 rounded-full bg-camp-sage/10 flex items-center justify-center text-lg shrink-0 border border-camp-sage/15 mt-0.5 group-hover:scale-110 transition-transform">
                        {{ getEventIcon(suggestion.type) }}
                      </span>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 class="text-sm font-serif font-bold text-camp-earth truncate">{{ suggestion.title }}</h4>
                          <span class="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-widest rounded-full border border-amber-200 shrink-0">
                            Arnaldo
                          </span>
                        </div>
                        <p class="text-xs text-camp-olive/70 font-medium leading-relaxed mb-2">
                          {{ suggestion.description }}
                        </p>
                        @if (suggestion.suggestion_reason) {
                          <p class="text-[10px] text-camp-sage font-bold italic leading-relaxed border-l-2 border-camp-sage/30 pl-2">
                            "{{ suggestion.suggestion_reason }}"
                          </p>
                        }
                        <div class="flex items-center gap-3 mt-2 text-[10px] text-camp-olive/50 font-bold uppercase tracking-widest">
                          <span class="flex items-center gap-1">
                            📅 {{ suggestion.start | date: 'EEE d MMM' }}
                          </span>
                          @if (!suggestion.all_day) {
                            <span class="flex items-center gap-1">
                              🕒 {{ getFormattedEventTime(suggestion) }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 pl-12 md:pl-0">
                      <button
                        (click)="onAcceptSuggestion(suggestion)"
                        [disabled]="isActionLoading()"
                        class="flex items-center gap-1.5 px-4 py-2 bg-camp-sage text-white text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-camp-olive hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Accetta
                      </button>
                      <button
                        (click)="onDismissSuggestion(suggestion)"
                        [disabled]="isActionLoading()"
                        class="flex items-center gap-1.5 px-4 py-2 bg-white text-camp-olive text-[10px] font-bold uppercase tracking-wider rounded-full border border-camp-sand hover:bg-camp-sand/30 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Ignora
                      </button>
                      <button
                        (click)="onEditSuggestion(suggestion)"
                        [disabled]="isActionLoading()"
                        class="w-8 h-8 flex items-center justify-center rounded-full border border-camp-sand text-camp-olive hover:bg-camp-sand/30 hover:scale-110 transition-all disabled:opacity-50"
                        title="Modifica prima di accettare"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </app-layout>

    @if (showFormModal()) {
      <app-camp-dialog
        [title]="editingEvent() ? 'Modifica Attività' : 'Nuova Attività'"
        [subtitle]="modalSubtitle()"
        [icon]="editingEvent() ? '✍️' : '📅'"
        (close)="closeFormModal()"
      >
        <div class="p-6 md:p-8 space-y-6">
          @if (isEditingPastEvent()) {
            <div class="space-y-6">
              <div class="bg-camp-cream/20 p-4 rounded-xl border border-camp-sand/40 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-camp-sand/20 text-camp-earth border border-camp-sand/40">
                    {{ getEventIcon(editingEvent()?.type || '') }} {{ getEventTagLabel(editingEvent()?.type || '') }}
                  </span>
                  <span class="text-xs text-camp-olive/60 font-bold uppercase tracking-widest">
                    {{ editingEvent()?.start | date: 'dd MMM yyyy, HH:mm' }}
                  </span>
                </div>
                <h3 class="text-lg font-serif font-bold text-camp-earth">{{ editingEvent()?.title }}</h3>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-2.5">
                  Stato di Completamento
                </label>
                <div class="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    (click)="formPastStatus.set('completata')"
                    [class.bg-green-50]="formPastStatus() === 'completata'"
                    [class.text-green-700]="formPastStatus() === 'completata'"
                    [class.border-green-300]="formPastStatus() === 'completata'"
                    [class.bg-white]="formPastStatus() !== 'completata'"
                    [class.text-camp-olive]="formPastStatus() !== 'completata'"
                    [class.border-camp-sand]="formPastStatus() !== 'completata'"
                    class="py-3 px-4 border rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>✓</span> Completata
                  </button>
                  <button
                    type="button"
                    (click)="formPastStatus.set('completata_note')"
                    [class.bg-amber-50]="formPastStatus() === 'completata_note'"
                    [class.text-amber-700]="formPastStatus() === 'completata_note'"
                    [class.border-amber-300]="formPastStatus() === 'completata_note'"
                    [class.bg-white]="formPastStatus() !== 'completata_note'"
                    [class.text-camp-olive]="formPastStatus() !== 'completata_note'"
                    [class.border-camp-sand]="formPastStatus() !== 'completata_note'"
                    class="py-3 px-4 border rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>📝</span> Con Note
                  </button>
                  <button
                    type="button"
                    (click)="formPastStatus.set('non_completata')"
                    [class.bg-red-50]="formPastStatus() === 'non_completata'"
                    [class.text-red-700]="formPastStatus() === 'non_completata'"
                    [class.border-red-300]="formPastStatus() === 'non_completata'"
                    [class.bg-white]="formPastStatus() !== 'non_completata'"
                    [class.text-camp-olive]="formPastStatus() !== 'non_completata'"
                    [class.border-camp-sand]="formPastStatus() !== 'non_completata'"
                    class="py-3 px-4 border rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>✗</span> Non Svolta
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                  Note di Svolgimento
                </label>
                <textarea 
                  [value]="formDescription()" 
                  (input)="onFormInput('description', $event)"
                  placeholder="Inserisci note utili sull'attività svolta..."
                  rows="4"
                  class="w-full bg-camp-cream/10 border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all resize-none placeholder-camp-olive/30 shadow-inner"
                ></textarea>
              </div>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                    Titolo Attività
                  </label>
                  <div class="relative">
                    <input 
                      type="text" 
                      [value]="formTitle()" 
                      (input)="onFormInput('title', $event)"
                      (focus)="openDropdown.set('titlePreset')"
                      placeholder="Esempio: Potatura ulivi"
                      class="w-full bg-camp-cream/10 border border-camp-sand rounded-xl pl-4 pr-10 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all placeholder-camp-olive/30 shadow-inner"
                    />
                    <button 
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('titlePreset')"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-camp-olive/50 hover:text-camp-sage transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    @if (openDropdown() === 'titlePreset') {
                      <div (click)="$event.stopPropagation()" class="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-camp-sand rounded-xl shadow-camp-lg max-h-60 overflow-y-auto py-1.5 animate-slide-up custom-scrollbar">
                        @for (preset of titlePresets(); track preset) {
                          <button
                            type="button"
                            (click)="selectPresetTitle(preset)"
                            class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{{ preset }}</span>
                            @if (formTitle() === preset) {
                              <span class="text-camp-sage text-xs">✓</span>
                            }
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                    Tipo Attività (Tag)
                  </label>
                  <div class="relative">
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('type')"
                      class="w-full bg-white border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span>{{ getSelectedTypeLabel() }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50 transition-transform duration-200" [class.rotate-180]="openDropdown() === 'type'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    @if (openDropdown() === 'type') {
                      <div class="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-camp-sand rounded-xl shadow-camp-lg py-1.5 animate-slide-up">
                        <button
                          type="button"
                          (click)="selectType('maintenance')"
                          class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>🔧 Manutenzione</span>
                          @if (formType() === 'maintenance') { <span class="text-camp-sage">✓</span> }
                        </button>
                        <button
                          type="button"
                          (click)="selectType('harvest')"
                          class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>🚜 Raccolta</span>
                          @if (formType() === 'harvest') { <span class="text-camp-sage">✓</span> }
                        </button>
                        <button
                          type="button"
                          (click)="selectType('irrigation')"
                          class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>💧 Irrigazione</span>
                          @if (formType() === 'irrigation') { <span class="text-camp-sage">✓</span> }
                        </button>
                        <button
                          type="button"
                          (click)="selectType('other')"
                          class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>🌿 Altro</span>
                          @if (formType() === 'other') { <span class="text-camp-sage">✓</span> }
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                    Descrizione
                  </label>
                  <textarea 
                    [value]="formDescription()" 
                    (input)="onFormInput('description', $event)"
                    placeholder="Dettagli dell'attività..."
                    rows="4"
                    class="w-full bg-camp-cream/10 border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all resize-none placeholder-camp-olive/30 shadow-inner"
                  ></textarea>
                </div>
              </div>

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="relative">
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                      Data Inizio
                    </label>
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('startDate')"
                      class="w-full bg-white border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span>{{ formatDateLabel(formStartDate()) }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>

                    @if (openDropdown() === 'startDate') {
                      <div class="absolute z-50 left-0 mt-1.5">
                        <app-camp-date-picker
                          [selectedDate]="formStartDate()"
                          [disablePast]="true"
                          (dateSelected)="selectPickerDate($event, 'start')"
                        />
                      </div>
                    }
                  </div>
                  
                  <div class="relative">
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                      Ora Inizio
                    </label>
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('startTime')"
                      class="w-full bg-white border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span>{{ formStartTime() }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    @if (openDropdown() === 'startTime') {
                      <app-camp-time-picker
                        [selectedTime]="formStartTime()"
                        (timeSelected)="selectTime($event, 'start')"
                      />
                    }
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="relative">
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                      Data Fine
                    </label>
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('endDate')"
                      class="w-full bg-white border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span>{{ formatDateLabel(formEndDate()) }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>

                    @if (openDropdown() === 'endDate') {
                      <div class="absolute z-50 left-0 mt-1.5">
                        <app-camp-date-picker
                          [selectedDate]="formEndDate()"
                          [disablePast]="true"
                          (dateSelected)="selectPickerDate($event, 'end')"
                        />
                      </div>
                    }
                  </div>

                  <div class="relative">
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-camp-olive/60 mb-1.5">
                      Ora Fine
                    </label>
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); toggleDropdown('endTime')"
                      class="w-full bg-white border border-camp-sand rounded-xl px-4 py-3 text-sm text-camp-earth focus:outline-none focus:border-camp-sage transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span>{{ formEndTime() }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-camp-olive/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    @if (openDropdown() === 'endTime') {
                      <app-camp-time-picker
                        [selectedTime]="formEndTime()"
                        (timeSelected)="selectTime($event, 'end')"
                      />
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <div footer class="px-8 py-5 border-t border-camp-sand/30 flex items-center justify-between bg-camp-cream/10 gap-4">
          <div>
            @if (editingEvent()) {
              <button
                (click)="onDeleteEvent()"
                class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-full transition-all border border-red-200 cursor-pointer"
              >
                Elimina Attività
              </button>
            }
          </div>

          <div class="flex items-center gap-3">
            <button
              (click)="closeFormModal()"
              class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-camp-olive hover:bg-camp-sand/30 rounded-full transition-all border border-camp-sand cursor-pointer"
            >
              Annulla
            </button>
            <button
              [disabled]="!isFormValid()"
              (click)="onSaveEvent()"
              class="px-6 py-2.5 bg-camp-sage hover:bg-camp-olive text-white text-xs font-bold uppercase tracking-wider rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-camp-sage disabled:scale-100 cursor-pointer"
            >
              Salva
            </button>
          </div>
        </div>
      </app-camp-dialog>
    }
  `,
  styles: []
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private landService = inject(LandService);

  readonly weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  readonly dayHours = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  events = signal<CalendarEvent[]>([]);
  farms = signal<Farm[]>([]);
  selectedFarmId = signal<string | null>(null);
  isLoading = signal(true);
  isLoadingSuggestions = signal(true);
  suggestedEvents = signal<CalendarEvent[]>([]);
  isActionLoading = signal(false);

  currentDate = signal<Date>(new Date());
  currentView = signal<'month' | 'week' | 'day'>('month');

  showFormModal = signal(false);
  editingEvent = signal<CalendarEvent | null>(null);

  formTitle = signal('');
  formDescription = signal('');
  formType = signal<'maintenance' | 'harvest' | 'irrigation' | 'other'>('maintenance');
  formFarmId = signal('');
  formAllDay = signal(false);
  formStartDate = signal('');
  formStartTime = signal('09:00');
  formEndDate = signal('');
  formEndTime = signal('10:00');

  draggedEvent = signal<CalendarEvent | null>(null);
  hoveredCellDateStr = signal<string | null>(null);

  openDropdown = signal<'farm' | 'type' | 'farmActive' | 'titlePreset' | 'startDate' | 'endDate' | 'startTime' | 'endTime' | null>(null);

  isEditingPastEvent = signal(false);
  formPastStatus = signal<'completata' | 'completata_note' | 'non_completata'>('non_completata');

  pastEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeFarmId = this.selectedFarmId();
    return this.events().filter(e => {
      if (e.farm_id !== activeFarmId) return false;
      return new Date(e.end) < today;
    });
  });

  upcomingEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeFarmId = this.selectedFarmId();
    return this.events().filter(e => {
      if (e.farm_id !== activeFarmId) return false;
      return new Date(e.end) >= today;
    });
  });

  titlePresets = computed(() => {
    const type = this.formType();
    switch (type) {
      case 'maintenance':
        return [
          'Potatura ulivi',
          'Concimazione terreno',
          'Trattamento fitosanitario',
          'Sfalcio erba interfilare',
          'Controllo visivo fitopatologico',
          'Pulizia dei fossi di scolo'
        ];
      case 'harvest':
        return [
          'Raccolta olive (manuale)',
          'Raccolta olive con agevolatori',
          'Trasporto cassette al frantoio',
          'Molitura olive e stoccaggio olio'
        ];
      case 'irrigation':
        return [
          'Irrigazione programmata a goccia',
          'Manutenzione ala gocciolante',
          'Pulizia filtri irrigazione',
          'Controllo livello cisterna'
        ];
      case 'other':
      default:
        return [
          'Analisi chimica del suolo',
          'Sopralluogo agronomico',
          'Pianificazione trattamenti',
          'Manutenzione attrezzature'
        ];
    }
  });

  isFormValid = computed(() => {
    if (this.isEditingPastEvent()) {
      return true;
    }

    const title = this.formTitle().trim();
    if (!title) return false;

    const startD = this.formStartDate();
    const endD = this.formEndDate();
    if (!startD || !endD) return false;

    const startDateTimeStr = `${startD}T${this.formStartTime()}:00`;
    const endDateTimeStr = `${endD}T${this.formEndTime()}:00`;
    const startMs = new Date(startDateTimeStr).getTime();
    const endMs = new Date(endDateTimeStr).getTime();

    if (isNaN(startMs) || isNaN(endMs) || startMs > endMs) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.editingEvent()) {
      if (startMs < today.getTime()) return false;
    }

    return true;
  });

  modalSubtitle = computed(() => {
    return this.editingEvent() 
      ? "Aggiorna i dettagli dell'evento" 
      : "Crea un nuovo evento programmato";
  });

  viewTitle = computed(() => {
    const d = this.currentDate();
    const view = this.currentView();

    if (view === 'month') {
      return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();
    } else if (view === 'week') {
      const days = this.getWeekDays(d);
      const start = days[0];
      const end = days[6];
      if (start.getMonth() === end.getMonth()) {
        const month = start.toLocaleDateString('it-IT', { month: 'long' });
        return `${start.getDate()} - ${end.getDate()} ${month} ${start.getFullYear()}`.toUpperCase();
      } else {
        const startMonth = start.toLocaleDateString('it-IT', { month: 'short' });
        const endMonth = end.toLocaleDateString('it-IT', { month: 'short' });
        return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`.toUpperCase();
      }
    } else {
      return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    }
  });

  monthDays = computed<DayCell[]>(() => {
    const d = this.currentDate();
    const evs = this.events();
    const activeFarmId = this.selectedFarmId();
    const filteredEvents = evs.filter(e => e.farm_id === activeFarmId);
    return this.generateMonthDaysGrid(d, filteredEvents);
  });

  weekDays = computed<Date[]>(() => {
    return this.getWeekDays(this.currentDate());
  });

  async ngOnInit() {
    await this.loadFarms();
    await this.loadEvents();
    await this.loadSuggestions();
  }

  async loadSuggestions() {
    this.isLoadingSuggestions.set(true);
    try {
      const list = await this.calendarService.getSuggestedEvents();
      this.suggestedEvents.set(list);
    } catch (e) {
      console.error('[CalendarComponent] Errore caricamento suggerimenti:', e);
    } finally {
      this.isLoadingSuggestions.set(false);
    }
  }

  async onAcceptSuggestion(suggestion: CalendarEvent) {
    if (!suggestion.id) return;
    this.isActionLoading.set(true);
    try {
      await this.calendarService.acceptSuggestion(suggestion.id);
      await this.loadEvents();
      await this.loadSuggestions();
    } catch (e) {
      console.error('[CalendarComponent] Errore accettazione suggerimento:', e);
    } finally {
      this.isActionLoading.set(false);
    }
  }

  async onDismissSuggestion(suggestion: CalendarEvent) {
    if (!suggestion.id) return;
    this.isActionLoading.set(true);
    try {
      await this.calendarService.dismissSuggestion(suggestion.id);
      await this.loadSuggestions();
    } catch (e) {
      console.error('[CalendarComponent] Errore rifiuto suggerimento:', e);
    } finally {
      this.isActionLoading.set(false);
    }
  }

  onEditSuggestion(suggestion: CalendarEvent) {
    this.openEditModal(suggestion);
  }

  async loadFarms() {
    try {
      const list = await this.landService.getFarms();
      this.farms.set(list);
      if (list && list.length > 0) {
        this.selectedFarmId.set(list[0].id || null);
        this.formFarmId.set(list[0].id || '');
      }
    } catch (e) {
      console.error('[CalendarComponent] Errore caricamento terreni:', e);
    }
  }

  async loadEvents() {
    this.isLoading.set(true);
    try {
      const list = await this.calendarService.getEvents();
      this.events.set(list);
    } catch (e) {
      console.error('[CalendarComponent] Errore caricamento eventi:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFarmChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedFarmId.set(val || null);
  }

  setView(view: 'month' | 'week' | 'day') {
    this.currentView.set(view);
  }

  setToday() {
    this.currentDate.set(new Date());
  }

  navigateDate(direction: number) {
    const d = new Date(this.currentDate());
    const view = this.currentView();

    if (view === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else if (view === 'week') {
      d.setDate(d.getDate() + (direction * 7));
    } else {
      d.setDate(d.getDate() + direction);
    }
    this.currentDate.set(d);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  isPastDate(date: Date | string): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() < today.getTime();
  }

  isPastEvent(event: CalendarEvent): boolean {
    if (!event || !event.end) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(event.end).getTime() < today.getTime();
  }

  getEventCompletionStatus(event: CalendarEvent): 'completata' | 'completata_note' | 'non_completata' {
    const desc = event.description || '';
    if (desc.startsWith('[STATUS:completata]')) return 'completata';
    if (desc.startsWith('[STATUS:completata_note]')) return 'completata_note';
    if (desc.startsWith('[STATUS:non_completata]')) return 'non_completata';
    return 'non_completata';
  }

  getEventNotes(event: CalendarEvent): string {
    const desc = event.description || '';
    return desc.replace(/^\[STATUS:(completata|completata_note|non_completata)\]\s*/, '');
  }

  getEventStatusLabel(status: 'completata' | 'completata_note' | 'non_completata'): string {
    switch (status) {
      case 'completata': return 'Completata';
      case 'completata_note': return 'Completata con note';
      case 'non_completata': return 'Non completata';
      default: return 'Non completata';
    }
  }

  getEventStatusClass(status: 'completata' | 'completata_note' | 'non_completata'): string {
    switch (status) {
      case 'completata': return 'bg-green-50 text-green-700 border border-green-200';
      case 'completata_note': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'non_completata': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  }

  getEventTagLabel(type: string): string {
    switch (type) {
      case 'maintenance': return 'Manutenzione';
      case 'harvest': return 'Raccolta';
      case 'irrigation': return 'Irrigazione';
      default: return 'Altro';
    }
  }

  isDragOver(date: Date): boolean {
    const current = this.hoveredCellDateStr();
    if (!current) return false;
    return date.toDateString() === current;
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    const target = date.toDateString();
    const activeFarmId = this.selectedFarmId();
    return this.events().filter(e => {
      if (e.farm_id !== activeFarmId) return false;
      const start = new Date(e.start);
      return start.toDateString() === target;
    });
  }

  getEventsForDayAndHour(date: Date, hourStr: string): CalendarEvent[] {
    const target = date.toDateString();
    const activeFarmId = this.selectedFarmId();
    const targetHour = parseInt(hourStr.split(':')[0], 10);

    return this.events().filter(e => {
      if (e.farm_id !== activeFarmId) return false;
      const start = new Date(e.start);
      if (start.toDateString() !== target) return false;
      if (e.all_day) return hourStr === '08:00';
      return start.getHours() === targetHour;
    });
  }

  getFormattedEventTime(event: CalendarEvent): string {
    if (event.all_day) return 'Tutto il giorno';
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startStr = start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'maintenance': return '🔧';
      case 'harvest': return '🚜';
      case 'irrigation': return '💧';
      default: return '🌿';
    }
  }

  getEventColorClasses(type: string): string {
    switch (type) {
      case 'maintenance':
        return 'bg-camp-sage/10 text-camp-olive border-camp-sage/30 hover:bg-camp-sage/20';
      case 'harvest':
        return 'bg-camp-accent/10 text-camp-earth border-camp-accent/30 hover:bg-camp-accent/20';
      case 'irrigation':
        return 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
      default:
        return 'bg-camp-sand/20 text-camp-earth border-camp-sand/40 hover:bg-camp-sand/30';
    }
  }

  generateMonthDaysGrid(date: Date, evs: CalendarEvent[]): DayCell[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const cells: DayCell[] = [];
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: prevDate,
        isCurrentMonth: false,
        label: prevDate.getDate().toString(),
        events: []
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      cells.push({
        date: currDate,
        isCurrentMonth: true,
        label: i.toString(),
        events: []
      });
    }
    
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      cells.push({
        date: nextDate,
        isCurrentMonth: false,
        label: i.toString(),
        events: []
      });
    }

    cells.forEach(cell => {
      const cellDateStr = cell.date.toDateString();
      cell.events = evs.filter(e => new Date(e.start).toDateString() === cellDateStr);
    });
    
    return cells;
  }

  getWeekDays(date: Date): Date[] {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // drag & drop events
  onDragStart(event: DragEvent, calendarEvent: CalendarEvent) {
    if (!event.dataTransfer || !calendarEvent.id) return;
    this.draggedEvent.set(calendarEvent);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', calendarEvent.id);
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  onDragEnterCell(date: Date) {
    this.hoveredCellDateStr.set(date.toDateString());
  }

  onDragLeaveCell(date: Date) {
    if (this.hoveredCellDateStr() === date.toDateString()) {
      this.hoveredCellDateStr.set(null);
    }
  }

  async onEventDropped(event: DragEvent, targetDate: Date) {
    event.preventDefault();
    this.hoveredCellDateStr.set(null);

    const activeDragged = this.draggedEvent();
    if (!activeDragged || !activeDragged.id) return;
    if (this.isPastDate(targetDate) || this.isPastEvent(activeDragged)) return;

    try {
      const duration = new Date(activeDragged.end).getTime() - new Date(activeDragged.start).getTime();
      const origStart = new Date(activeDragged.start);
      
      const newStart = new Date(targetDate);
      newStart.setHours(origStart.getHours());
      newStart.setMinutes(origStart.getMinutes());
      newStart.setSeconds(0);
      newStart.setMilliseconds(0);

      const newEnd = new Date(newStart.getTime() + duration);

      await this.calendarService.updateEvent(activeDragged.id, {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      });

      await this.loadEvents();
    } catch (e) {
      console.error('[CalendarComponent] Errore aggiornamento drop:', e);
    } finally {
      this.draggedEvent.set(null);
    }
  }

  openCreateModal() {
    this.editingEvent.set(null);
    this.openDropdown.set(null);
    this.isEditingPastEvent.set(false);
    
    const today = new Date();
    const yearStr = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

    this.formTitle.set('');
    this.formDescription.set('');
    this.formType.set('maintenance');
    
    const activeFarmId = this.selectedFarmId() || (this.farms().length > 0 ? this.farms()[0].id || '' : '');
    this.formFarmId.set(activeFarmId);
    
    this.formAllDay.set(false);
    this.formStartDate.set(dateStr);
    this.formStartTime.set('09:00');
    this.formEndDate.set(dateStr);
    this.formEndTime.set('10:00');
    
    this.showFormModal.set(true);
  }

  openCreateModalAtHour(hourStr: string) {
    this.editingEvent.set(null);
    this.openDropdown.set(null);
    this.isEditingPastEvent.set(false);
    
    const targetDate = this.currentDate();
    const yearStr = targetDate.getFullYear();
    const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

    this.formTitle.set('');
    this.formDescription.set('');
    this.formType.set('maintenance');
    
    const activeFarmId = this.selectedFarmId() || (this.farms().length > 0 ? this.farms()[0].id || '' : '');
    this.formFarmId.set(activeFarmId);
    
    this.formAllDay.set(false);
    this.formStartDate.set(dateStr);
    this.formStartTime.set(hourStr);
    this.formEndDate.set(dateStr);
    
    const endHour = parseInt(hourStr.split(':')[0], 10) + 1;
    const endHourStr = String(endHour).padStart(2, '0') + ':00';
    this.formEndTime.set(endHourStr);
    
    this.showFormModal.set(true);
  }

  openEditModal(event: CalendarEvent) {
    this.editingEvent.set(event);
    this.openDropdown.set(null);
    
    const isPast = this.isPastEvent(event);
    this.isEditingPastEvent.set(isPast);
    
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    const getFormattedDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const getFormattedTime = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    };

    this.formTitle.set(event.title);
    this.formType.set(event.type);
    this.formFarmId.set(event.farm_id);
    this.formAllDay.set(event.all_day);
    this.formStartDate.set(getFormattedDate(start));
    this.formStartTime.set(getFormattedTime(start));
    this.formEndDate.set(getFormattedDate(end));
    this.formEndTime.set(getFormattedTime(end));

    if (isPast) {
      const status = this.getEventCompletionStatus(event);
      this.formPastStatus.set(status);
      this.formDescription.set(this.getEventNotes(event));
    } else {
      this.formDescription.set(event.description || '');
    }
    
    this.showFormModal.set(true);
  }

  closeFormModal() {
    this.showFormModal.set(false);
    this.editingEvent.set(null);
    this.openDropdown.set(null);
  }

  onFormInput(field: string, event: Event) {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    switch (field) {
      case 'title':
        this.formTitle.set(val);
        break;
      case 'description':
        this.formDescription.set(val);
        break;
      case 'start_date':
        this.formStartDate.set(val);
        break;
      case 'start_time':
        this.formStartTime.set(val);
        break;
      case 'end_date':
        this.formEndDate.set(val);
        break;
      case 'end_time':
        this.formEndTime.set(val);
        break;
    }
  }

  onFormSelect(field: string, event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    switch (field) {
      case 'type':
        this.formType.set(val as any);
        break;
      case 'farm_id':
        this.formFarmId.set(val);
        break;
    }
  }

  onCheckboxChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.formAllDay.set(checked);
  }

  async onSaveEvent() {
    const activeEdit = this.editingEvent();
    const isPast = this.isEditingPastEvent();

    let payload: Omit<CalendarEvent, 'user_id' | 'id'>;

    if (isPast && activeEdit) {
      const statusTag = `[STATUS:${this.formPastStatus()}]`;
      const finalDescription = `${statusTag} ${this.formDescription().trim()}`.trim();
      payload = {
        farm_id: activeEdit.farm_id,
        title: activeEdit.title,
        description: finalDescription,
        type: activeEdit.type,
        start: activeEdit.start,
        end: activeEdit.end,
        all_day: activeEdit.all_day,
        source: activeEdit.source || 'user',
        status: activeEdit.status || 'confirmed'
      };
    } else {
      const title = this.formTitle().trim();
      if (!title) return;

      const type = this.formType();
      const farmId = this.formFarmId() || this.selectedFarmId() || (this.farms().length > 0 ? this.farms()[0].id || '' : '');
      const description = this.formDescription().trim() || null;
      const allDay = this.formAllDay();

      let startIso: string;
      let endIso: string;

      if (allDay) {
        const s = new Date(this.formStartDate());
        s.setHours(0, 0, 0, 0);
        const e = new Date(this.formEndDate());
        e.setHours(23, 59, 59, 999);
        startIso = s.toISOString();
        endIso = e.toISOString();
      } else {
        const startDateTimeStr = `${this.formStartDate()}T${this.formStartTime()}:00`;
        const endDateTimeStr = `${this.formEndDate()}T${this.formEndTime()}:00`;
        startIso = new Date(startDateTimeStr).toISOString();
        endIso = new Date(endDateTimeStr).toISOString();
      }

      payload = {
        farm_id: farmId,
        title: title,
        description: description,
        type: type,
        start: startIso,
        end: endIso,
        all_day: allDay,
        source: activeEdit?.source || 'user',
        status: 'confirmed'
      };
    }

    try {
      this.isLoading.set(true);
      if (activeEdit && activeEdit.id) {
        await this.calendarService.updateEvent(activeEdit.id, payload);
      } else {
        await this.calendarService.createEvent(payload);
      }
      await this.loadEvents();
      await this.loadSuggestions();
      this.closeFormModal();
    } catch (e) {
      console.error('[CalendarComponent] Errore salvataggio attività:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDeleteEvent() {
    const activeEdit = this.editingEvent();
    if (!activeEdit || !activeEdit.id) return;

    try {
      this.isLoading.set(true);
      await this.calendarService.deleteEvent(activeEdit.id);
      await this.loadEvents();
      await this.loadSuggestions();
      this.closeFormModal();
    } catch (e) {
      console.error('[CalendarComponent] Errore cancellazione attività:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.openDropdown.set(null);
    }
  }

  toggleDropdown(dropdown: 'farm' | 'type' | 'farmActive' | 'titlePreset' | 'startDate' | 'endDate' | 'startTime' | 'endTime') {
    if (this.openDropdown() === dropdown) {
      this.openDropdown.set(null);
    } else {
      this.openDropdown.set(dropdown);
    }
  }

  selectActiveFarm(farmId: string | null | undefined) {
    this.selectedFarmId.set(farmId || null);
    this.openDropdown.set(null);
  }

  selectType(type: 'maintenance' | 'harvest' | 'irrigation' | 'other') {
    this.formType.set(type);
    this.openDropdown.set(null);
  }

  selectFarm(farmId: string | undefined) {
    this.formFarmId.set(farmId || '');
    this.openDropdown.set(null);
  }

  selectPresetTitle(title: string) {
    this.formTitle.set(title);
    this.openDropdown.set(null);
  }

  formatDateLabel(dateStr: string): string {
    if (!dateStr) return 'Seleziona data';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  selectPickerDate(dateStr: string, type: 'start' | 'end') {
    if (type === 'start') {
      this.formStartDate.set(dateStr);
      if (this.formEndDate() && dateStr > this.formEndDate()) {
        this.formEndDate.set(dateStr);
      }
    } else {
      this.formEndDate.set(dateStr);
      if (this.formStartDate() && dateStr < this.formStartDate()) {
        this.formStartDate.set(dateStr);
      }
    }
    this.openDropdown.set(null);
  }


  selectTime(time: string, type: 'start' | 'end') {
    if (type === 'start') {
      this.formStartTime.set(time);
      const startDateTimeStr = `${this.formStartDate()}T${time}:00`;
      const endDateTimeStr = `${this.formEndDate()}T${this.formEndTime()}:00`;
      if (new Date(startDateTimeStr).getTime() > new Date(endDateTimeStr).getTime()) {
        this.formEndDate.set(this.formStartDate());
        this.formEndTime.set(time);
      }
    } else {
      this.formEndTime.set(time);
      const startDateTimeStr = `${this.formStartDate()}T${this.formStartTime()}:00`;
      const endDateTimeStr = `${this.formEndDate()}T${time}:00`;
      if (new Date(startDateTimeStr).getTime() > new Date(endDateTimeStr).getTime()) {
        this.formStartDate.set(this.formEndDate());
        this.formStartTime.set(time);
      }
    }
    this.openDropdown.set(null);
  }


  getSelectedTypeLabel(): string {
    const type = this.formType();
    switch (type) {
      case 'maintenance': return 'Manutenzione';
      case 'harvest': return 'Raccolta';
      case 'irrigation': return 'Irrigazione';
      case 'other': return 'Altro';
      default: return 'Seleziona tipo';
    }
  }

  getSelectedFarmLabel(): string {
    const farmId = this.formFarmId();
    const farm = this.farms().find(f => f.id === farmId);
    return farm ? farm.name : 'Seleziona terreno';
  }

  getActiveFarmName(): string {
    const farmId = this.selectedFarmId();
    const farm = this.farms().find(f => f.id === farmId);
    return farm ? farm.name : 'Tutti i terreni';
  }
}
