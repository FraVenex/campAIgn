import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { isColumnMissingError } from './table-repository';
import { EventType, WorkStatus } from '../constants/domain';

const EVENT_EXTRAS_KEY = 'camp-extras-events';

export interface CalendarEvent {
  id?: string;
  user_id?: string;
  farm_id: string;
  title: string;
  description?: string | null;
  type: EventType;
  start: string;
  end: string;
  all_day: boolean;
  source: 'user' | 'arnaldo';
  status: 'confirmed' | 'suggested' | 'dismissed';
  suggestion_reason?: string | null;
  suggested_at?: string | null;
  confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  plant_ids?: string[];
  work_status?: WorkStatus;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private supabase: SupabaseClient;
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private useLocalStorageFallback = false;

  constructor() {
    this.supabase = this.supabaseService.client;
    this.checkFallbackState();
  }

  private checkFallbackState() {
    const fallbackVal = localStorage.getItem('camp-calendar-fallback');
    this.useLocalStorageFallback = fallbackVal === 'true';
  }

  private getFallbackEvents(): CalendarEvent[] {
    const eventsStr = localStorage.getItem('camp-calendar-events');
    if (!eventsStr) {
      const defaultEvents: CalendarEvent[] = this.createMockEvents();
      localStorage.setItem('camp-calendar-events', JSON.stringify(defaultEvents));
      return this.migrateEvents(defaultEvents);
    }
    return this.migrateEvents(JSON.parse(eventsStr));
  }

  private saveFallbackEvents(events: CalendarEvent[]) {
    localStorage.setItem('camp-calendar-events', JSON.stringify(events));
  }

  private createMockEvents(): CalendarEvent[] {
    const today = new Date();
    const formatOffset = (days: number, hours: number = 9) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      d.setHours(hours, 0, 0, 0);
      return d.toISOString();
    };

