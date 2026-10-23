import { ApexOptions } from "ng-apexcharts";
import { DaySnapshot } from "../../core/utils/agronomy";

/** Costruttori delle opzioni ApexCharts per la pagina Meteo (palette camp). */

export const CHART_COLORS = {
	sage: "#6B705C",
	olive: "#A5A58D",
	amber: "#C9A96E",
	terracotta: "#B07D62",
	water: "#4C9BB8",
	error: "#A0413A",
	grid: "#E8E4D9",
	text: "#A5A58D",
	label: "#5C534A"
};

export interface HourlySeries {
	ts: number[];
	/** Data (YYYY-MM-DD) di ogni punto orario. */
	dates: string[];
	temperature: (number | null)[];
	soilTemp: (number | null)[];
	soilMoisture: (number | null)[];
	vpd: (number | null)[];
	dewPoint: (number | null)[];
}

const FONT = "Inter, system-ui, sans-serif";
const axisLabels = { style: { colors: CHART_COLORS.text, fontSize: "11px" } };

function base(height = 260): ApexOptions {
	return {
		chart: { type: "line", height, fontFamily: FONT, toolbar: { show: false }, zoom: { enabled: false }, parentHeightOffset: 0 },
		grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 4, padding: { left: 4, right: 4 } },
		dataLabels: { enabled: false },
		legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: CHART_COLORS.label }, markers: { radius: 12 } as any },
		markers: { size: 0 },
		fill: { opacity: 1 }
	};
}

function categoryAxis(labels: string[]) {
	return { categories: labels, labels: axisLabels, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } };
}

function datetimeAxis() {
	return {
		type: "datetime" as const,
		labels: { ...axisLabels, datetimeUTC: false, datetimeFormatter: { day: "dd/MM", hour: "HH:mm" } },
		axisBorder: { show: false },
		axisTicks: { show: false },
		tooltip: { enabled: false }
	};
}

const fmt = (unit: string, digits = 1) => (v: number) => (v === null || v === undefined || isNaN(v) ? "—" : `${Number(v).toFixed(digits).replace(".", ",")} ${unit}`);

export function temperatureChart(days: DaySnapshot[], labels: string[]): ApexOptions {
	return {
		...base(),
		chart: { ...base().chart!, type: "line" },
		series: [
			{ name: "Massima", data: days.map(d => d.tMax) },
			{ name: "Minima", data: days.map(d => d.tMin) }
		],
		colors: [CHART_COLORS.terracotta, CHART_COLORS.water],
		stroke: { width: 3, curve: "smooth" },
		markers: { size: 4, strokeWidth: 0 },
		dataLabels: { enabled: true, formatter: (v: string | number | number[]) => `${Math.round(Number(v))}°`, background: { enabled: false }, style: { fontSize: "11px", colors: [CHART_COLORS.terracotta, CHART_COLORS.water] }, offsetY: -6 },
		xaxis: categoryAxis(labels),
		yaxis: { labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}°` } },
		tooltip: { y: { formatter: fmt("°C") } }
	};
}

export function precipitationChart(days: DaySnapshot[], labels: string[]): ApexOptions {
	return {
		...base(),
		series: [
			{ name: "Pioggia (mm)", type: "column", data: days.map(d => d.precip) },
			{ name: "Probabilità (%)", type: "line", data: days.map(d => d.precipProb) }
		],
		colors: [CHART_COLORS.water, CHART_COLORS.amber],
		stroke: { width: [0, 3], curve: "smooth" },
		markers: { size: [0, 4], strokeWidth: 0 },
		plotOptions: { bar: { borderRadius: 5, columnWidth: "50%" } },
		xaxis: categoryAxis(labels),
		yaxis: [
			{ seriesName: "Pioggia (mm)", min: 0, forceNiceScale: true, title: { text: "mm", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v * 10) / 10}` } },
			{ seriesName: "Probabilità (%)", opposite: true, min: 0, max: 100, tickAmount: 4, title: { text: "%", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}` } }
		],
		tooltip: { shared: true, intersect: false, y: [{ formatter: fmt("mm") }, { formatter: fmt("%", 0) }] }
	};
}

export function windChart(days: DaySnapshot[], labels: string[]): ApexOptions {
	return {
		...base(),
		series: [
			{ name: "Vento max", type: "column", data: days.map(d => d.wind) },
			{ name: "Raffiche", type: "line", data: days.map(d => d.gusts) }
		],
		colors: [CHART_COLORS.sage, CHART_COLORS.terracotta],
		stroke: { width: [0, 3], curve: "smooth" },
		markers: { size: [0, 4], strokeWidth: 0 },
		plotOptions: { bar: { borderRadius: 5, columnWidth: "50%" } },
		xaxis: categoryAxis(labels),
		yaxis: { min: 0, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}` }, title: { text: "km/h", style: { color: CHART_COLORS.text, fontWeight: 500 } } },
		annotations: {
			yaxis: [
				{
					y: 20,
					borderColor: CHART_COLORS.error,
					strokeDashArray: 4,
					label: { text: "Soglia trattamenti (20 km/h)", position: "left", textAnchor: "start", borderWidth: 0, style: { background: "transparent", color: CHART_COLORS.error, fontSize: "10px" } }
				}
			]
		},
		tooltip: { shared: true, intersect: false, y: { formatter: fmt("km/h", 0) } }
	};
}

