import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout.component';
import { CampCardComponent } from '../../shared/components/camp-card/camp-card.component';
import { CampDialogComponent } from '../../shared/components/camp-dialog/camp-dialog.component';
import { CalendarService, CalendarEvent } from '../../core/services/calendar.service';
import { LandService, Farm } from '../../core/services/land.service';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AppLayoutComponent,
    CampCardComponent,
    CampDialogComponent
  ],
  template: `
    <app-layout>
      <div class="max-w-7xl mx-auto space-y-8 animate-fade-in relative pb-10">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav class="flex items-center gap-2 text-xs text-camp-olive mb-1 uppercase tracking-widest font-bold">
              <a routerLink="/dashboard" class="hover:text-camp-sage transition-colors">Dashboard</a>
              <span>/</span>
              <span class="text-camp-sage">Archivio attività</span>
            </nav>
            <h1 class="text-4xl font-serif text-camp-earth tracking-tight">Archivio Attività</h1>
          </div>

          <div class="flex items-center gap-4 px-5 py-3 bg-white rounded-camp shadow-camp-sm border border-camp-sand/40 relative">
            <div class="w-10 h-10 rounded-camp bg-camp-sage/10 flex items-center justify-center text-camp-sage shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <button 
              type="button"
              (click)="$event.stopPropagation(); toggleDropdown()"
              class="flex items-center gap-2 text-camp-earth font-bold text-sm tracking-wide uppercase hover:text-camp-sage transition-colors"
            >
              <span>{{ getActiveFarmName() }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-200" [class.rotate-180]="showFarmDropdown()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            @if (showFarmDropdown()) {
              <div class="absolute right-0 top-full mt-2 w-64 bg-white rounded-camp shadow-camp border border-camp-sand/40 py-2 z-50 animate-fade-in">
                @for (farm of farms(); track farm.id) {
                  <button 
                    (click)="selectActiveFarm(farm.id)"
                    class="w-full text-left px-4 py-3 text-sm transition-all hover:bg-camp-cream flex items-center justify-between"
                    [class.bg-camp-cream]="selectedFarmId() === farm.id"
                    [class.text-camp-sage]="selectedFarmId() === farm.id"
                    [class.font-bold]="selectedFarmId() === farm.id"
                  >
                    <span>{{ farm.name }}</span>
                    @if (selectedFarmId() === farm.id) {
                      <span class="text-xs">✓</span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <div class="space-y-6">

          <app-camp-card class="block">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-serif text-camp-earth">Registro Attività Passate</h3>
                <span class="text-xs px-2.5 py-1 bg-camp-sand/30 text-camp-earth rounded-full font-medium">
                  {{ pastEvents().length }} attività storiche
                </span>
              </div>

              @if (isLoading()) {
                <div class="flex flex-col items-center justify-center py-12 space-y-4">
                  <div class="w-8 h-8 border-4 border-camp-sage border-t-transparent rounded-full animate-spin"></div>
                  <p class="text-sm text-camp-olive">Caricamento attività in corso...</p>
                </div>
              } @else {
                <div class="overflow-x-auto rounded-camp border border-camp-sand/30 shadow-sm bg-white">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-camp-cream/20 border-b border-camp-sand/30 text-xs font-bold uppercase tracking-wider text-camp-olive">
                        <th class="py-4 px-4 font-bold">Titolo</th>
                        <th class="py-4 px-4 font-bold">Descrizione</th>
                        <th class="py-4 px-4 font-bold">Inizio</th>
                        <th class="py-4 px-4 font-bold">Fine</th>
                        <th class="py-4 px-4 font-bold">Stato</th>
                        <th class="py-4 px-4 font-bold text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-camp-sand/20 text-sm text-camp-earth">
                      @for (event of pastEvents(); track event.id) {
                        <tr class="hover:bg-camp-cream/5 transition-all">
                          <td class="py-4 px-4">
                            <div class="flex items-center gap-2 font-medium">
                              <span>{{ getEventIcon(event.type) }}</span>
                              <span>{{ event.title }}</span>
                            </div>
                          </td>
                          <td class="py-4 px-4 text-camp-olive truncate max-w-[200px]" [title]="getEventNotes(event)">
                            {{ getEventNotes(event) || '-' }}
                          </td>
                          <td class="py-4 px-4 whitespace-nowrap text-xs text-camp-olive">
                            {{ event.start | date:'dd/MM/yyyy HH:mm' }}
                          </td>
                          <td class="py-4 px-4 whitespace-nowrap text-xs text-camp-olive">
                            {{ event.end | date:'dd/MM/yyyy HH:mm' }}
                          </td>
                          <td class="py-4 px-4 whitespace-nowrap">
                            <div class="flex items-center gap-1.5">
                              <span class="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide {{ getEventStatusClass(getEventCompletionStatus(event)) }}">
                                {{ getEventStatusLabel(getEventCompletionStatus(event)) }}
                              </span>
                              @if (getEventCompletionStatus(event) === 'completata_note') {
                                <button 
                                  (click)="openNoteDialog(event)" 
                                  type="button" 
                                  class="w-5 h-5 rounded-full bg-camp-sand/40 flex items-center justify-center text-xs text-camp-earth hover:bg-camp-sand/70 hover:text-camp-sage transition-all shadow-sm"
                                  title="Leggi note"
                                >
                                  📝
                                </button>
                              }
                            </div>
                          </td>
                          <td class="py-4 px-4 text-right">
                            <button 
                              (click)="openEditModal(event)" 
                              class="inline-flex items-center justify-center px-3 py-1.5 bg-camp-sage/10 text-camp-sage border border-camp-sage/20 rounded-camp text-xs font-bold hover:bg-camp-sage/20 hover:border-camp-sage/30 transition-all shadow-sm"
                            >
                              Gestisci
                            </button>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="6" class="text-center py-16 text-camp-olive">
                            <span class="text-4xl block mb-2">📂</span>
                            <h4 class="text-base font-serif text-camp-earth mb-0.5">Nessuna attività passata</h4>
                            <p class="text-xs text-camp-olive/80 max-w-sm mx-auto">Non ci sono ancora attività registrate nel passato per questo terreno.</p>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </app-camp-card>
        </div>
      </div>
    </app-layout>

    @if (showEditModal()) {
      <app-camp-dialog 
        (close)="closeEditModal()"
        title="Gestisci Attività Passata"
      >
        <div class="space-y-6">
          <div>
            <h4 class="text-xs text-camp-olive uppercase tracking-widest font-bold mb-1">Attività</h4>
            <p class="text-lg font-serif text-camp-earth">{{ editingEvent()?.title }}</p>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-bold text-camp-earth uppercase tracking-wider">Stato dell'attività</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                type="button"
                (click)="formPastStatus.set('completata')"
                class="py-2.5 px-3 rounded-camp border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 shadow-sm hover:bg-camp-cream/50"
                [class.bg-green-50]="formPastStatus() === 'completata'"
                [class.text-green-700]="formPastStatus() === 'completata'"
                [class.border-green-300]="formPastStatus() === 'completata'"
                [class.border-camp-sand]="formPastStatus() !== 'completata'"
                [class.text-camp-olive]="formPastStatus() !== 'completata'"
              >
                <span class="text-lg">✓</span>
                <span>Completata</span>
              </button>
              <button 
                type="button"
                (click)="formPastStatus.set('completata_note')"
                class="py-2.5 px-3 rounded-camp border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 shadow-sm hover:bg-camp-cream/50"
                [class.bg-amber-50]="formPastStatus() === 'completata_note'"
                [class.text-amber-700]="formPastStatus() === 'completata_note'"
                [class.border-amber-300]="formPastStatus() === 'completata_note'"
                [class.border-camp-sand]="formPastStatus() !== 'completata_note'"
                [class.text-camp-olive]="formPastStatus() !== 'completata_note'"
              >
                <span class="text-lg">📝</span>
                <span>Con Note</span>
              </button>
              <button 
                type="button"
                (click)="formPastStatus.set('non_completata')"
                class="py-2.5 px-3 rounded-camp border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 shadow-sm hover:bg-camp-cream/50"
                [class.bg-red-50]="formPastStatus() === 'non_completata'"
                [class.text-red-700]="formPastStatus() === 'non_completata'"
                [class.border-red-300]="formPastStatus() === 'non_completata'"
                [class.border-camp-sand]="formPastStatus() !== 'non_completata'"
                [class.text-camp-olive]="formPastStatus() !== 'non_completata'"
              >
                <span class="text-lg">✗</span>
                <span>Non Svolta</span>
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-camp-earth uppercase tracking-wider">Note e Dettagli</label>
            <textarea 
              [value]="formDescription()"
              (input)="onDescriptionInput($event)"
              rows="4" 
              placeholder="Aggiungi dettagli (es. litri d'acqua, concimi usati, note agronomiche)..."
              class="w-full rounded-camp border border-camp-sand/40 p-3 text-sm focus:outline-none focus:border-camp-sage bg-camp-cream/10 text-camp-earth placeholder-camp-olive/50 transition-all custom-scrollbar resize-none"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-camp-sand/30">
            <button 
              type="button" 
              (click)="closeEditModal()" 
              class="px-4 py-2.5 rounded-camp border border-camp-sand/40 text-sm font-bold text-camp-olive hover:bg-camp-cream transition-all shadow-sm"
              [disabled]="isActionLoading()"
            >
              Annulla
            </button>
            <button 
              type="button" 
              (click)="onSaveEvent()" 
              class="px-5 py-2.5 rounded-camp bg-camp-sage text-white text-sm font-bold hover:bg-camp-sage/90 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
              [disabled]="isActionLoading()"
            >
              @if (isActionLoading()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              }
              Salva Stato
            </button>
          </div>
        </div>
      </app-camp-dialog>
    }

    @if (showNoteDialog()) {
      <app-camp-dialog 
        (close)="closeNoteDialog()"
        title="Note Attività"
      >
        <div class="space-y-6">
          <div>
            <h4 class="text-xs text-camp-olive uppercase tracking-widest font-bold mb-1">Attività</h4>
            <p class="text-lg font-serif text-camp-earth">{{ selectedEventForNote()?.title }}</p>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs text-camp-olive uppercase tracking-widest font-bold">Nota Registrata</h4>
            <div class="bg-camp-cream/20 border border-camp-sand/30 rounded-camp p-4 text-sm text-camp-earth min-h-[100px] whitespace-pre-wrap">
              {{ getEventNotes(selectedEventForNote()!) || 'Nessuna nota aggiuntiva registrata.' }}
            </div>
          </div>

          <div class="flex items-center justify-end pt-4 border-t border-camp-sand/30">
            <button 
              type="button" 
              (click)="closeNoteDialog()" 
              class="px-5 py-2.5 rounded-camp bg-camp-sage text-white text-sm font-bold hover:bg-camp-sage/90 transition-all shadow-sm"
            >
              Chiudi
            </button>
          </div>
        </div>
      </app-camp-dialog>
    }
  `
})
export class ArchiveComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private landService = inject(LandService);

  events = signal<CalendarEvent[]>([]);
  farms = signal<Farm[]>([]);
  selectedFarmId = signal<string | null>(null);
  isLoading = signal(true);
  isActionLoading = signal(false);

  showFarmDropdown = signal(false);

  showEditModal = signal(false);
  editingEvent = signal<CalendarEvent | null>(null);
  formPastStatus = signal<'completata' | 'completata_note' | 'non_completata'>('non_completata');
  formDescription = signal('');

  showNoteDialog = signal(false);
  selectedEventForNote = signal<CalendarEvent | null>(null);

  pastEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeFarmId = this.selectedFarmId();
    return this.events().filter(e => {
      if (e.farm_id !== activeFarmId) return false;
      return new Date(e.end) < today;
    });
  });

  async ngOnInit() {
    await this.loadFarms();
    await this.loadEvents();
  }

  async loadFarms() {
    try {
      const list = await this.landService.getFarms();
      this.farms.set(list);
      if (list && list.length > 0) {
        this.selectedFarmId.set(list[0].id || null);
      }
    } catch (e) {
      console.error('[ArchiveComponent] Errore caricamento terreni:', e);
    }
  }

  async loadEvents() {
    this.isLoading.set(true);
    try {
      const list = await this.calendarService.getEvents();
      this.events.set(list);
    } catch (e) {
      console.error('[ArchiveComponent] Errore caricamento eventi:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleDropdown() {
    this.showFarmDropdown.update(v => !v);
  }

  selectActiveFarm(farmId: string | null | undefined) {
    this.selectedFarmId.set(farmId || null);
    this.showFarmDropdown.set(false);
  }

  getActiveFarmName(): string {
    const activeId = this.selectedFarmId();
    const farm = this.farms().find(f => f.id === activeId);
    return farm ? farm.name : 'Seleziona Terreno';
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'maintenance': return '🔧';
      case 'harvest': return '🚜';
      case 'irrigation': return '💧';
      default: return '🌿';
    }
  }

  getEventCompletionStatus(event: CalendarEvent): 'completata' | 'completata_note' | 'non_completata' {
    const desc = event.description || '';
    if (desc.startsWith('[STATUS:completata]')) return 'completata';
    if (desc.startsWith('[STATUS:completata_note]')) return 'completata_note';
    if (desc.startsWith('[STATUS:non_completata]')) return 'non_completata';
    return 'non_completata';
  }

  getEventNotes(event: CalendarEvent | null): string {
    if (!event) return '';
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

  openEditModal(event: CalendarEvent) {
    this.editingEvent.set(event);
    const status = this.getEventCompletionStatus(event);
    this.formPastStatus.set(status);
    this.formDescription.set(this.getEventNotes(event));
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingEvent.set(null);
  }

  onDescriptionInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.formDescription.set(val);
  }

  async onSaveEvent() {
    const activeEdit = this.editingEvent();
    if (!activeEdit || !activeEdit.id) return;

    this.isActionLoading.set(true);
    const statusTag = `[STATUS:${this.formPastStatus()}]`;
    const finalDescription = `${statusTag} ${this.formDescription().trim()}`.trim();

    const payload: Omit<CalendarEvent, 'user_id' | 'id'> = {
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

    try {
      await this.calendarService.updateEvent(activeEdit.id, payload);
      await this.loadEvents();
      this.closeEditModal();
    } catch (e) {
      console.error('[ArchiveComponent] Errore salvataggio attività:', e);
    } finally {
      this.isActionLoading.set(false);
    }
  }

  openNoteDialog(event: CalendarEvent) {
    this.selectedEventForNote.set(event);
    this.showNoteDialog.set(true);
  }

  closeNoteDialog() {
    this.showNoteDialog.set(false);
    this.selectedEventForNote.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showFarmDropdown.set(false);
    }
  }
}
