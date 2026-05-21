import { Component, inject, signal, computed, effect, ElementRef, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";

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
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
									@if (msg.sender === 'arnaldo') {
										<div class="w-8 h-8 rounded-full bg-camp-sand/40 flex items-center justify-center text-sm shrink-0 border border-camp-sand/10">
											<span>👨‍🌾</span>
										</div>
									}
									<div 
										[class]="msg.sender === 'user' 
											? 'bg-camp-sage text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-sm font-medium' 
											: 'bg-white text-camp-earth border border-camp-sand/30 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm font-medium'"
									>
										<p class="leading-relaxed whitespace-pre-line">{{ msg.text }}</p>
										<span [class]="msg.sender === 'user' ? 'text-white/40' : 'text-camp-olive/60'" class="text-[8px] block mt-1 text-right font-bold uppercase tracking-widest">
											{{ msg.timestamp | date: 'HH:mm' }}
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

						<form (ngSubmit)="sendMessage()" class="flex items-center gap-2">
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
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
				from { opacity: 0; transform: scale(0.95) translateY(20px); }
				to { opacity: 1; transform: scale(1) translateY(0); }
			}
			.custom-scrollbar::-webkit-scrollbar {
				height: 4px;
				width: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-track {
				background: transparent;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb {
				background: #E8E4D9;
				border-radius: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb:hover {
				background: #D8D4C9;
			}
		`
	]
})
export class ArnaldoChatComponent {
	@ViewChild("scrollContainer") private scrollContainer!: ElementRef;

	private router = inject(Router);

	isOpen = signal(false);
	inputText = signal("");
	messages = signal<ChatMessage[]>([]);
	isTyping = signal(false);
	hasNotification = signal(true);

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
		if (url.includes("/land")) return "land";
		if (url.includes("/plants")) return "plants";
		return "general";
	});

	private contexts: Record<string, ContextConfig> = {
		dashboard: {
			greeting: "Ciao! Sono Arnaldo. Vuoi una panoramica rapida sul tuo terreno o hai bisogno di consigli sulle attività di oggi?",
			suggestions: [
				"Quali attività ho oggi?",
				"Com'è la situazione del mio terreno?",
				"Mostrami un consiglio veloce"
			]
		},
		meteo: {
			greeting: "Vedo che stai analizzando il clima. Le condizioni meteo influenzano molto il lavoro nei campi. Vuoi sapere se è il momento giusto per fare trattamenti?",
			suggestions: [
				"Si possono fare trattamenti oggi?",
				"Cos'è l'Evapotraspirazione (ET0)?",
				"La temperatura del suolo è buona?"
			]
		},
		calendar: {
			greeting: "Siamo nella sezione pianificazione. Vuoi una mano a organizzare i prossimi interventi sul tuo uliveto o vuoi confermare i miei suggerimenti?",
			suggestions: [
				"Quali attività mi suggerisci di pianificare?",
				"Come gestisco un'attività passata?",
				"Posso trascinare le attività?"
			]
		},
		archive: {
			greeting: "Benvenuto nell'archivio storico delle attività. Analizzare il passato è fondamentale per migliorare la cura del tuo terreno. Cosa vorresti cercare?",
			suggestions: [
				"Perché è utile lo storico?",
				"Come posso filtrare le attività?",
				"Consigli per la compilazione dei log"
			]
		},
		land: {
			greeting: "Questa è l'area dedicata al tuo terreno. Conoscere le caratteristiche fisiche e la disposizione è la base di un buon raccolto. Cosa ti interessa approfondire?",
			suggestions: [
				"Come influisce la disposizione delle piante?",
				"Qual è il layout consigliato?",
				"Come posso modificare le coordinate?"
			]
		},
		plants: {
			greeting: "Qui gestiamo le tue piante. Ogni ulivo ha le sue necessità a seconda dell'età e della disposizione. Di cosa vorresti parlare?",
			suggestions: [
				"Ogni quanto vanno irrigate le piante?",
				"Quali malattie dell'olivo devo prevenire?",
				"Consigli per la concimazione"
			]
		},
		general: {
			greeting: "Ciao! Sono Arnaldo, il tuo assistente virtuale per la cura dell'uliveto. Come posso aiutarti oggi?",
			suggestions: [
				"Come funziona campAIgn?",
				"Quali colture sono supportate?",
				"Come inserisco un nuovo terreno?"
			]
		}
	};

	private mockAnswers: Record<string, string> = {
		"Quali attività ho oggi?": "Oggi hai in programma le attività che vedi nel calendario settimanale. Se piove, ti consiglio di svolgere lavori al coperto come la manutenzione degli attrezzi.",
		"Com'è la situazione del mio terreno?": "Il tuo terreno attivo è in ottima salute. Il monitoraggio è attivo e le coordinate GPS ci permettono di ricevere dati meteo precisi in tempo reale.",
		"Mostrami un consiglio veloce": "Certo! Ricorda di controllare l'umidità del suolo. Negli uliveti, è importante evitare ristagni d'acqua per prevenire malattie radicali.",
		"Si possono fare trattamenti oggi?": "Dipende dalle condizioni correnti. Se c'è vento forte (sopra i 20 km/h) o pioggia, ti sconsiglio vivamente trattamenti fogliari o irrigazioni programmabili.",
		"Cos'è l'Evapotraspirazione (ET0)?": "L'evapotraspirazione (ET0) indica la quantità di acqua che il terreno e le piante perdono per evaporazione e traspirazione. Ti aiuta a calcolare esattamente quanta acqua restituire con l'irrigazione.",
		"La temperatura del suolo è buona?": "Sì, la temperatura radicale a 6cm è ideale per l'attività vegetativa degli ulivi. Monitorarla ti aiuta a prevenire shock termici alle radici.",
		"Quali attività mi suggerisci di pianificare?": "In questa stagione ti suggerisco di programmare interventi di potatura verde o di concimazione organica. Trovi le mie proposte in fondo alla pagina, pronte da accettare!",
		"Come gestisco un'attività passata?": "Clicca su un'attività passata nel calendario per aggiornare lo stato di completamento (completata, con note o non svolta) e aggiungere annotazioni utili per il futuro.",
		"Posso trascinare le attività?": "Sì! Nel calendario in modalità Mese o Settimana puoi trascinare le attività da un giorno all'altro per riprogrammarle facilmente.",
		"Perché è utile lo storico?": "Esaminare lo storico delle attività ti consente di individuare pattern ricorrenti, capire quali trattamenti hanno funzionato meglio e ricordare con precisione quando hai effettuato l'ultima concimazione o potatura.",
		"Come posso filtrare le attività?": "Puoi scorrere l'elenco delle attività completate e non completate per avere un quadro chiaro degli interventi effettuati nel tempo. Usa le note per tenere traccia dei dettagli.",
		"Consigli per la compilazione dei log": "Sii il più preciso possibile nelle note: scrivi le dosi dei trattamenti, i tempi impiegati e le tue osservazioni sullo stato delle foglie o delle piante.",
		"Come influisce la disposizione delle piante?": "Una disposizione regolare (griglia) ottimizza l'uso della luce e facilita il passaggio dei mezzi agricoli. La disposizione libera asseconda la naturale pendenza del terreno.",
		"Qual è il layout consigliato?": "Dipende dal numero di piante: fino a 30 consigliamo un sesto ampio ('loose'), fino a 120 una griglia regolare ('medium_grid'), oltre 120 una griglia più densa.",
		"Come posso modificare le coordinate?": "Puoi reimpostare la posizione del terreno durante l'onboarding oppure tramite la pagina delle impostazioni del terreno (prossimamente disponibile).",
		"Ogni quanto vanno irrigate le piante?": "Gli ulivi adulti sono molto resistenti alla siccità, ma per una produzione ottimale l'irrigazione a goccia va attivata nei periodi più caldi e asciutti dell'estate.",
		"Quali malattie dell'olivo devo prevenire?": "Le principali minacce sono l'occhio di pavone (cicloconio), la rogna dell'olivo e la mosca olearia. Trattamenti preventivi con rameici dopo la potatura o piogge prolungate sono fondamentali.",
		"Consigli per la concimazione": "La concimazione azotata va effettuata a fine inverno prima della ripresa vegetativa, mentre quella fosfo-potassica va fatta in autunno per favorire lo sviluppo delle radici e la resistenza al freddo.",
		"Come funziona campAIgn?": "campAIgn ti aiuta a gestire piccoli appezzamenti e piante (specialmente ulivi) in modo semplice e intelligente, analizzando dati meteo e offrendoti consigli su misura.",
		"Quali colture sono supportate?": "L'app è ottimizzata per l'uliveto, ma supporta anche agrumi, vigneti e altre colture miste o orti.",
		"Come inserisco un nuovo terreno?": "Se hai completato l'onboarding, puoi visualizzare il tuo terreno attivo. Presto potrai aggiungere altri terreni direttamente dall'interfaccia principale!"
	};

	currentSuggestions = computed(() => {
		const ctx = this.routeContext();
		return this.contexts[ctx]?.suggestions || [];
	});

	constructor() {
		effect(() => {
			const ctx = this.routeContext();
			this.initializeContext(ctx);
		});
	}

	toggleChat() {
		this.isOpen.update(val => !val);
		if (this.isOpen()) {
			this.hasNotification.set(false);
			this.scrollToBottom();
		}
	}

	private initializeContext(ctx: string) {
		const config = this.contexts[ctx] || this.contexts['general'];
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
		}, 1000);
	}

	private getAnswerForText(text: string): string {
		if (this.mockAnswers[text]) {
			return this.mockAnswers[text];
		}

		const lower = text.toLowerCase();
		if (lower.includes("meteo") || lower.includes("tempo") || lower.includes("pioggia") || lower.includes("vento") || lower.includes("clima")) {
			return "Le condizioni meteorologiche sono cruciali. Ti consiglio di monitorare la velocità del vento (trattamenti sconsigliati sopra i 20 km/h) e di evitare trattamenti fogliari in caso di pioggia imminente.";
		}
		if (lower.includes("irrig") || lower.includes("acqua") || lower.includes("secco") || lower.includes("bagnare")) {
			return "Per l'irrigazione degli ulivi, la regola d'oro è evitare ristagni idrici. Utilizza l'indicatore ET0 (Evapotraspirazione) nella pagina Meteo per calcolare il fabbisogno d'acqua stimato.";
		}
		if (lower.includes("potat") || lower.includes("ram") || lower.includes("tagli")) {
			return "La potatura dell'ulivo si effettua solitamente a fine inverno (febbraio-marzo), dopo le gelate ma prima della fioritura. Serve a dare luce all'interno della chioma e rimuovere i rami improduttivi (succhioni e selvatici).";
		}
		if (lower.includes("malat") || lower.includes("mosca") || lower.includes("fungo") || lower.includes("foglie")) {
			return "Attenzione all'occhio di pavone (macchie circolari sulle foglie) e alla mosca dell'olivo in estate. I trattamenti preventivi a base di rame sono molto efficaci e ammessi in agricoltura biologica.";
		}
		if (lower.includes("concim") || lower.includes("fertilizz") || lower.includes("nutrimento")) {
			return "Usa concimi organici (come lo stallatico pellettato) a fine inverno per apportare azoto. In autunno, prediligi potassio e fosforo per rafforzare la pianta contro il gelo invernale.";
		}
		if (lower.includes("ciao") || lower.includes("buongiorno") || lower.includes("salve") || lower.includes("arnaldo")) {
			return "Ciao! Sono sempre pronto ad aiutarti con i miei consigli agronomici. Dimmi pure, cosa succede nel tuo uliveto?";
		}
		if (lower.includes("grazie") || lower.includes("ottimo") || lower.includes("perfetto")) {
			return "Prego! È sempre un piacere aiutarti a far crescere sani i tuoi ulivi. Se hai altre domande, chiedi pure!";
		}

		return "Interessante! Come assistente agronomico, ti consiglio di monitorare sempre le condizioni meteo e l'umidità del suolo prima di agire. C'è qualche dettaglio in particolare (potatura, irrigazione, concimazione) di cui vorresti parlare?";
	}

	private scrollToBottom() {
		setTimeout(() => {
			if (this.scrollContainer) {
				try {
					this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
				} catch {
					// Fallback silente
				}
			}
		}, 50);
	}
}