    return [
      {
        id: 'mock-1',
        farm_id: 'mock-farm',
        title: 'Potatura Ulivi Secolari',
        description: "Potatura annuale dei rami secchi o malati per migliorare l'aerazione e l'esposizione al sole della chioma.",
        type: 'maintenance',
        start: formatOffset(-1, 9),
        end: formatOffset(-1, 13),
        all_day: false,
        source: 'user',
        status: 'confirmed'
      },
      {
        id: 'mock-2',
        farm_id: 'mock-farm',
        title: "Irrigazione d'emergenza",
        description: 'Avviare il sistema automatico a goccia a causa del caldo eccessivo previsto per i prossimi giorni.',
        type: 'irrigation',
        start: formatOffset(1, 16),
        end: formatOffset(1, 18),
        all_day: false,
        source: 'user',
        status: 'confirmed'
      },
      {
        id: 'mock-3',
        farm_id: 'mock-farm',
        title: 'Raccolta Leccino',
        description: "Raccolta precoce degli ulivi della varietà Leccino per ottenere un olio fruttato medio-intenso.",
        type: 'harvest',
        start: formatOffset(3, 8),
        end: formatOffset(3, 17),
        all_day: false,
        source: 'user',
        status: 'confirmed'
      },
      {
        id: 'mock-arnaldo-1',
        farm_id: 'mock-farm',
        title: 'Controllo periodico chioma',
        description: 'Ispezione visiva delle piante per rilevare eventuali infestazioni o carenze nutrizionali.',
        type: 'maintenance',
        start: formatOffset(2, 9),
        end: formatOffset(2, 11),
        all_day: false,
        source: 'arnaldo',
        status: 'suggested',
        suggestion_reason: 'Nessuna attività programmata questa settimana. Il periodo è ottimale per un controllo preventivo.',
        suggested_at: new Date().toISOString()
      },
      {
        id: 'mock-arnaldo-2',
        farm_id: 'mock-farm',
        title: 'Concimazione di fondo',
        description: 'Apporto di fertilizzanti a lenta cessione per sostenere la crescita autunnale.',
        type: 'maintenance',
        start: formatOffset(5, 7),
        end: formatOffset(5, 10),
        all_day: false,
        source: 'arnaldo',
        status: 'suggested',
        suggestion_reason: 'La stagione autunnale richiede un apporto nutritivo per rafforzare le radici in vista del freddo.',
        suggested_at: new Date().toISOString()
      }
    ];
  }

  async getConfirmedEvents(): Promise<CalendarEvent[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    if (this.useLocalStorageFallback) {
      return this.getFallbackEvents().filter(e => e.status === 'confirmed');
    }

    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*, event_plants(plant_id)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      if (error) {
        if (this.isTableMissingError(error)) {
          this.activateFallback();
          return this.getFallbackEvents().filter(e => e.status === 'confirmed');
        }
        throw error;
      }

      return this.migrateEvents(data as any[]);
    } catch (e) {
      console.warn('[CalendarService] Errore Supabase, fallback attivato:', e);
      this.activateFallback();
      return this.getFallbackEvents().filter(e => e.status === 'confirmed');
    }
  }

  async getSuggestedEvents(): Promise<CalendarEvent[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    if (this.useLocalStorageFallback) {
      return this.getFallbackEvents().filter(e => e.source === 'arnaldo' && e.status === 'suggested');
    }

    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*, event_plants(plant_id)')
        .eq('user_id', user.id)
        .eq('source', 'arnaldo')
        .eq('status', 'suggested');

      if (error) {
        if (this.isTableMissingError(error)) {
          this.activateFallback();
          return this.getFallbackEvents().filter(e => e.source === 'arnaldo' && e.status === 'suggested');
        }
        throw error;
      }

      return this.migrateEvents(data as any[]);
    } catch (e) {
      console.warn('[CalendarService] Errore caricamento suggerimenti:', e);
      this.activateFallback();
      return this.getFallbackEvents().filter(e => e.source === 'arnaldo' && e.status === 'suggested');
    }
  }

  async getEvents(): Promise<CalendarEvent[]> {
    return this.getConfirmedEvents();
  }

  async createEvent(eventData: Omit<CalendarEvent, 'user_id' | 'id'>): Promise<CalendarEvent> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Utente non autenticato');

    if (this.useLocalStorageFallback) {
      const events = this.getFallbackEvents();
      const newEvent: CalendarEvent = {
        ...eventData,
        id: `mock-${Date.now()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      events.push(newEvent);
      this.saveFallbackEvents(events);
      return newEvent;
    }

    try {
      const { plant_ids, ...dbEventData } = eventData as any;
      let { data, error } = await this.supabase
        .from('events')
        .insert([{ ...dbEventData, user_id: user.id }])
        .select();

      if (error && isColumnMissingError(error) && 'work_status' in dbEventData) {
        const { work_status, ...withoutStatus } = dbEventData;
        ({ data, error } = await this.supabase
          .from('events')
          .insert([{ ...withoutStatus, user_id: user.id }])
          .select());
        if (!error && data?.[0]?.id) this.saveEventExtras(data[0].id, { work_status });
      }

      if (error) throw error;

      const createdEvent = this.migrateEvents(data as any[])[0];
      if (plant_ids && plant_ids.length > 0 && createdEvent.id) {
        try {
          const eventPlantsPayload = plant_ids.map((pid: string) => ({
            event_id: createdEvent.id,
            plant_id: pid
          }));
          await this.supabase.from('event_plants').insert(eventPlantsPayload);
        } catch (err) {
          console.warn('[CalendarService] Errore salvataggio relazioni event_plants:', err);
        }
        createdEvent.plant_ids = plant_ids;
      }
      return createdEvent;
    } catch (e: any) {
      if (this.isTableMissingError(e)) {
        this.activateFallback();
        return this.createEvent(eventData);
      }
      throw e;
    }
  }

  async acceptSuggestion(id: string): Promise<CalendarEvent> {
    return this.updateEvent(id, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    });
  }

  async dismissSuggestion(id: string): Promise<void> {
    await this.updateEvent(id, { status: 'dismissed' });
  }

  async updateEvent(id: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Utente non autenticato');

    if (this.useLocalStorageFallback) {
      const events = this.getFallbackEvents();
      const index = events.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Evento non trovato');

      const updatedEvent: CalendarEvent = {
        ...events[index],
        ...eventData,
        updated_at: new Date().toISOString()
      };
      events[index] = updatedEvent;
      this.saveFallbackEvents(events);
      return updatedEvent;
    }

    try {
      const { plant_ids, ...dbEventData } = eventData as any;
      let { data, error } = await this.supabase
        .from('events')
        .update({ ...dbEventData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error && isColumnMissingError(error) && 'work_status' in dbEventData) {
        const { work_status, ...withoutStatus } = dbEventData;
        this.saveEventExtras(id, { work_status });
        ({ data, error } = await this.supabase
          .from('events')
          .update({ ...withoutStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select());
      }

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Evento non trovato');
      if (plant_ids) await this.replaceEventPlants(id, plant_ids);
      return this.migrateEvents(data as any[])[0];
    } catch (e: any) {
      if (this.isTableMissingError(e)) {
        this.activateFallback();
        return this.updateEvent(id, eventData);
      }
      throw e;
    }
  }

  async getLastEventForPlant(plantId: string): Promise<CalendarEvent | null> {
    const user = this.authService.currentUser();
    if (!user) return null;

    if (this.useLocalStorageFallback) {
      const events = this.getFallbackEvents();
      const matching = events
        .filter(e => e.plant_ids?.includes(plantId))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      return matching[0] ?? null;
    }

    try {
      const { data, error } = await this.supabase
        .from('event_plants')
        .select('event_id, events(*)')
        .eq('plant_id', plantId);

      if (error || !data || data.length === 0) return null;

      const events = this.migrateEvents((data as any[])
        .map(row => row.events)
        .filter(ev => !!ev && !!ev.start))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

      if (events.length === 0) return null;
      return { ...events[0], plant_ids: [plantId] } as CalendarEvent;
    } catch {
      return null;
    }
  }

  async getEventsForPlant(plantId: string): Promise<CalendarEvent[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    if (this.useLocalStorageFallback) {
      return this.getFallbackEvents()
        .filter(e => e.plant_ids?.includes(plantId))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }

    try {
      const { data, error } = await this.supabase
        .from('event_plants')
        .select('event_id, events(*)')
        .eq('plant_id', plantId);

      if (error || !data) return [];

      return this.migrateEvents((data as any[])
        .map(row => row.events)
        .filter(Boolean)
        .map(ev => ({ ...ev, plant_ids: [plantId] })))
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    } catch {
      return [];
    }
  }

  async deleteEvent(id: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Utente non autenticato');

    if (this.useLocalStorageFallback) {
      const events = this.getFallbackEvents();
      const filtered = events.filter(e => e.id !== id);
      this.saveFallbackEvents(filtered);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (e: any) {
      if (this.isTableMissingError(e)) {
        this.activateFallback();
        return this.deleteEvent(id);
      }
      throw e;
    }
  }

  async setWorkStatus(id: string, workStatus: WorkStatus): Promise<CalendarEvent> {
    return this.updateEvent(id, { work_status: workStatus });
  }

  private async replaceEventPlants(eventId: string, plantIds: string[]) {
    try {
      await this.supabase.from('event_plants').delete().eq('event_id', eventId);
      if (plantIds.length) {
        await this.supabase.from('event_plants').insert(plantIds.map(pid => ({ event_id: eventId, plant_id: pid })));
      }
    } catch (err) {
      console.warn('[CalendarService] Errore aggiornamento relazioni event_plants:', err);
    }
  }

  /** Stato operativo: colonna dedicata, extra locali o convenzione legacy nel prefisso della descrizione. */
  private deriveWorkStatus(e: any, extras: Record<string, any>): WorkStatus {
    const fromExtras = e.id ? extras[e.id]?.work_status : undefined;
    if (e.work_status) return e.work_status;
    if (fromExtras) return fromExtras;
    const desc: string = e.description || '';
    if (desc.startsWith('[STATUS:completata')) return 'done';
    return 'todo';
  }

  private migrateEvents(raw: any[]): CalendarEvent[] {
    const extras = this.readEventExtras();
    return raw.map(e => {
      const plant_ids = e.event_plants ? e.event_plants.map((ep: any) => ep.plant_id) : [];
      const { event_plants, ...rest } = e;
      return {
        ...rest,
        plant_ids: e.plant_ids || plant_ids,
        source: e.source ?? 'user',
        status: e.status ?? 'confirmed',
        work_status: this.deriveWorkStatus(e, extras)
      };
    });
  }

  private readEventExtras(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem(EVENT_EXTRAS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private saveEventExtras(id: string, extra: Record<string, any>) {
    const all = this.readEventExtras();
    all[id] = { ...(all[id] || {}), ...extra };
    try {
      localStorage.setItem(EVENT_EXTRAS_KEY, JSON.stringify(all));
    } catch {}
  }

  private activateFallback() {
    this.useLocalStorageFallback = true;
    localStorage.setItem('camp-calendar-fallback', 'true');
  }

  private isTableMissingError(error: any): boolean {
    if (!error) return false;
    const msg = error.message || '';
    const code = error.code || '';
    return code === 'PGRST205' || msg.includes('relation "public.events" does not exist') || code === '42P01';
  }
}
