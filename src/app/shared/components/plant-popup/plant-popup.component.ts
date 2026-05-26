import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Plant } from '../../../core/services/plants.service';
import { CalendarEvent } from '../../../core/services/calendar.service';

export interface PlantPopupData {
  plant: Plant;
  lastEvent: CalendarEvent | null;
}

@Component({
  selector: 'app-plant-popup',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Wrapper posizionato esattamente al centro della pianta (0,0) -->
    <div class="absolute z-40 pointer-events-auto animate-scale-in">
      
      <!-- Popup Box -->
      <div 
        class="absolute w-64 bg-white border border-camp-sand/50 rounded-camp shadow-camp-lg overflow-hidden"
        [ngStyle]="boxStyle()"
      >
        <div class="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-camp-sand/20">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border"
              [ngClass]="statusIconClass()"
            >
              🌳
            </div>
            <div class="min-w-0">
              <p class="font-serif text-camp-earth font-bold text-sm leading-tight truncate">
                {{ data().plant.name || 'Nome non assegnato' }}
              </p>
              <p class="text-[10px] text-camp-olive/70 truncate mt-0.5">
                {{ data().plant.species || '—' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 w-6 h-6 rounded-full hover:bg-camp-sand/40 flex items-center justify-center transition-colors text-camp-olive/60"
            (click)="close.emit()"
            id="plant-popup-close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-4 py-3 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] uppercase tracking-wider font-bold text-camp-olive/60">Stato</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              [ngClass]="statusBadgeClass()"
            >
              {{ statusLabel() }}
            </span>
          </div>

          <div class="border-t border-camp-sand/20 pt-2.5">
            <p class="text-[10px] uppercase tracking-wider font-bold text-camp-olive/60 mb-1.5">Ultima Attività</p>
            @if (data().lastEvent) {
              <div class="flex items-start gap-2">
                <span class="text-sm mt-0.5">{{ activityIcon() }}</span>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-camp-earth truncate">{{ data().lastEvent!.title }}</p>
                  <p class="text-[10px] text-camp-olive/60 mt-0.5">{{ formatDate(data().lastEvent!.start) }}</p>
                </div>
              </div>
            } @else {
              <p class="text-xs text-camp-olive/50 italic">Nessuna attività registrata</p>
            }
          </div>

          @if (data().plant.last_treatment_type) {
            <div class="border-t border-camp-sand/20 pt-2.5 flex items-center justify-between gap-2">
              <span class="text-[10px] uppercase tracking-wider font-bold text-camp-olive/60">Ultimo Trattamento</span>
              <span class="text-xs text-camp-earth font-medium truncate max-w-[110px]">{{ data().plant.last_treatment_type }}</span>
            </div>
          }
        </div>

        <div class="px-4 pb-4 pt-1">
          <a
            [routerLink]="['/land/plant', data().plant.id]"
            id="plant-popup-detail-link"
            class="flex items-center justify-center gap-2 w-full py-2 bg-camp-sage hover:bg-camp-earth text-white text-xs font-bold uppercase tracking-wider rounded-camp transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
            Apri Dettaglio
          </a>
        </div>
      </div>

      <!-- Arrow -->
      <div 
        class="absolute w-3 h-3 bg-white rotate-45"
        [ngClass]="arrowBorderClass()"
        [ngStyle]="arrowStyle()"
      ></div>

    </div>
  `,
  styles: [`
    .animate-scale-in {
      animation: popupIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popupIn {
      from { opacity: 0; transform: scale(0.92) translateY(5px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class PlantPopupComponent {
  data = input.required<PlantPopupData>();
  close = output<void>();

  isAbove = computed(() => this.data().plant.position_y < 30);

  boxStyle = computed(() => {
    const { position_x } = this.data().plant;
    const style: any = {};
    
    // Posizione verticale: il bordo del box sta a 28px dal centro della pianta
    if (this.isAbove()) {
      style.top = '28px';
    } else {
      style.bottom = '28px';
    }

    // Posizione orizzontale anti-clipping
    if (position_x < 25) {
      style.left = '-24px';
    } else if (position_x > 75) {
      style.right = '-24px';
    } else {
      style.left = '-128px'; // centrato (256px / 2)
    }
    
    return style;
  });

  arrowStyle = computed(() => {
    const style: any = {
      left: '-6px' // Centrato orizzontalmente sullo 0 (w-3 = 12px -> -6px)
    };
    
    // Posizione verticale: il centro della freccia deve combaciare con il bordo del box (28px)
    if (this.isAbove()) {
      style.top = '22px'; // 28 - 6
    } else {
      style.top = '-34px'; // -28 - 6
    }
    
    return style;
  });

  arrowBorderClass = computed(() => {
    return this.isAbove() 
      ? 'border-t border-l border-camp-sand/50' 
      : 'border-b border-r border-camp-sand/50';
  });

  statusIconClass = computed(() => {
    const s = this.data().plant.status;
    if (s === 'Ottimo') return 'bg-camp-success-light border-camp-success/20 text-camp-success';
    if (s === 'Attenzione') return 'bg-camp-amber-light/20 border-camp-amber/20 text-camp-amber';
    if (s === 'Stressato') return 'bg-camp-error-light border-camp-error/20 text-camp-error';
    return 'bg-camp-sand/20 border-camp-sand/40 text-camp-olive';
  });

  statusBadgeClass = computed(() => {
    const s = this.data().plant.status;
    if (s === 'Ottimo') return 'bg-camp-success-light text-camp-success border-camp-success/15';
    if (s === 'Attenzione') return 'bg-camp-amber-light/30 text-camp-amber border-camp-amber/15';
    if (s === 'Stressato') return 'bg-camp-error-light text-camp-error border-camp-error/15';
    return 'bg-camp-sand/30 text-camp-olive border-camp-sand/30';
  });

  statusLabel = computed(() => this.data().plant.status || 'Non valutato');

  activityIcon = computed(() => {
    const type = this.data().lastEvent?.type;
    if (type === 'maintenance') return '🔧';
    if (type === 'harvest') return '🌿';
    if (type === 'irrigation') return '💧';
    return '📅';
  });

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
