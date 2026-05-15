import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CampCardComponent } from '../../../shared/components/camp-card/camp-card.component';

@Component({
  selector: 'app-calendar-strip',
  standalone: true,
  imports: [CommonModule, RouterLink, CampCardComponent],
  template: `
    <a routerLink="/calendar" class="block h-full group">
      <app-camp-card
        title="Programma Settimanale"
        [subtitle]="currentMonth()"
        icon="🗓️"
      >
        <div header-action>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-camp-olive/30 group-hover:text-camp-sage transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div class="flex justify-between items-center gap-1 sm:gap-2 overflow-x-auto pb-4 scrollbar-hide mt-2">
          @for (day of weekDays(); track day.date) {
            <div class="flex-1 min-w-[44px] flex flex-col items-center">
              <span class="text-[9px] text-camp-olive/40 uppercase mb-3 font-bold tracking-widest">{{ day.label }}</span>
              <div [class]="'w-11 h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border ' + 
                   (day.isToday ? 'bg-camp-sage text-white shadow-camp border-camp-sage/20' : 'bg-camp-cream/30 text-camp-earth border-camp-sand/20 group-hover:bg-white/80')">
                <span class="text-sm font-bold">{{ day.date.getDate() }}</span>
                @if (day.hasEvents) {
                  <div [class]="'w-1.5 h-1.5 rounded-full mt-1 ' + (day.isToday ? 'bg-white' : 'bg-camp-sage')"></div>
                }
              </div>
            </div>
          }
        </div>

        <div class="mt-6 p-4 rounded-2xl bg-camp-beige/20 border border-dashed border-camp-sand/60 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-camp-sage/5 flex items-center justify-center text-lg border border-camp-sage/10 shadow-inner">📌</div>
          <div>
            <p class="text-[11px] text-camp-earth font-bold uppercase tracking-wider">Nessuna attività</p>
            <p class="text-[10px] text-camp-olive/60 font-medium">Tutto sembra in ordine per oggi.</p>
          </div>
        </div>
      </app-camp-card>
    </a>
  `
})
export class CalendarStripComponent {
  currentMonth = computed(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(now);
  });

  weekDays = computed(() => {
    const days = [];
    const now = new Date();
    const startOfWeek = new Date(now);
    // Portiamo a lunedì
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const labels = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        label: labels[i],
        date: date,
        isToday: date.toDateString() === now.toDateString(),
        hasEvents: false // Placeholder
      });
    }
    return days;
  });
}
