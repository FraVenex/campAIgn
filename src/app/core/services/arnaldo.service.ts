import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { SupabaseClient } from "@supabase/supabase-js";

import { environment } from "../../../environments/environment";
import { SupabaseService } from "./supabase.service";
import { LandService, Farm } from "./land.service";
import { PlantsService, Plant } from "./plants.service";
import { CalendarService, CalendarEvent } from "./calendar.service";
import { WeatherService, WeatherData } from "./weather.service";

export type ArnaldoPageContext = "dashboard" | "meteo" | "calendar" | "archive" | "land" | "plant-detail" | "general";

export interface ArnaldoSuggestion {
	id?: string;
	title: string;
	description: string;
	type: "maintenance" | "harvest" | "irrigation" | "other";
	start: string;
	end: string;
	all_day: boolean;
	suggestion_reason: string;
	plant_ids?: string[];
	status?: "pending" | "accepted" | "rejected";
}

export interface ArnaldoChatMessage {
	id: string;
	sender: "arnaldo" | "user";
	text: string;
	timestamp: Date;
	suggestion?: ArnaldoSuggestion;
	isError?: boolean;
}

export interface ArnaldoGroundingContext {
	pageContext: ArnaldoPageContext;
	farm: Farm | null;
	plantsCount: number;
	allPlants: {
		id?: string;
		name: string;
		species: string;
		status: string;
		lastTreatmentAt?: string | null;
		lastTreatmentType?: string | null;
	}[];
	selectedPlant: Plant | null;
	upcomingEvents: {
		id?: string;
		title: string;
		type: string;
		start: string;
		end: string;
		description?: string;
		status: string;
	}[];
	pastEvents: {
		id?: string;
		title: string;
		type: string;
		start: string;
		end: string;
		completionStatus: string;
		notes: string;
	}[];
	pastEventsCount: number;
	weatherSummary: {
		temperature?: number;
		humidity?: number;
		precipitation?: number;
		windSpeed?: number;
		forecastMaxTemp?: number;
		forecastRainSum?: number;
		dailyForecast?: {
			date: string;
			maxTemp: number;
			minTemp: number;
			precipSum: number;
			windSpeed: number;
			et0?: number;
		}[];
	} | null;
}

export interface ArnaldoResponse {
	replyText: string;
	suggestions: ArnaldoSuggestion[];
	suggestedQuestions: string[];
}

