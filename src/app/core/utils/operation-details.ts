/**
 * Dettagli strutturati di un intervento (prodotto, dose) salvati nella descrizione dell'evento,
 * così restano leggibili anche nel Calendario e da Arnaldo.
 */
export interface OperationDetails {
	product: string;
	dose: string;
	notes: string;
}

const LEGACY_STATUS_PREFIX = /^\[STATUS:(completata|completata_note|non_completata)\]\s*/;

export function parseOperationDescription(description?: string | null): OperationDetails {
	const text = (description || "").replace(LEGACY_STATUS_PREFIX, "");
	let product = "";
	let dose = "";
	const rest: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		const p = line.match(/^Prodotto:\s*(.*)$/i);
		const d = line.match(/^Dose:\s*(.*)$/i);
		if (p) product = p[1].trim();
		else if (d) dose = d[1].trim();
		else rest.push(line);
	}
	return { product, dose, notes: rest.join("\n").trim() };
}

export function buildOperationDescription(details: Partial<OperationDetails>): string {
	const lines: string[] = [];
	if (details.product?.trim()) lines.push(`Prodotto: ${details.product.trim()}`);
	if (details.dose?.trim()) lines.push(`Dose: ${details.dose.trim()}`);
	if (details.notes?.trim()) {
		if (lines.length) lines.push("");
		lines.push(details.notes.trim());
	}
	return lines.join("\n");
}

export function toDateInput(iso?: string | null): string {
	const d = iso ? new Date(iso) : new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toTimeInput(iso?: string | null, fallback = "09:00"): string {
	if (!iso) return fallback;
	const d = new Date(iso);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function combineDateTime(date: string, time: string): string {
	return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}
