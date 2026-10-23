import { CalendarEvent } from "../../core/services/calendar.service";
import { EffectiveWorkStatus } from "../../core/services/operations.store";
import { EventType, OPERATION_TYPES, WORK_STATUS_META, formatDateIt, toLocalDateKey } from "../../core/constants/domain";
import { MapBadge } from "../../shared/components/farm-map/farm-map.component";

/** Riepilogo interventi (esclusa la raccolta) di una singola pianta. */
export interface PlantOpsSummary {
	open: CalendarEvent[];
	overdue: number;
	inProgress: number;
	openTypes: Set<EventType>;
	lastTreatment: CalendarEvent | null;
	lastMaintenance: CalendarEvent | null;
	doneThisYear: number;
}

export function isOpenStatus(status: EffectiveWorkStatus): boolean {
	return status === "todo" || status === "in_progress" || status === "overdue";
}

export function isOperationType(type: EventType): boolean {
	return OPERATION_TYPES.includes(type);
}

/** Ordinamento "per urgenza": in ritardo prima, poi in corso, poi per data crescente. */
export function urgencyRank(status: EffectiveWorkStatus): number {
	return status === "overdue" ? 0 : status === "in_progress" ? 1 : 2;
}

export function formatEventDate(e: CalendarEvent, withYear = false): string {
	const date = formatDateIt(e.start, withYear ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" });
	if (e.all_day) return date;
	const d = new Date(e.start);
	return `${date} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Badge da mostrare sul marker: ritardo per primo (evidenziato), poi in corso, poi tipi in attesa. */
export function buildBadges(summary: PlantOpsSummary): MapBadge[] {
	const badges: MapBadge[] = [];
	if (summary.overdue) badges.push({ icon: "⚠️", title: `${summary.overdue} ${summary.overdue === 1 ? "intervento" : "interventi"} in ritardo`, tone: "bg-camp-amber-light" });
	if (summary.inProgress) badges.push({ icon: "🔄", title: `${summary.inProgress} in corso`, tone: "bg-camp-info-light" });
	for (const t of OPERATION_TYPES) {
		if (summary.openTypes.has(t)) badges.push({ icon: BADGE_TYPE_ICON[t], title: `${TYPE_PENDING_LABEL[t]} da svolgere` });
	}
	return badges;
}

const BADGE_TYPE_ICON: Record<EventType, string> = { treatment: "🧪", maintenance: "🔧", irrigation: "💧", harvest: "🫒", other: "📌" };
const TYPE_PENDING_LABEL: Record<EventType, string> = { treatment: "Trattamento", maintenance: "Manutenzione", irrigation: "Irrigazione", harvest: "Raccolta", other: "Attività" };

export const BADGE_LEGEND: { icon: string; label: string; tone: string }[] = [
	{ icon: "⚠️", label: WORK_STATUS_META.overdue.label, tone: "bg-camp-amber-light" },
	{ icon: "🔄", label: WORK_STATUS_META.in_progress.label, tone: "bg-camp-info-light" },
	{ icon: "🧪", label: "Trattamento da fare", tone: "bg-white" },
	{ icon: "🔧", label: "Manutenzione da fare", tone: "bg-white" },
	{ icon: "💧", label: "Irrigazione da fare", tone: "bg-white" },
	{ icon: "📌", label: "Altra attività", tone: "bg-white" }
];

export function isSameDay(iso: string, ref = new Date()): boolean {
	return toLocalDateKey(iso) === toLocalDateKey(ref);
}

/** Rende il testo sicuro dentro una cella di tabella markdown. */
export function mdCell(value: unknown): string {
	return String(value ?? "")
		.replace(/\|/g, "/")
		.replace(/\r?\n/g, " ")
		.trim() || "—";
}
