import { Component, inject, computed, effect, ElementRef, ViewChild, signal, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { filter, map } from "rxjs";

import { ArnaldoService, ArnaldoChatMessage, ArnaldoPageContext } from "../../../core/services/arnaldo.service";

@Component({
	selector: "app-arnaldo-chat",
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
		@if (isOpen()) {
			<div
				class="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-5 lg:p-0 lg:inset-auto lg:bottom-24 lg:right-6 lg:block font-sans"
				role="dialog"
				aria-modal="true"
				aria-label="Assistente Arnaldo"
			>
				<div
					class="fixed inset-0 bg-camp-earth/50 backdrop-blur-xs lg:hidden transition-opacity duration-300"
					(click)="toggleChat()"
				></div>

				<div
					class="relative w-full max-w-[480px] h-[82dvh] max-h-[660px] min-h-[460px] lg:w-[400px] lg:h-[560px] lg:max-h-[calc(100vh-8rem)] bg-white rounded-3xl lg:rounded-camp-xl shadow-2xl lg:shadow-camp-xl border border-white/70 lg:border-camp-sand/50 flex flex-col overflow-hidden animate-scale-in z-10"
					(click)="$event.stopPropagation()"
				>
					<div class="px-4 py-3.5 sm:px-5 sm:py-3.5 bg-gradient-to-r from-camp-sage via-[#636854] to-camp-earth text-white flex items-center justify-between shadow-sm relative shrink-0">
						<div class="flex items-center gap-3">
							<div class="relative shrink-0">
								<div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 ring-white/60 shadow-md bg-white/20">
									<img
										src="assets/Arnaldo.jpg"
										alt="Arnaldo"
										class="w-full h-full object-cover"
									/>
								</div>
								<span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-camp-sage ring-1 ring-white/50"></span>
							</div>
							<div>
								<h3 class="font-serif font-bold text-base sm:text-lg leading-tight tracking-tight text-white">Arnaldo</h3>
								<div class="flex items-center gap-1.5 mt-0.5">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
									<p class="text-[10px] sm:text-[11px] text-white/85 font-medium tracking-wide">Custode della Terra · Online</p>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-1">
							<button
								type="button"
								(click)="clearChat()"
								title="Nuova conversazione"
								aria-label="Nuova conversazione"
								class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white/90 hover:text-white cursor-pointer"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</button>
							<button
								type="button"
								(click)="toggleChat()"
								title="Chiudi chat"
								aria-label="Chiudi chat"
								class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white cursor-pointer ml-0.5"
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
										stroke-width="2.2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>

					<div
						#scrollContainer
						class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5] custom-scrollbar"
					>
						@if (messages().length === 0) {
							<div class="py-6 px-3 text-center flex flex-col items-center justify-center animate-fade-in">
								<div class="relative mb-3">
									<div class="w-16 h-16 rounded-full overflow-hidden ring-4 ring-white shadow-camp-md bg-camp-sand/30">
										<img src="assets/Arnaldo.jpg" alt="Arnaldo" class="w-full h-full object-cover" />
									</div>
									<span class="absolute -bottom-1 -right-1 text-base">🌿</span>
								</div>
								<h4 class="font-serif font-bold text-lg text-camp-earth tracking-tight">Ciao! Sono nonno Arnaldo</h4>
								<p class="text-xs text-camp-olive leading-relaxed mt-1 max-w-[290px]">
									Ho passato una vita con le mani nella terra e parlo con gli ulivi ogni giorno. Dimmi, come stanno le piante oggi?
								</p>

								<div class="mt-4 pt-3 border-t border-camp-sand/50 w-full max-w-[340px]">
									<p class="text-[10px] font-bold uppercase tracking-wider text-camp-olive/70 mb-2">Suggerimenti rapidi</p>
									<div class="flex flex-col gap-1.5 text-left">
										@for (sug of displaySuggestions(); track sug) {
											<button
												type="button"
												(click)="selectSuggestion(sug)"
												class="text-xs text-camp-earth bg-white hover:bg-camp-cream/70 border border-camp-sand/60 rounded-xl px-3.5 py-2.5 shadow-2xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
											>
												<span class="line-clamp-2 leading-snug">{{ sug }}</span>
												<span class="text-camp-sage text-sm opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2">→</span>
											</button>
										}
									</div>
								</div>
							</div>
						}

						@for (msg of messages(); track msg.id) {
							<div [class]="msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'">
								<div class="flex items-start gap-2.5 max-w-[90%] sm:max-w-[85%]">
									@if (msg.sender === "arnaldo") {
										<div class="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-camp-sand/60 shadow-xs bg-camp-sand/30 mt-0.5">
											<img src="assets/Arnaldo.jpg" alt="Arnaldo" class="w-full h-full object-cover" />
										</div>
									}
									<div
										[class]="
											msg.sender === 'user'
												? 'bg-camp-sage text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-xs text-[13.5px] sm:text-sm font-normal'
												: msg.isError
													? 'bg-red-50 text-red-900 border border-red-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-[13.5px] sm:text-sm font-normal'
													: 'bg-white text-camp-earth border border-camp-sand/50 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-[13.5px] sm:text-sm font-normal'
										"
									>
										<div class="leading-relaxed select-text" [innerHTML]="formatMarkdown(msg.text)"></div>

										@if (msg.suggestion) {
											<div class="mt-3 pt-3 border-t border-camp-sand/30 bg-camp-cream/40 -mx-1 p-3 rounded-xl border border-camp-sand/40 space-y-2.5 shadow-2xs">
												<div class="flex items-center justify-between gap-2">
													<h4 class="font-serif font-bold text-xs text-camp-earth tracking-tight">{{ msg.suggestion.title }}</h4>
													<span class="px-2 py-0.5 bg-camp-sage/15 text-camp-sage text-[9px] font-bold uppercase tracking-wider rounded-full border border-camp-sage/20 shrink-0">Proposta</span>
												</div>
												<p class="text-xs text-camp-olive/90 leading-snug">{{ msg.suggestion.description }}</p>
												@if (msg.suggestion.suggestion_reason) {
													<div class="text-[11px] text-camp-earth/80 bg-white/80 p-2 rounded-lg border border-camp-sand/30 italic">
														"{{ msg.suggestion.suggestion_reason }}"
													</div>
												}
												<div class="flex items-center gap-1.5 text-[10px] text-camp-olive font-semibold">
													<span>📅</span>
													<span>{{ msg.suggestion.start | date: "EEE d MMM, HH:mm" }}</span>
												</div>

												<div class="pt-1 flex items-center gap-2">
													@if (!msg.suggestion.status || msg.suggestion.status === "pending") {
														<button
															type="button"
															(click)="acceptSuggestion(msg)"
															[disabled]="isProcessingAction()"
															class="flex-1 px-3 py-2 bg-camp-sage hover:bg-camp-earth text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer active:scale-98"
														>
															Accetta
														</button>
														<button
															type="button"
															(click)="rejectSuggestion(msg)"
															[disabled]="isProcessingAction()"
															class="flex-1 px-3 py-2 bg-white hover:bg-camp-cream text-camp-olive text-[11px] font-bold uppercase tracking-wider rounded-xl border border-camp-sand transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer active:scale-98"
														>
															Rifiuta
														</button>
													} @else if (msg.suggestion.status === "accepted") {
														<div class="w-full py-1.5 text-center bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-emerald-200">
															✓ Accettato
														</div>
													} @else if (msg.suggestion.status === "rejected") {
														<div class="w-full py-1.5 text-center bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-gray-200">
															Rifiutato
														</div>
													}
												</div>
											</div>
										}

										<span
											[class]="msg.sender === 'user' ? 'text-white/60' : 'text-camp-olive/60'"
											class="text-[9px] block mt-1.5 text-right font-mono tracking-wider"
										>
											{{ msg.timestamp | date: "HH:mm" }}
										</span>
									</div>
								</div>
							</div>
						}

						@if (isTyping()) {
							<div class="flex justify-start items-start gap-2.5 animate-fade-in">
								<div class="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-camp-sand/60 shadow-xs bg-camp-sand/30 mt-0.5">
									<img src="assets/Arnaldo.jpg" alt="Arnaldo" class="w-full h-full object-cover" />
								</div>
								<div class="bg-white text-camp-earth border border-camp-sand/50 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-1.5">
									<span class="w-2 h-2 bg-camp-sage rounded-full animate-bounce [animation-delay:-0.3s]"></span>
									<span class="w-2 h-2 bg-camp-sage rounded-full animate-bounce [animation-delay:-0.15s]"></span>
									<span class="w-2 h-2 bg-camp-sage rounded-full animate-bounce"></span>
									<span class="text-[11px] text-camp-olive/70 font-medium ml-1.5">Arnaldo sta scrivendo...</span>
								</div>
							</div>
						}
					</div>

					<div class="p-3 sm:p-3.5 bg-white border-t border-camp-sand/40 flex flex-col gap-2 shrink-0">
						@if (displaySuggestions().length > 0 && messages().length > 0) {
							<div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
								@for (sug of displaySuggestions(); track sug) {
									<button
										type="button"
										(click)="selectSuggestion(sug)"
										class="px-3 py-1.5 bg-camp-cream/70 hover:bg-camp-cream text-camp-earth text-[11px] font-medium rounded-full border border-camp-sand/50 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] shadow-2xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
									>
										<span class="text-camp-amber text-[10px]">✨</span>
										<span>{{ sug }}</span>
									</button>
								}
							</div>
						}

						<form
							(ngSubmit)="sendMessage()"
							class="flex items-center gap-2"
						>
							<div class="flex-1 relative flex items-center bg-camp-cream/30 border border-camp-sand/70 focus-within:border-camp-sage focus-within:ring-2 focus-within:ring-camp-sage/20 rounded-full transition-all shadow-inner px-3.5 py-1">
								<input
									type="text"
									[(ngModel)]="inputText"
									name="chatInput"
									placeholder="Chiedi ad Arnaldo..."
									autocomplete="off"
									class="w-full bg-transparent border-none focus:outline-none text-[15px] sm:text-xs text-camp-earth placeholder:text-camp-olive/50 py-1.5"
								/>
							</div>
							<button
								type="submit"
								[disabled]="!inputText().trim() || isTyping()"
								class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-camp-sage hover:bg-camp-earth text-white flex items-center justify-center transition-all shadow-xs active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
								aria-label="Invia messaggio"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4.5 w-4.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M5 10l7-7m0 0l7 7m-7-7v18"
									/>
								</svg>
							</button>
						</form>
					</div>
				</div>
			</div>
		}

		<div class="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[95] font-sans" [class.hidden]="isOpen() || !isFabVisible()">
			<button
				type="button"
				(click)="toggleChat()"
				aria-label="Apri chat con Arnaldo"
				class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-camp-earth flex items-center justify-center shadow-camp-xl hover:scale-105 active:scale-95 transition-all duration-300 relative group cursor-pointer ring-2 ring-camp-sage/40 hover:ring-camp-sage p-0.5"
			>
				<div class="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-camp-sand/30">
					<img
						src="assets/Arnaldo.jpg"
						alt="Arnaldo"
						class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
					/>
				</div>
				<span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs"></span>
				@if (hasNotification() && !isOpen()) {
					<span class="absolute -top-1 -right-1 w-5 h-5 bg-camp-terracotta rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-bounce">!</span>
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
					transform: scale(0.95) translateY(12px);
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
			.no-scrollbar::-webkit-scrollbar {
				display: none;
			}
			.no-scrollbar {
				-ms-overflow-style: none;
				scrollbar-width: none;
			}
		`
	]
})
export class ArnaldoChatComponent {
	@ViewChild("scrollContainer") private scrollContainer!: ElementRef;

	private router = inject(Router);
	private arnaldoService = inject(ArnaldoService);
	private sanitizer = inject(DomSanitizer);

	inputText = signal("");

	isOpen = this.arnaldoService.isOpen;
	messages = this.arnaldoService.messages;
	isTyping = this.arnaldoService.isTyping;
	isProcessingAction = this.arnaldoService.isProcessingAction;
	hasNotification = this.arnaldoService.hasNotification;
	isFabVisible = this.arnaldoService.isFabVisible;

	private currentUrl = toSignal(
		this.router.events.pipe(
			filter(event => event instanceof NavigationEnd),
			map(event => (event as NavigationEnd).urlAfterRedirects)
		),
		{ initialValue: this.router.url }
	);

	routeContext = computed<ArnaldoPageContext>(() => {
		const url = this.currentUrl();
		if (url.includes("/dashboard")) return "dashboard";
		if (url.includes("/meteo")) return "meteo";
		if (url.includes("/calendar")) return "calendar";
		if (url.includes("/archive")) return "archive";
		if (url.includes("/land/plant/")) return "plant-detail";
		if (url.includes("/land")) return "land";
		return "general";
	});

	displaySuggestions = computed<string[]>(() => {
		const serviceSugs = this.arnaldoService.currentSuggestions();
		if (serviceSugs && serviceSugs.length > 0) {
			return serviceSugs;
		}
		return this.getSuggestedQuestionsForContext(this.routeContext());
	});

	constructor() {
		effect(() => {
			const msgs = this.messages();
			if (msgs.length > 0 && this.isOpen()) {
				this.scrollToBottom();
			}
		});
	}

	@HostListener("window:keydown.escape")
	handleEscapeKey() {
		if (this.isOpen()) {
			this.toggleChat();
		}
	}

	formatMarkdown(text: string): SafeHtml {
		if (!text) return "";
		let html = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		html = html.replace(/\*\*(.*?)\*\*/g, "<strong class=\"font-semibold text-camp-earth\">$1</strong>");
		html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
		html = html.replace(/`(.*?)`/g, "<code class=\"bg-camp-sand/40 text-camp-earth px-1.5 py-0.5 rounded text-[11px] font-mono\">$1</code>");
		html = html.replace(/\n/g, "<br>");

		return this.sanitizer.bypassSecurityTrustHtml(html);
	}

	private getSuggestedQuestionsForContext(ctx: ArnaldoPageContext): string[] {
		switch (ctx) {
			case "dashboard":
				return ["Nonno, cosa c'è da fare oggi nell'uliveto?", "Come vedi la situazione delle piante?"];
			case "meteo":
				return ["Con questo meteo possiamo lavorare la terra?", "Servono irrigazioni nei prossimi giorni?"];
			case "calendar":
				return ["Quali sono i prossimi interventi sul campo?", "Ci sono attività che non dobbiamo scordare?"];
			case "archive":
				return ["Mostrami gli ultimi lavori che abbiamo fatto", "Quali interventi abbiamo completato?"];
			case "land":
				return ["Come vedi la terra in questo momento?", "C'è qualche pianta che ha bisogno di cure?"];
			case "plant-detail":
				return ["Come sta questa pianta secondo te?", "Che cure le faresti in questo periodo?"];
			default:
				return ["Nonno, che consigli hai per il nostro uliveto?", "Come possiamo prenderci cura del terreno?"];
		}
	}

	toggleChat() {
		this.arnaldoService.toggleChat();
		if (this.isOpen()) {
			this.scrollToBottom();
		}
	}

	clearChat() {
		this.arnaldoService.clearChat();
	}

	async selectSuggestion(sug: string) {
		const text = sug;
		await this.arnaldoService.sendUserQuery(text, this.routeContext());
		this.scrollToBottom();
	}

	async sendMessage() {
		const text = this.inputText().trim();
		if (!text) return;
		this.inputText.set("");
		await this.arnaldoService.sendUserQuery(text, this.routeContext());
		this.scrollToBottom();
	}

	async acceptSuggestion(msg: ArnaldoChatMessage) {
		await this.arnaldoService.acceptSuggestion(msg);
		this.scrollToBottom();
	}

	async rejectSuggestion(msg: ArnaldoChatMessage) {
		await this.arnaldoService.rejectSuggestion(msg);
		this.scrollToBottom();
	}

	private scrollToBottom() {
		setTimeout(() => {
			if (this.scrollContainer) {
				try {
					this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
				} catch {
				}
			}
		}, 50);
	}
}
