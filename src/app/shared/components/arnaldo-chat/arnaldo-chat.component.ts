import { Component, inject, computed, effect, ElementRef, ViewChild, signal } from "@angular/core";
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
			<div class="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-6 z-[99] flex flex-col items-end font-sans">
				<div
					class="fixed inset-0 bg-camp-earth/30 backdrop-blur-xs lg:hidden"
					(click)="toggleChat()"
				></div>

				<div class="relative w-full h-[100dvh] lg:w-96 lg:h-[520px] max-w-full lg:max-w-[calc(100vw-3rem)] bg-white rounded-none lg:rounded-camp-xl shadow-camp-xl border-camp-sand/40 lg:border flex flex-col overflow-hidden animate-scale-in z-10 pb-safe">
					<div class="px-5 py-3.5 sm:px-6 sm:py-4 bg-camp-sage text-white flex items-center justify-between shadow-md pt-safe">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-lg sm:text-xl relative border border-white/20 shadow-inner">
								<span>👨‍🌾</span>
								<span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-camp-success rounded-full border-2 border-camp-sage"></span>
							</div>
							<div>
								<h3 class="font-serif font-bold text-base leading-tight">Arnaldo</h3>
								<p class="text-[10px] text-white/70 uppercase tracking-widest leading-none mt-0.5">Assistente Agronomo</p>
							</div>
						</div>
						<div class="flex items-center gap-1">
							<button
								(click)="clearChat()"
								title="Nuova Conversazione"
								class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</button>
							<button
								(click)="toggleChat()"
								class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
								title="Chiudi"
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
					</div>

					<div
						#scrollContainer
						class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-camp-beige/20 custom-scrollbar"
					>
						@if (messages().length === 0) {
							<div class="text-center py-8 px-4 text-camp-olive/60">
								<p class="text-xs">Chiedimi quello che ti serve per l'uliveto o seleziona una delle opzioni in basso.</p>
							</div>
						}

						@for (msg of messages(); track msg.id) {
							<div [class]="msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'">
								<div class="flex items-start gap-2.5 max-w-[85%]">
									@if (msg.sender === "arnaldo") {
										<div class="w-8 h-8 rounded-full bg-camp-sand/40 flex items-center justify-center text-sm shrink-0 border border-camp-sand/10">
											<span>👨‍🌾</span>
										</div>
									}
									<div
										[class]="
											msg.sender === 'user'
												? 'bg-camp-sage text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-sm font-medium'
												: msg.isError
													? 'bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm font-medium'
													: 'bg-white text-camp-earth border border-camp-sand/30 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm font-medium'
										"
									>
										<div class="leading-relaxed" [innerHTML]="formatMarkdown(msg.text)"></div>

										@if (msg.suggestion) {
											<div class="mt-3 pt-3 border-t border-camp-sand/30 bg-camp-cream/30 p-3 rounded-xl space-y-2">
												<div class="flex items-center justify-between gap-2">
													<h4 class="font-serif font-bold text-xs text-camp-earth">{{ msg.suggestion.title }}</h4>
													<span class="px-2 py-0.5 bg-camp-sage/10 text-camp-sage text-[8px] font-bold uppercase tracking-wider rounded-full border border-camp-sage/20"> Proposta Attività </span>
												</div>
												<p class="text-xs text-camp-olive/80 leading-snug">{{ msg.suggestion.description }}</p>
												@if (msg.suggestion.suggestion_reason) {
													<p class="text-[10px] text-camp-sage italic border-l-2 border-camp-sage/40 pl-2">"{{ msg.suggestion.suggestion_reason }}"</p>
												}
												<div class="text-[9px] text-camp-olive/60 font-bold uppercase tracking-widest pt-1">📅 {{ msg.suggestion.start | date: "EEE d MMM, HH:mm" }}</div>

												<div class="pt-2 flex items-center gap-2">
													@if (!msg.suggestion.status || msg.suggestion.status === "pending") {
														<button
															(click)="acceptSuggestion(msg)"
															[disabled]="isProcessingAction()"
															class="flex-1 px-3 py-1.5 bg-camp-sage text-white text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-camp-earth transition-all shadow-sm disabled:opacity-50"
														>
															Accetta
														</button>
														<button
															(click)="rejectSuggestion(msg)"
															[disabled]="isProcessingAction()"
															class="flex-1 px-3 py-1.5 bg-white text-camp-olive text-[10px] font-bold uppercase tracking-wider rounded-full border border-camp-sand hover:bg-camp-sand/30 transition-all disabled:opacity-50"
														>
															Rifiuta
														</button>
													} @else if (msg.suggestion.status === "accepted") {
														<span class="w-full py-1 text-center bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-green-200"> Accettato ✓ </span>
													} @else if (msg.suggestion.status === "rejected") {
														<span class="w-full py-1 text-center bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-gray-200"> Rifiutato ✗ </span>
													}
												</div>
											</div>
										}

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
						@if (displaySuggestions().length > 0) {
							<div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 custom-scrollbar shrink-0">
								@for (sug of displaySuggestions(); track sug) {
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
								class="flex-1 bg-camp-cream/20 border border-camp-sand/50 focus:border-camp-sage rounded-xl px-4 py-2.5 text-sm sm:text-xs text-camp-earth focus:outline-none transition-all placeholder-camp-olive/30 shadow-inner"
							/>
							<button
								type="submit"
								[disabled]="!inputText().trim() || isTyping()"
								class="w-10 h-10 rounded-xl bg-camp-sage hover:bg-camp-earth text-white flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
			</div>
		}

		<div class="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[95] font-sans" [class.hidden]="isOpen() || !isFabVisible()">
			<button
				(click)="toggleChat()"
				aria-label="Apri chat con Arnaldo"
				class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-camp-sage hover:bg-camp-earth text-white flex items-center justify-center shadow-camp-xl hover:scale-105 active:scale-95 transition-all duration-300 relative group cursor-pointer"
			>
				@if (!isOpen()) {
					<span class="absolute inset-0 rounded-full bg-camp-sage/30 animate-ping group-hover:hidden"></span>
				}
				<span class="text-2xl sm:text-3xl transition-transform duration-300 group-hover:rotate-12">👨‍🌾</span>
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

	formatMarkdown(text: string): SafeHtml {
		if (!text) return "";
		let html = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
		html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
		html = html.replace(/`(.*?)`/g, "<code class=\"bg-camp-sand/30 px-1 py-0.5 rounded text-[11px]\">$1</code>");
		html = html.replace(/\n/g, "<br>");

		return this.sanitizer.bypassSecurityTrustHtml(html);
	}

	private getSuggestedQuestionsForContext(ctx: ArnaldoPageContext): string[] {
		switch (ctx) {
			case "dashboard":
				return ["Cosa devo fare oggi nell'uliveto?", "Com'è la situazione delle piante?"];
			case "meteo":
				return ["Come influisce il meteo sui lavori?", "Servono irrigazioni nei prossimi giorni?"];
			case "calendar":
				return ["Quali sono i prossimi interventi?", "Ho attività in sospeso?"];
			case "archive":
				return ["Mostrami le ultime attività registrate", "Quali interventi abbiamo completato?"];
			case "land":
				return ["Qual è lo stato del terreno?", "Ci sono zone che necessitano attenzione?"];
			case "plant-detail":
				return ["Quali piante necessitano cure?", "Quali interventi sono consigliati?"];
			default:
				return ["Come posso ottimizzare i lavori?", "Che consigli hai per il mio uliveto?"];
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
