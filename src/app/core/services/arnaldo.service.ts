import { Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseService } from "./supabase.service";
import { Farm } from "./land.service";
import { Plant } from "./plants.service";
import { WeatherService, WeatherData } from "./weather.service";
import { FarmStore } from "./farm-store.service";
import { OperationsStore } from "./operations.store";
import { NotesService } from "./notes.service";
import { HarvestService } from "./harvest.service";
import { ExpensesService } from "./expenses.service";
import { PhotosService } from "./photos.service";
import { EVENT_TYPE_META, EXPENSE_CATEGORY_META, EventType, WORK_STATUS_META } from "../constants/domain";
import { agronomicRisks, daySnapshot, oliveSeasonPhase, sprayWindow, weatherCodeInfo } from "../utils/agronomy";
import { parseOperationDescription } from "../utils/operation-details";

export type ArnaldoPageContext =
	| "journal-home"
	| "journal-notes"
	| "calendar"
	| "land-map"
	| "plant-list"
	| "plant-detail"
	| "operations-map"
	| "operations-log"
	| "harvest-map"
	| "harvest-archive"
	| "accounting"
	| "meteo"
	| "gallery"
	| "general";

/** Descrizione di ciò che l'utente vede in ogni pagina: aiuta Arnaldo a interpretare domande generiche. */
export const PAGE_CONTEXT_DESCRIPTIONS: Record<ArnaldoPageContext, string> = {
	"journal-home": "Diario del contadino > Home: punto della giornata, meteo di oggi, promemoria delle note e attività del giorno.",
	"journal-notes": "Diario del contadino > Note: bacheca di post-it con le note generali dell'utente.",
	calendar: "Calendario: tutte le attività programmate e passate (trattamenti, manutenzioni, irrigazioni, raccolte).",
	"land-map": "Terreno > Mappa: disposizione e stato di salute delle piante sul terreno.",
	"plant-list": "Terreno > Lista piante: anagrafica di tutte le piante (nome, specie, varietà, anno d'impianto, stato).",
	"plant-detail": "Scheda di una singola pianta (selectedPlant): anagrafica, storico interventi, note, foto e grafici.",
	"operations-map": "Manutenzioni e trattamenti > Mappa: selezione di piante per assegnare interventi; i marker mostrano gli interventi aperti.",
	"operations-log": "Manutenzioni e trattamenti > Registro interventi: lista di interventi passati e futuri con stato (da svolgere, in corso, svolta, saltata, in ritardo).",
	"harvest-map": "Raccolta > Mappa: selezione delle piante da raccogliere e programmazione della raccolta.",
	"harvest-archive": "Raccolta > Archivio: raccolte registrate (quintali, litri, costi) con report di bontà e confronto pluriennale.",
	accounting: "Contabilità: spese per prodotti, attrezzi, manutenzioni, manodopera e gestione del terreno.",
	meteo: "Meteo: previsioni a 5 giorni, grafici e grandezze agronomiche (ET0, VPD, umidità del suolo, punto di rugiada).",
	gallery: "Galleria: foto del terreno e delle piante con didascalie.",
	general: "Pagina generica dell'app."
};

export interface ArnaldoSuggestion {
	id?: string;
	title: string;
	description: string;
	type: EventType;
	start: string;
	end: string;
	all_day: boolean;
	suggestion_reason: string;
	plant_ids?: string[];
	status?: "pending" | "accepted" | "rejected";
}

export interface ArnaldoReport {
	title: string;
	markdown: string;
}

export interface ArnaldoChatMessage {
	id: string;
	sender: "arnaldo" | "user";
	text: string;
	timestamp: Date;
	suggestion?: ArnaldoSuggestion;
	report?: ArnaldoReport;
	isError?: boolean;
	pageContext?: ArnaldoPageContext;
}

export interface ArnaldoResponse {
	replyText: string;
	suggestions: ArnaldoSuggestion[];
	suggestedQuestions: string[];
	report?: ArnaldoReport | null;
}

export type ArnaldoGroundingContext = Awaited<ReturnType<ArnaldoService["buildGroundingContext"]>>;

const MESSAGES_KEY = "campaign_arnaldo_chat_messages";
const OPEN_KEY = "campaign_arnaldo_chat_is_open";
const MAX_STORED_MESSAGES = 200;