export function waterBalanceChart(days: DaySnapshot[], labels: string[]): ApexOptions {
	return {
		...base(),
		series: [
			{ name: "Pioggia", type: "column", data: days.map(d => d.precip) },
			{ name: "ET0", type: "column", data: days.map(d => d.et0) },
			{ name: "Bilancio", type: "line", data: days.map(d => d.waterBalance) }
		],
		colors: [CHART_COLORS.water, CHART_COLORS.amber, CHART_COLORS.sage],
		stroke: { width: [0, 0, 3], curve: "smooth" },
		markers: { size: [0, 0, 4], strokeWidth: 0 },
		plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
		xaxis: categoryAxis(labels),
		yaxis: { forceNiceScale: true, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v * 10) / 10}` }, title: { text: "mm", style: { color: CHART_COLORS.text, fontWeight: 500 } } },
		annotations: { yaxis: [{ y: 0, borderColor: CHART_COLORS.olive, strokeDashArray: 0 }] },
		tooltip: { shared: true, intersect: false, y: { formatter: fmt("mm") } }
	};
}

export function soilChart(h: HourlySeries): ApexOptions {
	return {
		...base(),
		series: [
			{ name: "Temperatura suolo (6 cm)", data: zip(h.ts, h.soilTemp) },
			{ name: "Umidità suolo (3-9 cm)", data: zip(h.ts, h.soilMoisture) }
		],
		colors: [CHART_COLORS.terracotta, CHART_COLORS.water],
		stroke: { width: 2.5, curve: "smooth" },
		xaxis: datetimeAxis(),
		yaxis: [
			{ seriesName: "Temperatura suolo (6 cm)", title: { text: "°C", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}°` } },
			{ seriesName: "Umidità suolo (3-9 cm)", opposite: true, min: 0, title: { text: "% vol.", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}` } }
		],
		tooltip: { shared: true, intersect: false, x: { format: "dd/MM HH:mm" }, y: [{ formatter: fmt("°C") }, { formatter: fmt("%", 0) }] }
	};
}

export function vpdDewChart(h: HourlySeries): ApexOptions {
	return {
		...base(),
		series: [
			{ name: "VPD", data: zip(h.ts, h.vpd) },
			{ name: "Temperatura aria", data: zip(h.ts, h.temperature) },
			{ name: "Punto di rugiada", data: zip(h.ts, h.dewPoint) }
		],
		colors: [CHART_COLORS.amber, CHART_COLORS.terracotta, CHART_COLORS.water],
		stroke: { width: [2.5, 2, 2], curve: "smooth", dashArray: [0, 4, 0] },
		xaxis: datetimeAxis(),
		yaxis: [
			{ seriesName: "VPD", min: 0, title: { text: "kPa", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v * 10) / 10}` } },
			{ seriesName: "Temperatura aria", opposite: true, title: { text: "°C", style: { color: CHART_COLORS.text, fontWeight: 500 } }, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}°` } },
			{ seriesName: "Temperatura aria", show: false }
		],
		tooltip: { shared: true, intersect: false, x: { format: "dd/MM HH:mm" }, y: [{ formatter: fmt("kPa", 2) }, { formatter: fmt("°C") }, { formatter: fmt("°C") }] }
	};
}

function zip(ts: number[], values: (number | null)[]): [number, number | null][] {
	return ts.map((t, i) => [t, values[i] ?? null]);
}
