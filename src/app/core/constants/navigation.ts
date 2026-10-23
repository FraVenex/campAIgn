export interface SectionTab {
	label: string;
	link: string;
	icon: string;
}

export interface NavSection {
	label: string;
	icon: string;
	/** Prefisso URL usato per evidenziare la sezione attiva. */
	base: string;
	link: string;
	children?: SectionTab[];
	/** Etichetta breve per la bottom bar mobile. */
	short?: string;
}

export const JOURNAL_TABS: SectionTab[] = [
	{ label: "Home", link: "/journal/home", icon: "🏡" },
	{ label: "Note", link: "/journal/notes", icon: "📌" }
];

export const LAND_TABS: SectionTab[] = [
	{ label: "Mappa", link: "/land/map", icon: "🗺️" },
	{ label: "Lista piante", link: "/land/plants", icon: "📋" }
];

export const OPERATIONS_TABS: SectionTab[] = [
	{ label: "Mappa", link: "/operations/map", icon: "🗺️" },
	{ label: "Registro interventi", link: "/operations/log", icon: "📒" }
];

export const HARVEST_TABS: SectionTab[] = [
	{ label: "Mappa", link: "/harvest/map", icon: "🗺️" },
	{ label: "Archivio raccolta", link: "/harvest/archive", icon: "🗃️" }
];

export const NAV_SECTIONS: NavSection[] = [
	{ label: "Diario del contadino", short: "Diario", icon: "📔", base: "/journal", link: "/journal/home", children: JOURNAL_TABS },
	{ label: "Calendario", short: "Agenda", icon: "📅", base: "/calendar", link: "/calendar" },
	{ label: "Terreno", short: "Terreno", icon: "🌳", base: "/land", link: "/land/map", children: LAND_TABS },
	{ label: "Manutenzioni e trattamenti", short: "Interventi", icon: "🧪", base: "/operations", link: "/operations/map", children: OPERATIONS_TABS },
	{ label: "Raccolta", short: "Raccolta", icon: "🫒", base: "/harvest", link: "/harvest/map", children: HARVEST_TABS },
	{ label: "Contabilità", icon: "💶", base: "/accounting", link: "/accounting" },
	{ label: "Meteo", icon: "⛅", base: "/meteo", link: "/meteo" },
	{ label: "Galleria", icon: "🖼️", base: "/gallery", link: "/gallery" }
];

/** Voci mostrate nella bottom bar mobile (le altre sono nel menù laterale). */
export const MOBILE_NAV = ["/journal", "/calendar", "/land", "/operations", "/harvest"];