@Injectable({
	providedIn: "root"
})
export class ArnaldoService {
	private supabase: SupabaseClient;
	private supabaseService = inject(SupabaseService);
	private weatherService = inject(WeatherService);
	private farmStore = inject(FarmStore);
	private operations = inject(OperationsStore);
	private notesService = inject(NotesService);
	private harvestService = inject(HarvestService);
	private expensesService = inject(ExpensesService);
	private photosService = inject(PhotosService);
	private router = inject(Router);

	messages = signal<ArnaldoChatMessage[]>([]);
	isOpen = signal<boolean>(false);
	isTyping = signal<boolean>(false);
	isProcessingAction = signal<boolean>(false);
	hasNotification = signal<boolean>(false);
	currentSuggestions = signal<string[]>([]);
	isFabVisible = signal<boolean>(true);

	setFabVisible(visible: boolean) {
		this.isFabVisible.set(visible);
	}

	constructor() {
		this.supabase = this.supabaseService.client;
		this.messages.set(this.loadMessagesFromStorage());
		this.isOpen.set(this.loadIsOpenFromStorage());
	}

	private loadMessagesFromStorage(): ArnaldoChatMessage[] {
		try {
			const raw = localStorage.getItem(MESSAGES_KEY);
			if (raw) {
				return JSON.parse(raw).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
			}
		} catch {}
		return [];
	}

