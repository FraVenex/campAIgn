import { Component, inject, signal, computed, effect, ElementRef, ViewChild, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { WeatherService, WeatherData } from "../../../core/services/weather.service";
import { CalendarService, CalendarEvent } from "../../../core/services/calendar.service";
import { LandService } from "../../../core/services/land.service";
import { WeatherImpactService } from "../../../core/services/weather-impact.service";

export interface ChatMessage {
	id: string;
	sender: "arnaldo" | "user";
	text: string;
	timestamp: Date;
}

interface ContextConfig {
	greeting: string;
	suggestions: string[];
}

@Component({
	selector: "app-arnaldo-chat",
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
		<div class="fixed bottom-6 right-6 z-[99] flex flex-col items-end font-sans">
			@if (isOpen()) {
				<div class="w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-white rounded-camp-xl shadow-camp-xl border border-camp-sand/40 flex flex-col mb-4 overflow-hidden animate-scale-in">
					<div class="px-6 py-4 bg-camp-sage text-white flex items-center justify-between shadow-md">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl relative border border-white/20 shadow-inner">
								<span>👨‍🌾</span>
								<span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-camp-success rounded-full border-2 border-camp-sage"></span>
							</div>
							<div>
								<h3 class="font-serif font-bold text-base leading-tight">Arnaldo</h3>
								<p class="text-[9px] font-bold uppercase tracking-widest text-white/60">Assistente Agronomico</p>
							</div>
						</div>
						<button
							(click)="toggleChat()"
							class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div
						#scrollContainer
						class="flex-1 overflow-y-auto p-6 space-y-4 bg-camp-beige/20 custom-scrollbar"
					>
						@for (msg of messages(); track msg.id) {
							<div [class]="msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'">
								<div class="flex items-start gap-2.5 max-w-[80%]">
									@if (msg.sender === "arnaldo") {
										<div class="w-8 h-8 rounded-full bg-camp-sand/40 flex items-center justify-center text-sm shrink-0 border border-camp-sand/10">
											<span>👨‍🌾</span>
										</div>
									}
									<div
										[class]="
											msg.sender === 'user'
												? 'bg-camp-sage text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-sm font-medium'
												: 'bg-white text-camp-earth border border-camp-sand/30 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm font-medium'
										"
									>
										<p class="leading-relaxed whitespace-pre-line">{{ msg.text }}</p>
										<span
											[class]="msg.sender === 'user' ? 'text-white/40' : 'text-camp-olive/60'"
											class="text-[8px] block mt-1 text-right font-bold uppercase tracking-widest"
										>
											{{ msg.timestamp | date: "HH:mm" }}
										</span>
									</div>
								</div>
							</div>
						}

						@if (isTyping()) {
							<div class="flex justify-start">
								<div class="flex items-start gap-2.5">
									<div class="w-8 h-8 rounded-full bg-camp-sand/40 flex items-center justify-center text-sm shrink-0 border border-camp-sand/10 animate-pulse">
										<span>👨‍🌾</span>
									</div>
									<div class="bg-white text-camp-earth border border-camp-sand/30 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
										<span class="w-1.5 h-1.5 bg-camp-olive rounded-full animate-bounce"></span>
										<span class="w-1.5 h-1.5 bg-camp-olive rounded-full animate-bounce [animation-delay:0.2s]"></span>
										<span class="w-1.5 h-1.5 bg-camp-olive rounded-full animate-bounce [animation-delay:0.4s]"></span>
									</div>
								</div>
							</div>
						}
					</div>

					<div class="p-3 bg-white border-t border-camp-sand/30 flex flex-col gap-2">
						@if (currentSuggestions().length > 0) {
							<div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 custom-scrollbar shrink-0">
								@for (sug of currentSuggestions(); track sug) {
									<button
										(click)="selectSuggestion(sug)"
										class="px-3.5 py-1.5 bg-camp-cream hover:bg-camp-sand/50 text-camp-earth text-[10px] font-bold uppercase tracking-wider rounded-full border border-camp-sand/30 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
									>
										{{ sug }}
									</button>
								}
							</div>
						}

						<form
							(ngSubmit)="sendMessage()"
							class="flex items-center gap-2"
						>
							<input
								type="text"
								[(ngModel)]="inputText"
								name="chatInput"
								placeholder="Chiedi ad Arnaldo..."
								autocomplete="off"
								class="flex-1 bg-camp-cream/20 border border-camp-sand/50 focus:border-camp-sage rounded-xl px-4 py-2.5 text-xs text-camp-earth focus:outline-none transition-all placeholder-camp-olive/30 shadow-inner"
							/>
							<button
								type="submit"
								[disabled]="!inputText().trim()"
								class="w-10 h-10 rounded-xl bg-camp-sage hover:bg-camp-earth text-white flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4.5 w-4.5 rotate-90"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
									/>
								</svg>
							</button>
						</form>
					</div>
				</div>
			}

			<button
				(click)="toggleChat()"
				class="w-16 h-16 rounded-full bg-camp-sage hover:bg-camp-earth text-white flex items-center justify-center shadow-camp-xl hover:scale-105 active:scale-95 transition-all duration-300 relative group"
			>
				@if (!isOpen()) {
					<span class="absolute inset-0 rounded-full bg-camp-sage/30 animate-ping group-hover:hidden"></span>
				}
				<span class="text-3xl transition-transform duration-300 group-hover:rotate-12">👨‍🌾</span>
				@if (hasNotification() && !isOpen()) {
					<span class="absolute top-0 right-0 w-4 h-4 bg-camp-accent rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">!</span>
				}
			</button>
		</div>
	`,
	styles: [
		`
			.animate-scale-in {
				animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
			}
			@keyframes scaleIn {
				from {
					opacity: 0;
					transform: scale(0.95) translateY(20px);
				}
				to {
					opacity: 1;
					transform: scale(1) translateY(0);
				}
			}
			.custom-scrollbar::-webkit-scrollbar {
				height: 4px;
				width: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-track {
				background: transparent;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb {
				background: #e8e4d9;
				border-radius: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb:hover {
				background: #d8d4c9;
			}
		`
	]
})
export class ArnaldoChatComponent implements OnInit {
	@ViewChild("scrollContainer") private scrollContainer!: ElementRef;

	private router = inject(Router);
	private weatherService = inject(WeatherService);
	private calendarService = inject(CalendarService);
	private landService = inject(LandService);
	private weatherImpactService = inject(WeatherImpactService);

	isOpen = signal(false);
	inputText = signal("");
	messages = signal<ChatMessage[]>([]);
	isTyping = signal(false);
	hasNotification = signal(true);

	weatherData = signal<WeatherData | null>(null);
	eventsData = signal<CalendarEvent[]>([]);

	private currentUrl = toSignal(
		this.router.events.pipe(
			filter(event => event instanceof NavigationEnd),
			map(event => (event as NavigationEnd).urlAfterRedirects)
		),
		{ initialValue: this.router.url }
	);

	routeContext = computed(() => {
		const url = this.currentUrl();
		if (url.includes("/dashboard")) return "dashboard";
		if (url.includes("/meteo")) return "meteo";
		if (url.includes("/calendar")) return "calendar";
		if (url.includes("/archive")) return "archive";
		if (url.includes("/land/plant/")) return "plant-detail";
		if (url.includes("/land")) return "land";
		if (url.includes("/plants")) return "plants";
		return "general";
	});

	private contexts: Record<string, ContextConfig> = {
		dashboard: {
			greeting: "Ciao! Sono Arnaldo. Vuoi una panoramica sulle tue attività o ti interessa sapere se il meteo di oggi è idoneo ai lavori?",
			suggestions: ["Ci sono conflitti meteo per le mie attività?", "Quali attività ho in programma?", "Com'è la situazione del mio terreno?"]
		},
		meteo: {
			greeting: "Vedo che stai analizzando il clima. Posso incrociare le previsioni con le tue attività in calendario per suggerirti le finestre migliori.",
			suggestions: ["Come impatta questo meteo sulle mie attività?", "Si possono fare trattamenti oggi?", "Cos'è l'Evapotraspirazione (ET0)?"]
		},
		calendar: {
			greeting: "Siamo nella sezione pianificazione. Vuoi verificare l'impatto del meteo sulle attività in programma o spostarle in una giornata migliore?",
			suggestions: ["Quali attività sono a rischio meteo?", "Quali attività mi suggerisci di pianificare?", "Posso trascinare le attività?"]
		},
		archive: {
			greeting: "Benvenuto nell'archivio storico delle attività. Analizzare il passato è fondamentale per migliorare la cura del tuo terreno. Cosa vorresti cercare?",
			suggestions: ["Perché è utile lo storico?", "Come posso filtrare le attività?", "Consigli per la compilazione dei log"]
		},
		land: {
			greeting: "Questa è l'area dedicata al tuo terreno. Conoscere le caratteristiche fisiche e la disposizione è la base di un buon raccolto. Cosa ti interessa approfondire?",
			suggestions: ["Come influisce la disposizione delle piante?", "Qual è il layout consigliato?", "Come posso modificare le coordinate?"]
		},
		plants: {
			greeting: "Qui gestiamo le tue piante. Ogni ulivo ha le sue necessità a seconda dell'età e della disposizione. Di cosa vorresti parlare?",
			suggestions: ["Ogni quanto vanno irrigate le piante?", "Quali malattie dell'olivo devo prevenire?", "Consigli per la concimazione"]
		},
		"plant-detail": {
			greeting: "Stai visualizzando la scheda di questa pianta. Posso aiutarti a interpretare il suo stato di salute, suggerire trattamenti specifici o spiegarti come programmare la manutenzione.",
			suggestions: ["Come interpreto lo stato della pianta?", "Quando programmare la prossima potatura?", "Quali foto sono utili per la diagnosi?"]
		},
		general: {
			greeting: "Ciao! Sono Arnaldo, il tuo assistente virtuale per la cura dell'uliveto. Come posso aiutarti oggi?",
			suggestions: ["Come funziona campAIgn?", "Quali colture sono supportate?", "Come inserisco un nuovo terreno?"]
		}
	};

	currentSuggestions = computed(() => {
		const ctx = this.routeContext();
		return this.contexts[ctx]?.suggestions || [];
	});

	constructor() {
		effect(
			() => {
				const ctx = this.routeContext();
				this.initializeContext(ctx);
			},
			{ allowSignalWrites: true }
		);
	}

	async ngOnInit() {
		try {
			const farms = await this.landService.getFarms();
			if (farms.length > 0 && farms[0].latitude && farms[0].longitude) {
				this.weatherService.getWeather(farms[0].latitude, farms[0].longitude).subscribe({
					next: data => this.weatherData.set(data),
					error: () => {}
				});
			}
			const events = await this.calendarService.getConfirmedEvents();
			this.eventsData.set(events);
		} catch {}
	}

	toggleChat() {
		this.isOpen.update(val => !val);
		if (this.isOpen()) {
			this.hasNotification.set(false);
			this.scrollToBottom();
		}
	}

	private initializeContext(ctx: string) {
		const config = this.contexts[ctx] || this.contexts["general"];
		const welcomeMsg: ChatMessage = {
			id: "welcome_" + Date.now(),
			sender: "arnaldo",
			text: config.greeting,
			timestamp: new Date()
		};
		this.messages.set([welcomeMsg]);
		if (!this.isOpen()) {
			this.hasNotification.set(true);
		}
		this.scrollToBottom();
	}

	selectSuggestion(sug: string) {
		const userMsg: ChatMessage = {
			id: "user_" + Date.now(),
			sender: "user",
			text: sug,
			timestamp: new Date()
		};
		this.messages.update(msgs => [...msgs, userMsg]);
		this.scrollToBottom();
		this.simulateArnaldoResponse(sug);
	}

	sendMessage() {
		const text = this.inputText().trim();
		if (!text) return;

		const userMsg: ChatMessage = {
			id: "user_" + Date.now(),
			sender: "user",
			text: text,
			timestamp: new Date()
		};

		this.messages.update(msgs => [...msgs, userMsg]);
		this.inputText.set("");
		this.scrollToBottom();
		this.simulateArnaldoResponse(text);
	}

	private simulateArnaldoResponse(text: string) {
		this.isTyping.set(true);
		this.scrollToBottom();

		setTimeout(() => {
			const reply = this.getAnswerForText(text);
			const arnaldoMsg: ChatMessage = {
				id: "arnaldo_" + Date.now(),
				sender: "arnaldo",
				text: reply,
				timestamp: new Date()
			};
			this.messages.update(msgs => [...msgs, arnaldoMsg]);
			this.isTyping.set(false);
			this.scrollToBottom();
		}, 900);
	}

	private getAnswerForText(text: string): string {
		const lower = text.toLowerCase();
		const weather = this.weatherData();
		const events = this.eventsData();

		if (
			lower.includes("conflitt") || 
			lower.includes("rischio meteo") || 
			lower.includes("impatto") || 
			lower.includes("problemi meteo")
		) {
			if (!weather) {
				return "Al momento i dati meteo non sono disponibili per valutare le tue attività in calendario.";
			}
			if (!events || events.length === 0) {
				return "Non ci sono attività in calendario per cui valutare conflitti meteo. Puoi programmarne di nuove dalla sezione Calendario!";
			}

			const conflicts: string[] = [];
			events.forEach(ev => {
				const evalRes = this.weatherImpactService.evaluateEventImpact(ev, weather);
				if (evalRes.status === "attention") {
					let line = `• "${ev.title}" (${new Date(ev.start).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}): ${evalRes.reason}`;
					if (evalRes.betterWindow) {
						line += ` -> Consiglio: sposta al ${evalRes.betterWindow.dateLabel}.`;
					}
					conflicts.push(line);
				}
			});

			if (conflicts.length > 0) {
				return `Ecco le attività che richiedono attenzione causa meteo:\n\n${conflicts.join("\n\n")}\n\nPuoi rivederle e riprogrammarle dal Calendario.`;
			} else {
				return "Ho controllato le tue attività in programma rispetto alle previsioni a 7 giorni: non risulta alcuna criticità meteo rilevante! Puoi procedere regolarmente.";
			}
		}

		if (lower.includes("trattament") || lower.includes("fogliari")) {
			if (weather?.current) {
				const wind = weather.current.windSpeed ?? 0;
				const precip = weather.current.precipitation ?? 0;
				if (wind > 20) {
					return `Oggi il vento soffia a ${wind} km/h. Ti sconsiglio vivamente di effettuare trattamenti fogliari per evitare la dispersione del prodotto.`;
				}
				if (precip > 2) {
					return `Oggi sono previsti ${precip} mm di pioggia. Meglio evitare trattamenti fogliari per scongiurare il dilavamento.`;
				}
				return `Attualmente il meteo registra vento a ${wind} km/h e pioggia a ${precip} mm. Le condizioni generali sono idonee per i trattamenti fogliari.`;
			}
			return "Se c'è vento forte (sopra i 20 km/h) o pioggia imminente, ti sconsiglio vivamente trattamenti fogliari o nebulizzazioni.";
		}

		if (lower.includes("irrig") || lower.includes("acqua") || lower.includes("bagnare")) {
			if (weather?.daily?.precipSums) {
				const todayPrecip = weather.daily.precipSums[0] ?? 0;
				if (todayPrecip >= 2) {
					return `Oggi sono previsti ${todayPrecip} mm di pioggia sul tuo terreno. L'irrigazione non è necessaria ed è preferibile sospenderla.`;
				}
			}
			return "Per l'irrigazione degli ulivi, la regola d'oro è evitare ristagni idrici. Utilizza l'indicatore ET0 nella pagina Meteo per calcolare il fabbisogno d'acqua stimato.";
		}

		if (lower.includes("attività") || lower.includes("programma")) {
			if (events && events.length > 0) {
				const list = events.slice(0, 3).map(e => `• ${e.title} (${new Date(e.start).toLocaleDateString("it-IT", { day: "numeric", month: "short" })})`).join("\n");
				return `Le tue prossime attività in programma sono:\n${list}\n\nPuoi consultare l'elenco completo nella sezione Calendario.`;
			}
			return "Non hai ancora attività confermate in calendario. Arnaldo può suggerirti degli interventi di manutenzione stagionale!";
		}

		if (lower.includes("potat") || lower.includes("ram") || lower.includes("tagli")) {
			return "La potatura dell'ulivo si effettua solitamente a fine inverno (febbraio-marzo), dopo le gelate ma prima della fioritura. Serve a dare luce all'interno della chioma e rimuovere i rami improduttivi.";
		}

		if (lower.includes("malat") || lower.includes("mosca") || lower.includes("fungo") || lower.includes("foglie")) {
			return "Attenzione all'occhio di pavone (macchie circolari sulle foglie) e alla mosca dell'olivo in estate. I trattamenti preventivi a base di rame sono molto efficaci e ammessi in agricoltura biologica.";
		}

		if (lower.includes("concim") || lower.includes("fertilizz")) {
			return "Usa concimi organici (come lo stallatico pellettato) a fine inverno per apportare azoto. In autunno, prediligi potassio e fosforo per rafforzare la pianta contro il gelo invernale.";
		}

		if (lower.includes("ciao") || lower.includes("buongiorno") || lower.includes("salve") || lower.includes("arnaldo")) {
			return "Ciao! Sono sempre pronto ad aiutarti con i miei consigli agronomici. Dimmi pure, cosa succede nel tuo uliveto?";
		}

		return "Interessante! Come assistente agronomico, ti consiglio di monitorare sempre le condizioni meteo e l'umidità del suolo prima di agire. C'è qualche dettaglio in particolare di cui vorresti parlare?";
	}

	private scrollToBottom() {
		setTimeout(() => {
			if (this.scrollContainer) {
				try {
					this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
				} catch {}
			}
		}, 50);
	}
}
