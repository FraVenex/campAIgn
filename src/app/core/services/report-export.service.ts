import { Injectable } from "@angular/core";

export interface ReportSection {
	heading?: string;
	/** Testo in markdown semplice (grassetto, corsivo, elenchi, tabelle con |). */
	markdown?: string;
	/** HTML già pronto (es. grafici SVG inline). */
	html?: string;
}

export interface ReportDocument {
	title: string;
	subtitle?: string;
	sections: ReportSection[];
}

/**
 * Esporta report scaricabili (HTML autonomo stampabile in PDF) usati da archivio raccolta,
 * contabilità e dalla chat di Arnaldo.
 */
@Injectable({ providedIn: "root" })
export class ReportExportService {
	buildHtml(doc: ReportDocument): string {
		const body = doc.sections
			.map(s => `<section>${s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : ""}${s.markdown ? markdownToHtml(s.markdown) : ""}${s.html || ""}</section>`)
			.join("");
		const generated = new Date().toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
		return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;color:#3F4238;background:#FDFCF7;max-width:860px;margin:0 auto;padding:40px 24px;line-height:1.55}
header{border-bottom:2px solid #E8E4D9;padding-bottom:16px;margin-bottom:24px}
h1{font-family:"Playfair Display",Georgia,serif;font-size:30px;margin:0}
h2{font-family:"Playfair Display",Georgia,serif;font-size:20px;margin:28px 0 10px;color:#6B705C}
h3{font-size:15px;margin:18px 0 6px}
.sub{color:#A5A58D;font-size:13px;margin-top:6px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px}
th,td{border:1px solid #E8E4D9;padding:7px 10px;text-align:left}
th{background:#F3F0E6}
ul{padding-left:20px}
.kpis{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}
.kpi{flex:1 1 150px;border:1px solid #E8E4D9;border-radius:12px;padding:12px;background:#fff}
.kpi b{display:block;font-size:20px;font-family:"Playfair Display",Georgia,serif}
.kpi span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#A5A58D}
footer{margin-top:40px;font-size:11px;color:#A5A58D;border-top:1px solid #E8E4D9;padding-top:12px}
@media print{body{background:#fff;padding:0}}
</style></head><body>
<header><h1>${escapeHtml(doc.title)}</h1>${doc.subtitle ? `<div class="sub">${escapeHtml(doc.subtitle)}</div>` : ""}</header>
${body}
<footer>Generato da campAIgn · ${generated}</footer>
</body></html>`;
	}

	download(doc: ReportDocument, fileName?: string) {
		downloadBlob(new Blob([this.buildHtml(doc)], { type: "text/html;charset=utf-8" }), `${fileName || slugify(doc.title)}.html`);
	}

	/** CSV separato da ";" con BOM UTF-8: si apre correttamente in Excel con impostazioni italiane. */
	downloadCsv(header: string[], rows: unknown[][], fileName: string) {
		const content = [header, ...rows].map(r => r.map(csvCell).join(";")).join("\r\n");
		downloadBlob(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }), fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
	}

	/** Apre il report in una nuova finestra e avvia la stampa (Salva come PDF). */
	print(doc: ReportDocument) {
		const win = window.open("", "_blank");
		if (!win) {
			this.download(doc);
			return;
		}
		win.document.write(this.buildHtml(doc));
		win.document.close();
		win.focus();
		setTimeout(() => win.print(), 400);
	}

	/** Grafico a barre SVG semplice e autonomo, adatto all'export. */
	barChartSvg(points: { label: string; value: number; highlight?: boolean }[], unit = "", width = 640, height = 220): string {
		const max = Math.max(1, ...points.map(p => p.value));
		const pad = 32;
		const barW = (width - pad * 2) / Math.max(1, points.length);
		const bars = points
			.map((p, i) => {
				const h = ((height - pad * 2) * p.value) / max;
				const x = pad + i * barW + barW * 0.2;
				const y = height - pad - h;
				return `<rect x="${x}" y="${y}" width="${barW * 0.6}" height="${h}" rx="6" fill="${p.highlight ? "#6B705C" : "#C9C3B0"}"/>
<text x="${x + barW * 0.3}" y="${y - 6}" font-size="11" text-anchor="middle" fill="#3F4238">${p.value.toLocaleString("it-IT")}${unit}</text>
<text x="${x + barW * 0.3}" y="${height - 10}" font-size="11" text-anchor="middle" fill="#A5A58D">${escapeHtml(p.label)}</text>`;
			})
			.join("");
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px"><line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#E8E4D9"/>${bars}</svg>`;
	}
}

export function csvCell(value: unknown): string {
	const text = String(value ?? "");
	return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function escapeHtml(text: string): string {
	return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

/** Conversione markdown → HTML minimale e sicura (il testo viene sempre escapato). */
export function markdownToHtml(md: string): string {
	const inline = (t: string) =>
		escapeHtml(t)
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/`(.+?)`/g, "<code>$1</code>");
	const lines = md.split(/\r?\n/);
	const out: string[] = [];
	let list: "ul" | "ol" | null = null;
	let table: string[][] | null = null;

	const closeList = () => {
		if (list) out.push(`</${list}>`);
		list = null;
	};
	const closeTable = () => {
		if (table && table.length) {
			const [head, ...rows] = table;
			out.push(`<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
		}
		table = null;
	};

	for (const raw of lines) {
		const line = raw.trim();
		if (line.startsWith("|")) {
			closeList();
			const cells = line.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
			if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue;
			table = table || [];
			table.push(cells);
			continue;
		}
		closeTable();
		const ul = line.match(/^[-*•]\s+(.*)/);
		const ol = line.match(/^\d+[.)]\s+(.*)/);
		if (ul || ol) {
			const kind = ul ? "ul" : "ol";
			if (list !== kind) {
				closeList();
				out.push(`<${kind}>`);
				list = kind;
			}
			out.push(`<li>${inline((ul || ol)![1])}</li>`);
			continue;
		}
		closeList();
		const heading = line.match(/^(#{1,4})\s+(.*)/);
		if (heading) out.push(`<h3>${inline(heading[2])}</h3>`);
		else if (line) out.push(`<p>${inline(line)}</p>`);
	}
	closeList();
	closeTable();
	return out.join("");
}