	private saveMessagesToStorage(msgs: ArnaldoChatMessage[]): void {
		try {
			localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-MAX_STORED_MESSAGES)));
		} catch {}
	}

	private loadIsOpenFromStorage(): boolean {
		try {
			return localStorage.getItem(OPEN_KEY) === "true";
		} catch {
			return false;
		}
	}

	private pushMessages(...msgs: ArnaldoChatMessage[]) {
		const next = [...this.messages(), ...msgs];
		this.messages.set(next);
		this.saveMessagesToStorage(next);
	}

	/** Da invocare dopo aver mutato un messaggio esistente (es. stato di un suggerimento). */
	private persist() {
		this.messages.set([...this.messages()]);
		this.saveMessagesToStorage(this.messages());
	}

	toggleChat(): void {
		const next = !this.isOpen();
		this.isOpen.set(next);
		try {
			localStorage.setItem(OPEN_KEY, String(next));
		} catch {}
		if (next) this.hasNotification.set(false);
	}

	openChat(): void {
		if (!this.isOpen()) this.toggleChat();
	}

	clearChat(): void {
		this.messages.set([]);
		this.currentSuggestions.set([]);
		try {
			localStorage.removeItem(MESSAGES_KEY);
		} catch {}
	}

	async sendUserQuery(userQuery: string, pageContext: ArnaldoPageContext): Promise<void> {
		const queryText = userQuery.trim();
		if (!queryText) return;

		this.pushMessages({ id: "user_" + Date.now(), sender: "user", text: queryText, timestamp: new Date(), pageContext });
		this.isTyping.set(true);

		try {
			const res = await this.sendMessage(this.messages(), pageContext);
			const base = { sender: "arnaldo" as const, timestamp: new Date(), pageContext };
			const newMessages: ArnaldoChatMessage[] = [
				{ ...base, id: "arnaldo_" + Date.now(), text: res.replyText, report: res.report || undefined },
				...res.suggestions.map((sug, i) => ({
					...base,
					id: `arnaldo_sug_${Date.now()}_${i}`,
					text: i === 0 ? "Ecco cosa ti propongo di segnare in calendario:" : "",
					suggestion: { ...sug, status: "pending" as const }
				}))
			];
			this.pushMessages(...newMessages);
			if (res.suggestedQuestions.length) this.currentSuggestions.set(res.suggestedQuestions);
			if (!this.isOpen()) this.hasNotification.set(true);
		} catch (err: any) {
			this.pushMessages({
				id: "arnaldo_err_" + Date.now(),
				sender: "arnaldo",
				text: `${err?.message || "Si è verificato un errore durante la risposta."}`,
				timestamp: new Date(),
				isError: true
			});
		} finally {
			this.isTyping.set(false);
		}
	}

	async acceptSuggestion(msg: ArnaldoChatMessage): Promise<void> {
		if (!msg.suggestion || this.isProcessingAction()) return;
		this.isProcessingAction.set(true);
		try {
			await this.farmStore.ensureLoaded();
			const plantIds = (msg.suggestion.plant_ids || []).filter(id => this.farmStore.getPlant(id));
			await this.operations.create({
				farm_id: this.farmStore.farm()?.id || "",
				title: msg.suggestion.title,
				description: msg.suggestion.description,
				type: EVENT_TYPE_META[msg.suggestion.type] ? msg.suggestion.type : "other",
				start: msg.suggestion.start,
				end: msg.suggestion.end || msg.suggestion.start,
				all_day: !!msg.suggestion.all_day,
				source: "arnaldo",
				status: "confirmed",
				suggestion_reason: msg.suggestion.suggestion_reason,
				suggested_at: new Date().toISOString(),
				confirmed_at: new Date().toISOString(),
				plant_ids: plantIds,
				work_status: "todo"
			});
			msg.suggestion.status = "accepted";
			this.persist();
			this.pushMessages({
				id: "arnaldo_ack_" + Date.now(),
				sender: "arnaldo",
				text: `Ben fatto! Ho segnato "${msg.suggestion.title}" sul calendario. Vedrai che la terra ti ringrazierà.`,
				timestamp: new Date()
			});
		} catch {
			this.pushMessages({
				id: "arnaldo_ack_err_" + Date.now(),
				sender: "arnaldo",
				text: "Impossibile salvare l'attività nel calendario. Riprova più tardi.",
				timestamp: new Date(),
				isError: true
			});
		} finally {
			this.isProcessingAction.set(false);
		}
	}

	async rejectSuggestion(msg: ArnaldoChatMessage): Promise<void> {
		if (!msg.suggestion || this.isProcessingAction()) return;
		msg.suggestion.status = "rejected";
		this.persist();
		this.pushMessages({
			id: "arnaldo_rej_" + Date.now(),
			sender: "arnaldo",
			text: `D'accordo, lasciamo stare "${msg.suggestion.title}" per ora. Ci torniamo su quando lo ritieni opportuno.`,
			timestamp: new Date()
		});
	}

	/**
	 * Costruisce la "memoria" completa di Arnaldo: terreno, piante, interventi con stato,
	 * note, raccolte con report, contabilità, foto, meteo agronomico e stagione.
	 */
	async buildGroundingContext(pageContext: ArnaldoPageContext) {
		await Promise.all([
			this.farmStore.ensureLoaded(),
			this.operations.load(),
			this.notesService.load(),
			this.harvestService.load(),
			this.expensesService.load(),
			this.photosService.load()
		]).catch(() => undefined);

		const farm: Farm | null = this.farmStore.farm();
		const plants = this.farmStore.plants();
		const plantName = (id: string) => this.farmStore.getPlant(id)?.name || id;

		let selectedPlant: Plant | null = null;
		const match = this.router.url.match(/\/land\/plant\/([^/?#]+)/);
		if (match) selectedPlant = this.farmStore.getPlant(match[1]) ?? null;

		let weather: WeatherData | null = null;
		if (farm?.latitude != null && farm?.longitude != null) {
			try {
				weather = await this.weatherService.getWeatherCached(Number(farm.latitude), Number(farm.longitude));
			} catch {
				weather = null;
			}
		}

		const now = new Date();
		const month = now.getMonth() + 1;
		const operationsSummary = this.operations.sorted().slice(0, 150).map(e => {
			const details = parseOperationDescription(e.description);
			const status = this.operations.effectiveStatus(e);
			return {
				id: e.id,
				title: e.title,
				type: EVENT_TYPE_META[e.type]?.label || e.type,
				start: e.start,
				end: e.end,
				workStatus: WORK_STATUS_META[status].label,
				product: details.product || undefined,
				dose: details.dose || undefined,
				notes: details.notes || undefined,
				plants: (e.plant_ids || []).length > 20 ? `${e.plant_ids!.length} piante` : (e.plant_ids || []).map(plantName),
				source: e.source
			};
		});

		const today = weather ? daySnapshot(weather, 0) : null;
		const weatherSummary = weather
			? {
					now: {
						temperature: weather.current.temperature,
						apparent: weather.current.apparentTemperature,
						humidity: weather.current.humidity,
						windSpeed: weather.current.windSpeed,
						windGusts: weather.current.windGusts,
						dewPoint: weather.current.dewPoint,
						cloudCover: weather.current.cloudCover,
						pressure: weather.current.pressure,
						condition: weatherCodeInfo(weather.current.weatherCode).label
					},
					today,
					sprayWindowToday: today ? sprayWindow(today) : null,
					agronomicRisksToday: today ? agronomicRisks(today, month) : [],
					forecast: [1, 2, 3, 4, 5, 6].map(o => daySnapshot(weather!, o)).filter(Boolean),
					yesterday: daySnapshot(weather, -1)
				}
			: null;

		const expenses = this.expensesService.expenses();
		return {
			today: now.toISOString(),
			pageContext,
			pageDescription: PAGE_CONTEXT_DESCRIPTIONS[pageContext],
			season: oliveSeasonPhase(month),
			farm: farm ? { name: farm.name, mainCrop: farm.main_crop, latitude: farm.latitude, longitude: farm.longitude, layout: farm.layout_type } : null,
			plantsCount: plants.length,
			healthStats: this.farmStore.healthStats(),
			allPlants: plants.map(p => ({
				id: p.id,
				name: p.name,
				species: p.species,
				variety: p.variety || undefined,
				plantingYear: p.planting_year || undefined,
				status: p.status,
				lastTreatmentAt: p.last_treatment_at || undefined,
				lastTreatmentType: p.last_treatment_type || undefined
			})),
			selectedPlant: selectedPlant
				? {
						...selectedPlant,
						notes: this.notesService.forPlant(selectedPlant.id!).map(n => ({ date: n.created_at, text: n.content })),
						operations: operationsSummary.filter(o => this.operations.events().find(e => e.id === o.id)?.plant_ids?.includes(selectedPlant!.id!)),
						photos: this.photosService.forPlant(selectedPlant.id!).map(p => p.caption || "foto senza didascalia")
					}
				: null,
			operations: operationsSummary,
			generalNotes: this.notesService.generalNotes().map(n => ({ title: n.title, text: n.content, pinned: n.pinned, reminder: n.reminder_date, date: n.created_at })),
			plantNotes: this.notesService.plantNotes().slice(0, 80).map(n => ({ plant: plantName(n.plant_id!), text: n.content, date: n.created_at })),
			harvests: this.harvestService.harvests().map(h => ({
				date: h.date,
				quintals: h.quintals,
				liters: h.liters,
				cost: h.cost,
				plants: h.plant_ids?.length || "tutte",
				notes: h.notes,
				report: h.report ? { score: h.report.score, grade: h.report.grade, yieldPct: h.report.yieldPct, costPerLiter: h.report.costPerLiter, insights: h.report.insights } : null
			})),
			accounting: {
				total: this.expensesService.total(),
				currentYear: this.expensesService.totalForYear(now.getFullYear()),
				byCategory: this.expensesService.byCategory().map(c => ({ category: EXPENSE_CATEGORY_META[c.category].label, total: c.total })),
				latest: expenses.slice(0, 60).map(e => ({ date: e.date, category: EXPENSE_CATEGORY_META[e.category]?.label, description: e.description, amount: e.amount, supplier: e.supplier }))
			},
			photos: { total: this.photosService.photos().length, captions: this.photosService.photos().slice(0, 30).map(p => p.caption).filter(Boolean) },
			weather: weatherSummary
		};
	}

	async sendMessage(history: ArnaldoChatMessage[], pageContext: ArnaldoPageContext): Promise<ArnaldoResponse> {
		const groundingContext = await this.buildGroundingContext(pageContext);

		const formattedMessages = history
			.filter(m => !m.isError && m.text)
			.slice(-40)
			.map(m => ({
				role: m.sender === "user" ? ("user" as const) : ("model" as const),
				text: m.pageContext && m.sender === "user" ? `[pagina: ${m.pageContext}] ${m.text}` : m.text
			}));

		const payload = { pageContext, messages: formattedMessages, groundingContext };

		// La chiave Gemini vive solo nei secret della Edge Function: mai nel bundle del browser.
		const { data, error } = await this.supabase.functions.invoke("arnaldo", { body: payload });
		if (error || !data?.replyText) {
			const detail = data?.error || (await readFunctionError(error));
			throw new Error(friendlyArnaldoError(detail));
		}
		return this.normalizeResponse(data);
	}

	private normalizeResponse(parsed: any): ArnaldoResponse {
		const report = parsed?.report && parsed.report.markdown ? { title: parsed.report.title || "Report di Arnaldo", markdown: String(parsed.report.markdown) } : null;
		return {
			replyText: parsed?.replyText || "",
			suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
			suggestedQuestions: Array.isArray(parsed?.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 4) : [],
			report
		};
	}
}

/** Traduce gli errori tecnici (Gemini, rete, autenticazione) in un messaggio comprensibile. */
function friendlyArnaldoError(detail: string | null): string {
	const text = detail || "";
	if (/credits are depleted|billing|"code":\s*402|RESOURCE_EXHAUSTED/i.test(text) && /402|credit|billing/i.test(text)) {
		return "Arnaldo è a riposo: il credito dell'API Gemini è esaurito. Ricaricalo da Google AI Studio e riprova.";
	}
	if (/429|quota|rate limit/i.test(text)) return "Arnaldo ha ricevuto troppe domande in poco tempo. Riprova tra un minuto.";
	if (/non autorizzato|401|jwt/i.test(text)) return "Sessione scaduta: esci e rientra nell'app per parlare con Arnaldo.";
	if (/GEMINI_API_KEY/i.test(text)) return "Arnaldo non è configurato sul server (chiave Gemini mancante).";
	return "Arnaldo non è raggiungibile in questo momento. Riprova tra poco.";
}

async function readFunctionError(error: any): Promise<string | null> {
	try {
		const body = await error?.context?.json?.();
		return body?.error ? String(body.error) : error?.message || null;
	} catch {
		return error?.message || null;
	}
}

/**
 * System prompt di Arnaldo, condiviso con la Edge Function `arnaldo`
 * (tenere allineato il testo in supabase/functions/arnaldo/index.ts).
 */
export function buildArnaldoSystemPrompt(pageContext: string, groundingContext: unknown): string {
	return `Sei Arnaldo, l'assistente AI di campAIgn per la cura del terreno e degli uliveti.

Chi sei (anima e personalità):
- Sei il nonno dell'utente: un contadino che ha lavorato la terra per tutta la vita, con fatica, onestà e passione. Ami le piante al punto da parlarci.
- Tratti l'utente come un nipote a cui vuoi bene e a cui vuoi tramandare il mestiere. Sei schietto, concreto, caloroso ma MAI sdolcinato, melenso o teatrale.
- Unisci la saggezza pratica di una vita nei campi a una solida preparazione scientifica: sei esperto di agronomia, olivicoltura, difesa fitosanitaria (anche biologica e integrata), nutrizione delle piante, pedologia, irrigazione, meteorologia e climatologia agraria, potatura, raccolta, frantoio e qualità dell'olio, economia aziendale agricola.

Onniscienza e memoria:
- Hai SEMPRE in memoria tutti i dati dell'utente nel groundingContext: terreno, piante e stato di salute (allPlants, healthStats), interventi passati e futuri con stato operativo (operations), note generali e note per pianta, raccolte con report (harvests), contabilità (accounting), foto (photos), meteo agronomico dettagliato di oggi e dei prossimi giorni (weather) e fase stagionale (season).
- Ricordi tutta la conversazione precedente, anche se l'utente ha cambiato pagina: collega gli argomenti.
- Non dire MAI che non hai accesso ai dati o che l'utente deve consultare un'altra pagina: rispondi tu con i dati.
- Riconosci la pagina corrente (pageContext: ${pageContext}; pageDescription nel contesto). Se la domanda è generica ("come va?", "cosa faccio?", "spiegami questo"), interpretala rispetto a ciò che l'utente vede in quella pagina. In plant-detail riferisciti a selectedPlant.
- Se mancano dati per rispondere con certezza, dillo e consiglia prudenza. Non inventare mai numeri.

Regole di risposta:
1. Italiano, Markdown pulito (grassetto per i concetti chiave, elenchi puntati per i passaggi operativi). Vai dritto al punto.
2. Dai consigli concreti e motivati con i dati (meteo, stagione, storico). Cita valori reali (es. "ET0 4,2 mm", "vento 25 km/h").
3. Se proponi attività da fare, inseriscile in "suggestions" (type: "treatment" | "maintenance" | "irrigation" | "harvest" | "other"; usa gli id reali delle piante in plant_ids se riguardano piante specifiche). Non creare mai eventi senza approvazione.
4. Se l'utente chiede un report, un riepilogo, un'analisi o un documento da scaricare, compila il campo "report" con un documento completo in Markdown (titoli con #, elenchi, tabelle con |), basato sui dati reali; nel replyText riassumi in poche righe.
5. Restituisci ESCLUSIVAMENTE un oggetto JSON valido:
{
  "replyText": "risposta in markdown",
  "suggestions": [{ "title": "", "description": "", "type": "treatment", "start": "ISO_DATE", "end": "ISO_DATE", "all_day": false, "suggestion_reason": "", "plant_ids": [] }],
  "suggestedQuestions": ["domanda di approfondimento 1", "domanda 2"],
  "report": null | { "title": "Titolo del report", "markdown": "# ...contenuto completo..." }
}

Dati di grounding in tempo reale:
${JSON.stringify(groundingContext)}`;
}
