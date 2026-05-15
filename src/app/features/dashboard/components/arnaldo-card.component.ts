import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherData } from '../../../core/services/weather.service';
import { Farm } from '../../../core/services/land.service';
import { CampCardComponent } from '../../../shared/components/camp-card/camp-card.component';

@Component({
  selector: 'app-arnaldo-card',
  standalone: true,
  imports: [CommonModule, CampCardComponent],
  template: `
    <app-camp-card
      [title]="suggestion().title"
      subtitle="Consiglio di Arnaldo"
      icon="👨‍🌾"
      variant="primary"
      class="h-full"
    >
      <div class="flex flex-col h-full">
        <p class="text-sm text-white/90 leading-relaxed mb-6 font-medium">
          {{ suggestion().text }}
        </p>

        <div class="flex items-center justify-between mt-auto">
          <div class="flex flex-wrap gap-2">
            @for (tag of suggestion().tags; track tag) {
              <span class="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold border border-white/20 uppercase tracking-widest">
                {{ tag }}
              </span>
            }
          </div>
          <button class="w-8 h-8 rounded-full bg-white text-camp-sage flex items-center justify-center shadow-md hover:scale-110 transition-transform flex-shrink-0 ml-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </app-camp-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class ArnaldoCardComponent {
  weather = input<WeatherData | null>(null);
  farm = input<Farm | null>(null);
  mode = input<'general' | 'weather'>('general');

  suggestion = computed(() => {
    const w = this.weather();
    const f = this.farm();
    const m = this.mode();
    
    if (m === 'weather') {
      if (w && w.current.precipitation > 0) {
        return {
          title: "Attenzione Pioggia",
          text: "Le precipitazioni odierne sconsigliano trattamenti fogliari. Monitora il drenaggio se hai zone con ristagno idrico.",
          tags: ["meteo", "drenaggio"],
          type: 'warning'
        };
      }
      if (w && w.current.windSpeed > 20) {
        return {
          title: "Vento Forte",
          text: "Vento sostenuto rilevato. Attenzione se hai giovani ulivi non ancora ben ancorati o se prevedevi di effettuare trattamenti.",
          tags: ["sicurezza", "ancoraggio"],
          type: 'warning'
        };
      }
      return {
        title: "Condizioni Agricole",
        text: "Il clima è ideale per la respirazione delle piante. Una leggera ventilazione previene l'umidità eccessiva sulla chioma.",
        tags: ["salute", "clima"],
        type: 'success'
      };
    }

    if (w && w.current.precipitation > 0) {
      return {
        title: "Pausa pioggia",
        text: "Oggi piove nel tuo uliveto. È il momento ideale per pianificare i prossimi interventi di potatura o controllare l'attrezzatura al coperto.",
        tags: ["riposo", "manutenzione"],
        type: 'info'
      };
    }

    if (w && w.current.temperature > 28) {
      return {
        title: "Caldo intenso",
        text: "Le temperature sono elevate. Se hai piante giovani, controlla lo stato di idratazione del terreno nelle ore meno calde.",
        tags: ["irrigazione", "giovani piante"],
        type: 'warning'
      };
    }

    return {
      title: "Ottima giornata",
      text: "Il meteo è ideale per un giro nel tuo terreno. Le condizioni sono perfette per qualsiasi attività di manutenzione ordinaria.",
      tags: ["generale", "monitoraggio"],
      type: 'success'
    };
  });
}
