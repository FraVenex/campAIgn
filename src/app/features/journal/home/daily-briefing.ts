import { CalendarEvent } from "../../../core/services/calendar.service";
import { EffectiveWorkStatus } from "../../../core/services/operations.store";
import { Tone, formatDateIt, toLocalDateKey } from "../../../core/constants/domain";
import { AgroAlert, DaySnapshot, SeasonPhase, agronomicRisks, sprayWindow, weatherCodeInfo } from "../../../core/utils/agronomy";

/** Consiglio del "punto del giorno" generato da regole su attività, meteo, stagione e salute piante. */
export interface BriefingItem {
	icon: string;
	title: string;
	text: string;
	tone: Tone;
	priority: number;
	link?: string;
	linkLabel?: string;
}

export interface Briefing {
	greeting: string;
	summary: string;
	items: BriefingItem[];
}

export interface BriefingInput {
	now: Date;
	userName: string;
	events: CalendarEvent[];
	today: CalendarEvent[];
	upcoming: CalendarEvent[];
	effectiveStatus: (e: CalendarEvent) => EffectiveWorkStatus;
	season: SeasonPhase;
	day: DaySnapshot | null;
	tomorrow: DaySnapshot | null;
	health: { total: number; ottimo: number; attenzione: number; stressato: number; nonValutato: number; healthyPct: number };
	dueReminders: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

function titles(list: CalendarEvent[], max = 2): string {
	const names = list.slice(0, max).map(e => `«${e.title}»`);
	const rest = list.length - names.length;
	return names.join(", ") + (rest > 0 ? ` e altri ${rest}` : "");
}

function daysFromToday(iso: string, now: Date): number {
	const a = new Date(toLocalDateKey(now)).getTime();
	const b = new Date(toLocalDateKey(iso)).getTime();
	return Math.round((b - a) / DAY_MS);
}

function relativeDay(iso: string, now: Date): string {
	const diff = daysFromToday(iso, now);
	if (diff === 0) return "oggi";
	if (diff === 1) return "domani";
	if (diff === 2) return "dopodomani";
	return formatDateIt(iso, { weekday: "long", day: "numeric", month: "short" });
}

function alertTone(level: AgroAlert["level"]): Tone {
	return level === "danger" ? "danger" : level === "warning" ? "warning" : level === "ok" ? "success" : "info";
}

/** Costruisce il briefing giornaliero con consigli concreti ordinati per priorità. */
export function buildDailyBriefing(input: BriefingInput): Briefing {
	const { now, events, today, upcoming, effectiveStatus, season, day, tomorrow, health } = input;
	const month = now.getMonth() + 1;
	const items: BriefingItem[] = [];
	const nowMs = now.getTime();

	// --- Attività passate e in ritardo
	const overdue = events.filter(e => effectiveStatus(e) === "overdue").sort((a, b) => a.start.localeCompare(b.start));
	if (overdue.length) {
		items.push({
			icon: "⚠️",
			title: `${plural(overdue.length, "intervento", "interventi")} in ritardo`,
			text: `${titles(overdue)} ${overdue.length === 1 ? "è rimasto" : "sono rimasti"} da svolgere: recuperali o segnali come saltati.`,
			tone: "warning",
			priority: 90,
			link: "/operations/log",
			linkLabel: "Apri registro"
		});
	}

	const todayOpen = today.filter(e => e.work_status !== "done" && e.work_status !== "skipped");
	if (todayOpen.length) {
		items.push({
			icon: "📋",
			title: `Oggi in programma: ${plural(todayOpen.length, "attività", "attività")}`,
			text: `${titles(todayOpen, 3)}. Aggiorna lo stato man mano che procedi.`,
			tone: "info",
			priority: 85
		});
	} else if (today.length) {
		items.push({ icon: "🎉", title: "Attività di oggi completate", text: "Tutto quello che era in programma oggi è stato gestito.", tone: "success", priority: 25 });
	}

	const recentDone = events.filter(e => e.work_status === "done" && nowMs - new Date(e.start).getTime() <= 7 * DAY_MS && new Date(e.start).getTime() <= nowMs);
	if (recentDone.length) {
		items.push({
			icon: "✅",
			title: `${plural(recentDone.length, "attività completata", "attività completate")} negli ultimi 7 giorni`,
			text: `Ultima: ${titles([...recentDone].sort((a, b) => b.start.localeCompare(a.start)), 1)}. Buon lavoro!`,
			tone: "success",
			priority: 15
		});
	}

	// --- Meteo: rischi e finestra trattamenti
	const plannedSoon = (type: CalendarEvent["type"], maxDays: number) =>
		[...todayOpen, ...upcoming].filter((e, i, arr) => e.type === type && arr.findIndex(x => x.id === e.id) === i && daysFromToday(e.start, now) <= maxDays);

	if (day) {
		const risks = agronomicRisks(day, month);
		for (const r of risks) {
			items.push({ icon: r.icon, title: r.title, text: r.text, tone: alertTone(r.level), priority: r.level === "danger" ? 95 : r.level === "warning" ? 70 : 40, link: "/meteo", linkLabel: "Meteo" });
		}

		const spray = sprayWindow(day);
		const treatments = plannedSoon("treatment", 3);
		const treatmentsToday = treatments.filter(e => daysFromToday(e.start, now) <= 0);
		if (treatmentsToday.length && spray.level === "warning") {
			items.push({ icon: "⛔", title: `Rimanda il trattamento ${titles(treatmentsToday, 1)}`, text: spray.text, tone: "danger", priority: 92, link: "/operations/log", linkLabel: "Riprogramma" });
		} else if (treatments.length && spray.level !== "warning") {
			const next = treatments[0];
			items.push({
				icon: "🧪",
				title: daysFromToday(next.start, now) <= 0 ? `Finestra favorevole per «${next.title}»` : `Anticipa «${next.title}» a oggi`,
				text: `${spray.title}: ${spray.text}${daysFromToday(next.start, now) > 0 ? ` Era previsto ${relativeDay(next.start, now)}.` : ""}`,
				tone: "success",
				priority: 80
			});
		} else if (spray.level === "ok" && [2, 3, 10, 11, 12].includes(month)) {
			const peacock = risks.some(r => r.title.includes("pavone"));
			items.push({
				icon: "🧪",
				title: "Trattamento rameico consigliato: finestra favorevole oggi",
				text: peacock
					? "Le condizioni favoriscono l'occhio di pavone e oggi vento e pioggia sono contenuti: è il momento giusto per il rame."
					: `In questa fase (${season.phase.toLowerCase()}) il rame protegge le ferite e previene le malattie fungine. ${spray.text}`,
				tone: "info",
				priority: peacock ? 78 : 58,
				link: "/operations/map",
				linkLabel: "Programma"
			});
		}

		if (tomorrow && (tomorrow.precipProb >= 60 || tomorrow.precip >= 3)) {
			const harvests = plannedSoon("harvest", 3);
			const tomorrowTreat = treatments.filter(e => daysFromToday(e.start, now) === 1);
			const rainText = `Previsti ${tomorrow.precip} mm (probabilità ${tomorrow.precipProb}%).`;
			if (harvests.length || [10, 11].includes(month)) {
				items.push({
					icon: "🌧️",
					title: "Pioggia domani: anticipa la raccolta",
					text: harvests.length ? `${rainText} Hai in programma ${titles(harvests, 1)}: se puoi, raccogli oggi con le olive asciutte.` : `${rainText} Le olive bagnate si conservano peggio: se sono pronte, raccogli oggi.`,
					tone: "warning",
					priority: 76,
					link: "/harvest/map",
					linkLabel: "Raccolta"
				});
			}
			if (tomorrowTreat.length) {
				items.push({ icon: "☔", title: "Pioggia domani: tratta oggi o rimanda", text: `${rainText} Il trattamento ${titles(tomorrowTreat, 1)} verrebbe dilavato.`, tone: "warning", priority: 82, link: "/operations/log", linkLabel: "Registro" });
			}
		}

		if (day.soilMoisture !== null && day.soilMoisture < 15 && [5, 6, 7, 8, 9].includes(month) && !plannedSoon("irrigation", 2).length) {
			items.push({ icon: "💧", title: "Terreno asciutto: valuta un'irrigazione", text: `Umidità del suolo al ${day.soilMoisture}% e nessuna irrigazione in programma nei prossimi giorni.`, tone: "warning", priority: 66, link: "/operations/map", linkLabel: "Programma" });
		}
	}

	// --- Salute delle piante
	if (health.stressato > 0) {
		items.push({ icon: "🔴", title: `${plural(health.stressato, "pianta sotto stress", "piante sotto stress")}`, text: "Passa a controllarle: cerca segni di malattie, carenze idriche o danni e annota cosa vedi.", tone: "danger", priority: 72, link: "/land/map", linkLabel: "Mappa" });
	}
	if (health.attenzione > 0) {
		items.push({ icon: "🟡", title: `${plural(health.attenzione, "pianta da osservare", "piante da osservare")}`, text: "Un giro di controllo oggi può evitare che la situazione peggiori.", tone: "warning", priority: 45, link: "/land/map", linkLabel: "Mappa" });
	}
	if (health.total > 0 && health.nonValutato === health.total) {
		items.push({ icon: "🔍", title: "Valuta lo stato delle piante", text: "Nessuna pianta è ancora stata valutata: aggiorna lo stato dalla mappa per avere consigli più precisi.", tone: "neutral", priority: 30, link: "/land/map", linkLabel: "Mappa" });
	}

	// --- Promemoria e piani futuri
	if (input.dueReminders > 0) {
		items.push({ icon: "📌", title: `${plural(input.dueReminders, "promemoria", "promemoria")} in scadenza`, text: "Hai note con promemoria per oggi o già scaduti.", tone: "accent", priority: 55, link: "/journal/notes", linkLabel: "Note" });
	}

	const nextPlanned = upcoming.find(e => daysFromToday(e.start, now) >= 1 && daysFromToday(e.start, now) <= 7);
	if (nextPlanned) {
		const soon = upcoming.filter(e => daysFromToday(e.start, now) >= 1 && daysFromToday(e.start, now) <= 7);
		items.push({
			icon: "🗓️",
			title: `Prossimamente: «${nextPlanned.title}» ${relativeDay(nextPlanned.start, now)}`,
			text: soon.length > 1 ? `In tutto ${plural(soon.length, "attività", "attività")} nei prossimi 7 giorni: prepara prodotti e attrezzi.` : "Prepara per tempo prodotti e attrezzi.",
			tone: "neutral",
			priority: 50,
			link: "/calendar",
			linkLabel: "Calendario"
		});
	}

	items.push({ icon: "🌿", title: `Stagione: ${season.phase}`, text: `${season.description} Lavori tipici: ${season.tasks.join(", ").toLowerCase()}.`, tone: "accent", priority: 35 });

	items.sort((a, b) => b.priority - a.priority);

	return { greeting: greeting(now, input.userName), summary: summary(now, day, todayOpen.length, overdue.length), items: items.slice(0, 7) };
}

function greeting(now: Date, name: string): string {
	const h = now.getHours();
	const salute = h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
	const first = (name || "").trim().split(/\s+/)[0];
	return first ? `${salute}, ${first}` : salute;
}

function summary(now: Date, day: DaySnapshot | null, todayCount: number, overdueCount: number): string {
	const date = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
	const parts: string[] = [`Oggi è ${date}`];
	if (day) {
		const w = weatherCodeInfo(day.code);
		parts.push(`${w.label.toLowerCase()}, tra ${Math.round(day.tMin)}° e ${Math.round(day.tMax)}°`);
	}
	const work = todayCount ? plural(todayCount, "attività in programma", "attività in programma") : "nessuna attività in programma";
	parts.push(overdueCount ? `${work} e ${plural(overdueCount, "arretrato", "arretrati")}` : work);
	return parts.join(" · ") + ".";
}
