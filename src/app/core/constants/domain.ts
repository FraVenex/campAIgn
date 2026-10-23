/** Costanti di dominio condivise (etichette UI in italiano, chiavi in inglese). */

export type PlantStatus = "Ottimo" | "Attenzione" | "Stressato" | "Non Valutato";
export const PLANT_STATUSES: PlantStatus[] = ["Ottimo", "Attenzione", "Stressato", "Non Valutato"];
export const PLANT_SPECIES = ["Olivo", "Agrume", "Vite", "Mandorlo", "Fico", "Altro"];

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export const PLANT_STATUS_META: Record<string, { tone: Tone; emoji: string; marker: string }> = {
	Ottimo: { tone: "success", emoji: "🟢", marker: "border-camp-success bg-camp-success-light text-camp-success" },
	Attenzione: { tone: "warning", emoji: "🟡", marker: "border-camp-amber bg-camp-amber/10 text-camp-amber-dark" },
	Stressato: { tone: "danger", emoji: "🔴", marker: "border-camp-error bg-camp-error-light text-camp-error" },
	"Non Valutato": { tone: "neutral", emoji: "⚪", marker: "border-camp-olive/50 bg-camp-sand/60 text-camp-olive" }
};

export function plantStatusMeta(status?: string | null) {
	return PLANT_STATUS_META[status || "Non Valutato"] || PLANT_STATUS_META["Non Valutato"];
}

export type EventType = "treatment" | "maintenance" | "irrigation" | "harvest" | "other";
export const OPERATION_TYPES: EventType[] = ["treatment", "maintenance", "irrigation", "other"];

export const EVENT_TYPE_META: Record<EventType, { label: string; icon: string; tone: Tone; color: string }> = {
	treatment: { label: "Trattamento", icon: "🧪", tone: "info", color: "#5B7DB1" },
	maintenance: { label: "Manutenzione", icon: "🔧", tone: "accent", color: "#B07D62" },
	irrigation: { label: "Irrigazione", icon: "💧", tone: "info", color: "#4C9BB8" },
	harvest: { label: "Raccolta", icon: "🫒", tone: "success", color: "#4A7A5B" },
	other: { label: "Altro", icon: "📌", tone: "neutral", color: "#A5A58D" }
};

export function eventTypeMeta(type?: string | null) {
	return EVENT_TYPE_META[(type as EventType) || "other"] || EVENT_TYPE_META.other;
}

export type WorkStatus = "todo" | "in_progress" | "done" | "skipped";
export const WORK_STATUSES: WorkStatus[] = ["todo", "in_progress", "done", "skipped"];

export const WORK_STATUS_META: Record<WorkStatus | "overdue", { label: string; icon: string; tone: Tone }> = {
	todo: { label: "Da svolgere", icon: "⏳", tone: "neutral" },
	in_progress: { label: "In corso", icon: "🔄", tone: "info" },
	done: { label: "Svolta", icon: "✅", tone: "success" },
	skipped: { label: "Saltata", icon: "⏭️", tone: "danger" },
	overdue: { label: "In ritardo", icon: "⚠️", tone: "warning" }
};

export type ExpenseCategory = "products" | "tools" | "maintenance" | "labour" | "fuel" | "water" | "services" | "other";

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
	products: { label: "Prodotti (concimi, fitofarmaci)", icon: "🧴", color: "#6B705C" },
	tools: { label: "Attrezzi e macchinari", icon: "🛠️", color: "#B07D62" },
	maintenance: { label: "Manutenzioni", icon: "🔧", color: "#C9A96E" },
	labour: { label: "Manodopera", icon: "👷", color: "#5C534A" },
	fuel: { label: "Carburante", icon: "⛽", color: "#A0413A" },
	water: { label: "Acqua e irrigazione", icon: "💧", color: "#4C9BB8" },
	services: { label: "Servizi (frantoio, consulenze)", icon: "🏭", color: "#4A7A5B" },
	other: { label: "Altro", icon: "📦", color: "#A5A58D" }
};
export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[];

export const NOTE_COLORS = ["yellow", "green", "pink", "blue", "sand"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
export const NOTE_COLOR_CLASS: Record<NoteColor, string> = {
	yellow: "bg-[#FFF6C9] border-[#EADB8C]",
	green: "bg-[#E4F0DC] border-[#B9D3A8]",
	pink: "bg-[#FBE3DD] border-[#EDBFB2]",
	blue: "bg-[#DFEBF3] border-[#B4CCDD]",
	sand: "bg-camp-cream border-camp-sand"
};

export const TONE_CLASS: Record<Tone, string> = {
	success: "bg-camp-success-light text-camp-success border-camp-success/20",
	warning: "bg-camp-amber/10 text-camp-amber-dark border-camp-amber/30",
	danger: "bg-camp-error-light text-camp-error border-camp-error/20",
	info: "bg-camp-info-light text-camp-info border-camp-info/15",
	neutral: "bg-camp-sand/40 text-camp-bark border-camp-sand",
	accent: "bg-camp-terracotta/10 text-camp-terracotta border-camp-terracotta/20"
};

export function toLocalDateKey(d: Date | string): string {
	const date = typeof d === "string" ? new Date(d) : d;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateIt(value?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
	if (!value) return "—";
	const d = new Date(value);
	return isNaN(d.getTime()) ? value : d.toLocaleDateString("it-IT", opts);
}

export function formatCurrency(value: number | null | undefined): string {
	return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value || 0);
}