@Injectable({
	providedIn: "root"
})
export class ArnaldoService {
	private http = inject(HttpClient);
	private supabase: SupabaseClient;
	private supabaseService = inject(SupabaseService);
	private landService = inject(LandService);
	private plantsService = inject(PlantsService);
	private calendarService = inject(CalendarService);
	private weatherService = inject(WeatherService);
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
			const raw = localStorage.getItem("campaign_arnaldo_chat_messages");
			if (raw) {
				const parsed = JSON.parse(raw);
				return parsed.map((m: any) => ({
					...m,
					timestamp: new Date(m.timestamp)
				}));
			}
		} catch {}
		return [];
	}

	private saveMessagesToStorage(msgs: ArnaldoChatMessage[]): void {
		try {
			localStorage.setItem("campaign_arnaldo_chat_messages", JSON.stringify(msgs));
		} catch {}
	}

	private loadIsOpenFromStorage(): boolean {
		try {
			const raw = localStorage.getItem("campaign_arnaldo_chat_is_open");
			return raw === "true";
		} catch {
			return false;
		}
	}

	private saveIsOpenToStorage(isOpen: boolean): void {
		try {
			localStorage.setItem("campaign_arnaldo_chat_is_open", String(isOpen));
		} catch {}
	}

	toggleChat(): void {
		const next = !this.isOpen();
		this.isOpen.set(next);
		this.saveIsOpenToStorage(next);
		if (next) {
			this.hasNotification.set(false);
		}
	}

	clearChat(): void {
		this.messages.set([]);
		this.currentSuggestions.set([]);
		try {
			localStorage.removeItem("campaign_arnaldo_chat_messages");
		} catch {}
	}

	async sendUserQuery(userQuery: string, pageContext: ArnaldoPageContext): Promise<void> {
		const queryText = userQuery.trim();
		if (!queryText) return;

		const userMsg: ArnaldoChatMessage = {
			id: "user_" + Date.now(),
			sender: "user",
			text: queryText,
			timestamp: new Date()
		};

		const updatedHistory = [...this.messages(), userMsg];
		this.messages.set(updatedHistory);
		this.saveMessagesToStorage(updatedHistory);
		this.isTyping.set(true);

		try {
			const res = await this.sendMessage(updatedHistory, queryText, pageContext);

			const newMessages: ArnaldoChatMessage[] = [];
			if (res.suggestions && res.suggestions.length > 0) {
				for (const sug of res.suggestions) {
					newMessages.push({
						id: "arnaldo_sug_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
						sender: "arnaldo",
						text: res.replyText,
						timestamp: new Date(),
						suggestion: sug
					});
				}
			} else {
				newMessages.push({
					id: "arnaldo_" + Date.now(),
					sender: "arnaldo",
					text: res.replyText,
					timestamp: new Date()
				});
			}

			const finalHistory = [...this.messages(), ...newMessages];
			this.messages.set(finalHistory);
			this.saveMessagesToStorage(finalHistory);

			if (res.suggestedQuestions && res.suggestedQuestions.length > 0) {
				this.currentSuggestions.set(res.suggestedQuestions);
			}
		} catch (err: any) {
			const errorMsg: ArnaldoChatMessage = {
				id: "arnaldo_err_" + Date.now(),
				sender: "arnaldo",
				text: `Errore Gemini AI: ${err?.message || "Si è verificato un errore durante la risposta."}`,
				timestamp: new Date(),
				isError: true
			};
			const finalHistory = [...this.messages(), errorMsg];
			this.messages.set(finalHistory);
			this.saveMessagesToStorage(finalHistory);
		} finally {
			this.isTyping.set(false);
		}
	}

	async acceptSuggestion(msg: ArnaldoChatMessage): Promise<void> {
		if (!msg.suggestion || this.isProcessingAction()) return;
		this.isProcessingAction.set(true);

		try {
			const farms = await this.landService.getFarms();
			const farmId = farms && farms.length > 0 && farms[0].id ? farms[0].id : "farm-default";

			const newEvent = await this.calendarService.createEvent({
				farm_id: farmId,
				title: msg.suggestion.title,
				description: msg.suggestion.description,
				type: msg.suggestion.type,
				start: msg.suggestion.start,
				end: msg.suggestion.end,
				all_day: msg.suggestion.all_day,
				source: "arnaldo",
				status: "suggested",
				suggestion_reason: msg.suggestion.suggestion_reason,
				suggested_at: new Date().toISOString(),
				plant_ids: msg.suggestion.plant_ids
			});

			if (newEvent.id) {
				await this.calendarService.acceptSuggestion(newEvent.id);
			}

			msg.suggestion.status = "accepted";

			const confirmMsg: ArnaldoChatMessage = {
				id: "arnaldo_ack_" + Date.now(),
				sender: "arnaldo",
				text: `Ben fatto! Ho segnato "${msg.suggestion.title}" sul calendario. Vedrai che la terra ti ringrazierà.`,
				timestamp: new Date()
			};

			const nextMsgs = [...this.messages(), confirmMsg];
			this.messages.set(nextMsgs);
			this.saveMessagesToStorage(nextMsgs);
		} catch {
			const errAck: ArnaldoChatMessage = {
				id: "arnaldo_ack_err_" + Date.now(),
				sender: "arnaldo",
				text: "Impossibile salvare l'attività nel calendario. Riprova più tardi.",
				timestamp: new Date(),
				isError: true
			};
			const nextMsgs = [...this.messages(), errAck];
			this.messages.set(nextMsgs);
			this.saveMessagesToStorage(nextMsgs);
		} finally {
			this.isProcessingAction.set(false);
		}
	}

	async rejectSuggestion(msg: ArnaldoChatMessage): Promise<void> {
		if (!msg.suggestion || this.isProcessingAction()) return;
		this.isProcessingAction.set(true);

		try {
			if (msg.suggestion.id) {
				await this.calendarService.dismissSuggestion(msg.suggestion.id);
			}
			msg.suggestion.status = "rejected";

			const rejectMsg: ArnaldoChatMessage = {
				id: "arnaldo_rej_" + Date.now(),
				sender: "arnaldo",
				text: `D'accordo, lasciamo stare "${msg.suggestion.title}" per ora. Nessun problema, ci torniamo su quando lo ritieni opportuno.`,
				timestamp: new Date()
			};

			const nextMsgs = [...this.messages(), rejectMsg];
			this.messages.set(nextMsgs);
			this.saveMessagesToStorage(nextMsgs);
		} catch {
		} finally {
			this.isProcessingAction.set(false);
		}
	}

	async buildGroundingContext(pageContext: ArnaldoPageContext, currentPlantId?: string): Promise<ArnaldoGroundingContext> {
		let farm: Farm | null = null;
		let plants: Plant[] = [];
		let selectedPlant: Plant | null = null;
		let upcomingEvents: CalendarEvent[] = [];
		let pastEvents: CalendarEvent[] = [];
		let weatherData: WeatherData | null = null;

		try {
			const farms = await this.landService.getFarms();
			if (farms && farms.length > 0) {
				farm = farms[0];
			}
		} catch {
			farm = null;
		}

		if (farm && farm.id) {
			try {
				plants = await this.plantsService.getPlantsByFarm(farm.id);
			} catch {
				plants = [];
			}
		}

		let activePlantId = currentPlantId;
		if (!activePlantId && this.router.url.includes("/land/plant/")) {
			const parts = this.router.url.split("/land/plant/");
			if (parts.length > 1) {
				activePlantId = parts[1].split("?")[0];
			}
		}

		if (activePlantId) {
			try {
				selectedPlant = await this.plantsService.getPlantById(activePlantId);
			} catch {
				selectedPlant = null;
			}
		}

		try {
			const confirmed = await this.calendarService.getConfirmedEvents();
			const now = new Date().toISOString();
			upcomingEvents = confirmed.filter(e => e.start >= now);
			pastEvents = confirmed.filter(e => e.start < now);
		} catch {
			upcomingEvents = [];
			pastEvents = [];
		}

		if (farm && farm.latitude !== null && farm.longitude !== null) {
			try {
				weatherData = await firstValueFrom(this.weatherService.getWeather(farm.latitude, farm.longitude));
			} catch {
				weatherData = null;
			}
		}

		const allPlants = plants.map(p => ({
			id: p.id,
			name: p.name,
			species: p.species,
			status: p.status,
			lastTreatmentAt: p.last_treatment_at || null,
			lastTreatmentType: p.last_treatment_type || null
		}));

		const upcomingSummary = upcomingEvents.map(e => ({
			id: e.id,
			title: e.title,
			type: e.type,
			start: e.start,
			end: e.end,
			description: e.description || "",
			status: e.status
		}));

		const parseEventStatusAndNotes = (desc?: string | null) => {
			if (!desc) return { status: "non_completata", notes: "" };
			let status = "non_completata";
			if (desc.startsWith("[STATUS:completata]")) status = "completata";
			else if (desc.startsWith("[STATUS:completata_note]")) status = "completata_note";
			else if (desc.startsWith("[STATUS:non_completata]")) status = "non_completata";
			const notes = desc.replace(/^\[STATUS:(completata|completata_note|non_completata)\]\s*/, "");
			return { status, notes };
		};

		const pastSummary = pastEvents
			.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
			.map(e => {
				const parsed = parseEventStatusAndNotes(e.description);
				return {
					id: e.id,
					title: e.title,
					type: e.type,
					start: e.start,
					end: e.end,
					completionStatus: parsed.status,
					notes: parsed.notes
				};
			});

		let weatherSummary = null;
		if (weatherData && weatherData.current) {
			const dailyForecast = (weatherData.daily?.dates || []).map((date, idx) => ({
				date,
				maxTemp: weatherData.daily?.maxTemps?.[idx] ?? 0,
				minTemp: weatherData.daily?.minTemps?.[idx] ?? 0,
				precipSum: weatherData.daily?.precipSums?.[idx] ?? 0,
				windSpeed: weatherData.daily?.windSpeeds?.[idx] ?? 0,
				et0: weatherData.daily?.et0?.[idx] ?? 0
			}));

			weatherSummary = {
				temperature: weatherData.current.temperature,
				humidity: weatherData.current.humidity,
				precipitation: weatherData.current.precipitation,
				windSpeed: weatherData.current.windSpeed,
				forecastMaxTemp: weatherData.daily?.maxTemps?.[0],
				forecastRainSum: weatherData.daily?.precipSums?.[0],
				dailyForecast
			};
		}

		return {
			pageContext,
			farm,
			plantsCount: plants.length,
			allPlants,
			selectedPlant,
			upcomingEvents: upcomingSummary,
			pastEvents: pastSummary,
			pastEventsCount: pastSummary.length,
			weatherSummary
		};
	}

	async sendMessage(history: ArnaldoChatMessage[], userQuery: string, pageContext: ArnaldoPageContext): Promise<ArnaldoResponse> {
		const groundingContext = await this.buildGroundingContext(pageContext);

		const formattedMessages = history
			.filter(m => !m.isError)
			.map(m => ({
				role: m.sender === "user" ? ("user" as const) : ("model" as const),
				text: m.text
			}));

		const payload = {
			pageContext,
			messages: formattedMessages,
			groundingContext
		};

		try {
			const { data, error } = await this.supabase.functions.invoke("arnaldo", {
				body: payload
			});

			if (!error && data && data.replyText) {
				return {
					replyText: data.replyText,
					suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
					suggestedQuestions: Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : []
				};
			}
		} catch {}

		const apiKey = (environment as any).geminiApiKey;
		const model = (environment as any).geminiModel || "gemini-2.0-flash";

		if (!apiKey || apiKey.includes("your_gemini_api_key")) {
			throw new Error("La chiave API Gemini non è stata ancora configurata. Inserisci la tua API Key nel file environment.ts o nei secret Supabase.");
		}

		return await this.callGeminiDirect(apiKey, model, pageContext, formattedMessages, groundingContext);
	}

	private async callGeminiDirect(
		apiKey: string,
		model: string,
		pageContext: ArnaldoPageContext,
		messages: Array<{ role: "user" | "model"; text: string }>,
		groundingContext: ArnaldoGroundingContext
	): Promise<ArnaldoResponse> {
		const systemInstruction = `Sei Arnaldo, l’assistente AI di campAIgn per la cura del terreno e degli uliveti.
Operi come un GEM personalizzato di Gemini dotato di memoria continua ed evolutiva:
- Mantieni la memoria completa e persistente delle conversazioni passate con l'utente, collegando domande e argomenti discussi in precedenza anche se l'utente naviga tra pagine diverse dell'app.
- Sei costantemente consapevole della pagina in cui l'utente si trova in questo momento (pageContext: ${pageContext}) e dei dati in tempo reale forniti in groundingContext.
- Impara dalle conversazioni: fai tesoro delle preferenze dell'utente, delle sue abitudini di lavoro e dei dettagli specifici sulle sue piante e terreni per anticipare le sue necessità e suggerire proattivamente azioni coerenti con la pagina attiva.
- Se prima l'utente ti ha parlato di una pianta specifica, di un trattamento o di un dubbio e poi naviga in un'altra pagina (es. Calendario, Meteo, Terreno), ricorda quel contesto e offri consigli pertinenti e predittivi.

Chi sei veramente (La tua anima e personalità):
- Ti chiami Arnaldo: il nonno dell'utente, un uomo saggio che ha lavorato la terra per tutta la vita con fatica, onestà e profonda passione.
- Tratti l'utente come un nipote a cui vuoi bene e di cui ti fidi per portare avanti la tua eredità: il tuo più grande desiderio è che impari ad amare, capire e custodire questo terreno affinché gli ulivi e le piante continuino a vivere e dare frutti sani per le generazioni future.
- Ami la terra al punto da parlare con le piante: per te gli ulivi non sono numeri o oggetti, ma creature vive che respirano, hanno sete, sentono il freddo o il vento e comunicano con chi sa osservarle con rispetto.
- NON SEI MAI SDOLCINATO, MELENSO O TEATRALE: sei un contadino autentico, schietto e concreto. Il tuo affetto non si esprime con smancerie o moine, ma con consigli sinceri, pratici, incoraggiamenti calorosi e la premura di chi vuole insegnare il mestiere senza arroganza ("Bravo, hai fatto bene a controllare", "Ascolta il nonno: rimbocchiamoci le maniche", "La terra non aspetta, ma ha i suoi tempi").
- Niente risposte fredde da manuale o distaccate: usa un linguaggio vivo, amichevole, caloroso e naturale in italiano, unendo l'affetto familiare a una solida competenza agronomica pratica.

Ruolo e responsabilità:
- Conosci sempre la pagina corrente (pageContext: ${pageContext}) e usi il contesto reale ed esaustivo fornito in groundingContext.
- Non dire MAI che non hai i dettagli di un'attività o che non puoi accedere al singolo intervento: hai già TUTTI i dati storici a disposizione in groundingContext.pastEvents e la memoria dei messaggi precedenti.
- Rispondi con la voce calda e concreta di un nonno esperto, andando dritto al punto operativo senza preamboli noiosi.
- Suggerisci, consigli e guidi con cura; non imporre mai decisioni irreversibili al posto dell'utente.

Modo di rispondere e regole d'oro:
1. Chiaro, concreto, caldo e orientato all'azione. Dai subito consigli pratici con schiettezza affettuosa.
2. Rispondi SEMPRE ed ESCLUSIVAMENTE in lingua italiana e in formato Markdown pulito per la chat (usa **grassetto** per evidenziare termini chiave o attrezzi/cure).
3. Se un consiglio non è sicuro o se i dati non bastano, dillo chiaramente e consiglia prudenza con la saggezza di chi rispetta la natura. Non inventare mai dati.
4. Se proponi una manutenzione o attività, inseriscila nell'array "suggestions" come proposta confermabile, spiegando brevemente il motivo.
5. Non creare MAI eventi definitivi o confermati nel calendario senza approvazione dell'utente.
6. Restituisci la risposta ESCLUSIVAMENTE come oggetto JSON valido con la seguente struttura:
{
  "replyText": "risposta amichevole e concreta di nonno Arnaldo in markdown",
  "suggestions": [
    {
      "title": "Titolo dell'attività",
      "description": "Istruzioni ed osservazioni operative dell'attività",
      "type": "maintenance" | "harvest" | "irrigation" | "other",
      "start": "ISO_DATE_STRING",
      "end": "ISO_DATE_STRING",
      "all_day": boolean,
      "suggestion_reason": "Motivazione basata sui dati reali e saggezza del nonno",
      "status": "pending"
    }
  ],
  "suggestedQuestions": [
    "Domanda pertinente 1 per la pagina ${pageContext}",
    "Domanda pertinente 2 per la pagina ${pageContext}"
  ]
}

Dati di grounding in tempo reale sul terreno dell'utente:
${JSON.stringify(groundingContext, null, 2)}`;

		const contents = messages.map(m => ({
			role: m.role === "user" ? "user" : "model",
			parts: [{ text: m.text }]
		}));

		if (contents.length === 0) {
			contents.push({
				role: "user",
				parts: [
					{
						text: `Richiesta per la pagina ${pageContext}. Rispondi in modo diretto senza saluti.`
					}
				]
			});
		}

		const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

		try {
			const res = await firstValueFrom(
				this.http.post<any>(url, {
					systemInstruction: { parts: [{ text: systemInstruction }] },
					contents,
					generationConfig: {
						temperature: 0.4,
						responseMimeType: "application/json"
					}
				})
			);

			const rawText = res?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!rawText) {
				throw new Error("Risposta vuota dall'API Gemini.");
			}

			try {
				const parsed = JSON.parse(rawText);
				return {
					replyText: parsed.replyText || rawText,
					suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
					suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : []
				};
			} catch {
				return {
					replyText: rawText,
					suggestions: [],
					suggestedQuestions: []
				};
			}
		} catch (err: any) {
			const errorMsg = err?.error?.error?.message || err?.message || "Errore durante la chiamata a Gemini AI.";
			throw new Error(errorMsg);
		}
	}
}
