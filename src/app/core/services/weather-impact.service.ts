import { Injectable } from '@angular/core';
import { WeatherData } from './weather.service';
import { CalendarEvent } from './calendar.service';

export interface WeatherImpactEvaluation {
  status: 'favorable' | 'attention' | 'insufficient_data';
  severity: 'none' | 'warning' | 'info';
  icon: string;
  badgeLabel: string;
  title: string;
  reason: string;
  recommendation?: string;
  betterWindow?: {
    date: string;
    dateLabel: string;
    reason: string;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherImpactService {

  evaluateEventImpact(event: CalendarEvent, weather: WeatherData | null): WeatherImpactEvaluation {
    if (!weather || !weather.daily || !weather.daily.dates || weather.daily.dates.length === 0) {
      return {
        status: 'insufficient_data',
        severity: 'none',
        icon: '🌧️',
        badgeLabel: 'Dati Meteo N.D.',
        title: 'Meteo Non Disponibile',
        reason: 'Dati meteo non disponibili per valutare questa attività.',
        recommendation: 'Verifica la connessione o la posizione del terreno.'
      };
    }

    const eventDate = new Date(event.start);
    const eventDateStr = this.formatDateIso(eventDate);

    const dayIdx = weather.daily.dates.findIndex(d => d === eventDateStr);
    if (dayIdx === -1) {
      return {
        status: 'insufficient_data',
        severity: 'none',
        icon: '📅',
        badgeLabel: 'Fuori Finestra Meteo',
        title: 'Previsioni Non Disponibili',
        reason: 'Dati meteo non disponibili per questa data. Le previsioni coprono i prossimi 7 giorni.',
        recommendation: 'Nessuna criticità rilevabile a lungo termine.'
      };
    }

    const precip = weather.daily.precipSums ? weather.daily.precipSums[dayIdx] ?? 0 : 0;
    const wind = weather.daily.windSpeeds ? weather.daily.windSpeeds[dayIdx] ?? 0 : 0;
    const weatherCode = weather.daily.weatherCodes ? weather.daily.weatherCodes[dayIdx] ?? 0 : 0;
    const maxTemp = weather.daily.maxTemps ? weather.daily.maxTemps[dayIdx] ?? 0 : 0;

    const isRainyCode = weatherCode >= 51 && weatherCode <= 99;

    if (event.type === 'irrigation') {
      if (precip >= 2.0 || isRainyCode) {
        const betterWindow = this.findBetterWindowForIrrigation(dayIdx, weather);
        return {
          status: 'attention',
          severity: 'warning',
          icon: '🌧️',
          badgeLabel: 'Pioggia Prevista',
          title: 'Irrigazione Superflua',
          reason: `Previsti ${precip} mm di pioggia per il giorno programmato. L'irrigazione rischia di essere ridondante o causare ristagni.`,
          recommendation: 'Valuta di posticipare l\'irrigazione.',
          betterWindow
        };
      } else {
        return {
          status: 'favorable',
          severity: 'none',
          icon: '☀️',
          badgeLabel: 'Meteo Idoneo',
          title: 'Finestra Favorevole',
          reason: `Giornata asciutta con precipitazioni trascurabili (${precip} mm). Condizioni ideali per l'irrigazione.`
        };
      }
    }

    if (event.type === 'maintenance') {
      if (wind >= 20.0) {
        const betterWindow = this.findBetterWindowForMaintenance(dayIdx, weather);
        return {
          status: 'attention',
          severity: 'warning',
          icon: '💨',
          badgeLabel: 'Vento Forte',
          title: 'Trattamenti a Rischio',
          reason: `Vento massimo previsto a ${wind} km/h. Si sconsigliano trattamenti fogliari per deriva ed elevato consumo.`,
          recommendation: 'Preferisci giornate con vento inferiore a 15 km/h.',
          betterWindow
        };
      } else if (precip >= 2.0 || isRainyCode) {
        const betterWindow = this.findBetterWindowForMaintenance(dayIdx, weather);
        return {
          status: 'attention',
          severity: 'warning',
          icon: '🌧️',
          badgeLabel: 'Pioggia Prevista',
          title: 'Rischio Dilavamento',
          reason: `Previsti ${precip} mm di pioggia. I trattamenti fogliari o le concimazioni rischiano di essere dilavati.`,
          recommendation: 'Svolgi la manutenzione dopo la fine delle precipitazioni.',
          betterWindow
        };
      } else {
        return {
          status: 'favorable',
          severity: 'none',
          icon: '🌿',
          badgeLabel: 'Meteo Favorevole',
          title: 'Condizioni Ottimali',
          reason: `Vento moderato (${wind} km/h) e pioggia assente. Condizioni ideali per potatura e trattamenti.`
        };
      }
    }

    if (event.type === 'harvest') {
      if (precip >= 1.0 || isRainyCode) {
        const betterWindow = this.findBetterWindowForHarvest(dayIdx, weather);
        return {
          status: 'attention',
          severity: 'warning',
          icon: '🌧️',
          badgeLabel: 'Pioggia in Raccolta',
          title: 'Rischio Qualità Olio',
          reason: `Previsti ${precip} mm di pioggia. Raccogliere olive bagnate favorisce l'insorgenza di muffe e altera la qualità.`,
          recommendation: 'Attendi che la chioma ed il terreno siano ben asciutti.',
          betterWindow
        };
      } else {
        return {
          status: 'favorable',
          severity: 'none',
          icon: '🫒',
          badgeLabel: 'Ottimo per Raccolta',
          title: 'Giornata Asciutta',
          reason: `Meteo asciutto (${precip} mm pioggia). Condizioni ideali per la raccolta.`
        };
      }
    }

    if (precip >= 5.0 || wind >= 25.0) {
      return {
        status: 'attention',
        severity: 'info',
        icon: '⚠️',
        badgeLabel: 'Meteo Avverso',
        title: 'Condizioni Meteo Intense',
        reason: `Previste precipitazioni (${precip} mm) o vento intenso (${wind} km/h).`,
        recommendation: 'Prestare attenzione durante le operazioni di campo.'
      };
    }

    return {
      status: 'favorable',
      severity: 'none',
      icon: '👍',
      badgeLabel: 'Meteo Stabile',
      title: 'Meteo Regolare',
      reason: 'Nessuna criticità meteorologica rilevata per questa data.'
    };
  }

  private findBetterWindowForIrrigation(currentIdx: number, weather: WeatherData) {
    for (let i = 0; i < weather.daily.dates.length; i++) {
      if (i === currentIdx) continue;
      const p = weather.daily.precipSums ? weather.daily.precipSums[i] ?? 0 : 0;
      if (p < 1.0) {
        const dateStr = weather.daily.dates[i];
        return {
          date: dateStr,
          dateLabel: this.formatDateLabel(dateStr),
          reason: `Meteo asciutto previsto (${p} mm pioggia)`
        };
      }
    }
    return null;
  }

  private findBetterWindowForMaintenance(currentIdx: number, weather: WeatherData) {
    for (let i = 0; i < weather.daily.dates.length; i++) {
      if (i === currentIdx) continue;
      const p = weather.daily.precipSums ? weather.daily.precipSums[i] ?? 0 : 0;
      const w = weather.daily.windSpeeds ? weather.daily.windSpeeds[i] ?? 0 : 0;
      if (p < 1.0 && w < 15.0) {
        const dateStr = weather.daily.dates[i];
        return {
          date: dateStr,
          dateLabel: this.formatDateLabel(dateStr),
          reason: `Meteo idoneo: pioggia ${p} mm, vento ${w} km/h`
        };
      }
    }
    return null;
  }

  private findBetterWindowForHarvest(currentIdx: number, weather: WeatherData) {
    for (let i = 0; i < weather.daily.dates.length; i++) {
      if (i === currentIdx) continue;
      const p = weather.daily.precipSums ? weather.daily.precipSums[i] ?? 0 : 0;
      if (p < 0.5) {
        const dateStr = weather.daily.dates[i];
        return {
          date: dateStr,
          dateLabel: this.formatDateLabel(dateStr),
          reason: `Giornata completamente asciutta (${p} mm pioggia)`
        };
      }
    }
    return null;
  }

  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateLabel(isoStr: string): string {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }
}
