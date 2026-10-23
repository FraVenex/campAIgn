import { WeatherData } from "../services/weather.service";

/** Utility agronomiche condivise: lettura meteo, fasi colturali e rischi. */

export function weatherCodeInfo(code: number | undefined): { label: string; icon: string } {
	if (code === undefined || code === null) return { label: "N.D.", icon: "🌡️" };
	if (code === 0) return { label: "Sereno", icon: "☀️" };
	if (code <= 2) return { label: "Poco nuvoloso", icon: "🌤️" };
	if (code === 3) return { label: "Coperto", icon: "☁️" };
	if (code <= 48) return { label: "Nebbia", icon: "🌫️" };
	if (code <= 57) return { label: "Pioviggine", icon: "🌦️" };
	if (code <= 67) return { label: "Pioggia", icon: "🌧️" };
	if (code <= 77) return { label: "Neve", icon: "❄️" };
	if (code <= 82) return { label: "Rovesci", icon: "🌦️" };
	if (code <= 86) return { label: "Rovesci di neve", icon: "🌨️" };
	return { label: "Temporale", icon: "⛈️" };
}

export function windDirectionLabel(deg?: number): string {
	if (deg === undefined || deg === null) return "—";
	const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
	return dirs[Math.round(deg / 45) % 8];
}

export interface DaySnapshot {
	date: string;
	tMin: number;
	tMax: number;
	tNow?: number;
	humidityNow?: number;
	apparent?: number;
	precip: number;
	precipProb: number;
	wind: number;
	windNow?: number;
	gusts: number;
	windDir?: number;
	et0: number;
	soilTemp: number;
	soilMoisture: number | null;
	vpdMax: number | null;
	dewPoint: number | null;
	uv: number;
	sunshine: number;
	sunrise?: string;
	sunset?: string;
	code: number;
	gdd: number;
	waterBalance: number;
}

/** Estrae i valori del giorno indicato (offset rispetto a oggi) dagli array della risposta meteo. */
export function daySnapshot(w: WeatherData, offset = 0): DaySnapshot | null {
	const idx = w.todayIndex + offset;
	const date = w.daily.dates[idx];
	if (!date) return null;
	const hourIdx = w.hourly.time.map((t, i) => (t.startsWith(date) ? i : -1)).filter(i => i >= 0);
	const avg = (arr?: number[]) => {
		const vals = hourIdx.map(i => arr?.[i]).filter((v): v is number => typeof v === "number");
		return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
	};
	const maxOf = (arr?: number[]) => {
		const vals = hourIdx.map(i => arr?.[i]).filter((v): v is number => typeof v === "number");
		return vals.length ? Math.max(...vals) : null;
	};
	const tMin = w.daily.minTemps[idx] ?? 0;
	const tMax = w.daily.maxTemps[idx] ?? 0;
	const precip = w.daily.precipSums[idx] ?? 0;
	const et0 = w.daily.et0?.[idx] ?? 0;
	const isToday = offset === 0;
	return {
		date,
		tMin,
		tMax,
		tNow: isToday ? w.current.temperature : undefined,
		humidityNow: isToday ? w.current.humidity : undefined,
		apparent: isToday ? w.current.apparentTemperature : undefined,
		precip,
		precipProb: w.daily.precipProbability?.[idx] ?? 0,
		wind: w.daily.windSpeeds[idx] ?? 0,
		windNow: isToday ? w.current.windSpeed : undefined,
		gusts: w.daily.windGusts?.[idx] ?? 0,
		windDir: w.daily.windDirection?.[idx],
		et0,
		soilTemp: round1(avg(w.hourly.soilTemp) ?? w.daily.soilTemp?.[idx] ?? 0),
		soilMoisture: avg(w.hourly.soilMoisture) !== null ? Math.round(avg(w.hourly.soilMoisture)! * 100) : null,
		vpdMax: maxOf(w.hourly.vpd) !== null ? round1(maxOf(w.hourly.vpd)!) : null,
		dewPoint: isToday && w.current.dewPoint !== undefined ? w.current.dewPoint : avg(w.hourly.dewPoint) !== null ? round1(avg(w.hourly.dewPoint)!) : null,
		uv: w.daily.uvIndex?.[idx] ?? 0,
		sunshine: w.daily.sunshineHours?.[idx] ?? 0,
		sunrise: w.daily.sunrise?.[idx],
		sunset: w.daily.sunset?.[idx],
		code: w.daily.weatherCodes[idx] ?? 0,
		gdd: round1(Math.max(0, (tMax + tMin) / 2 - 10)),
		waterBalance: round1(precip - et0)
	};
}

export interface AgroAlert {
	level: "ok" | "info" | "warning" | "danger";
	icon: string;
	title: string;
	text: string;
}

/** Valuta la finestra per trattamenti fogliari (vento, pioggia, temperatura, VPD). */
export function sprayWindow(d: DaySnapshot): AgroAlert {
	if (d.precipProb >= 60 || d.precip >= 2) return { level: "warning", icon: "🌧️", title: "Trattamenti sconsigliati", text: `Pioggia probabile (${d.precipProb}%, ${d.precip} mm): rischio dilavamento del prodotto.` };
	if (d.wind >= 20 || d.gusts >= 35) return { level: "warning", icon: "💨", title: "Trattamenti sconsigliati", text: `Vento fino a ${d.wind} km/h (raffiche ${d.gusts}): deriva elevata.` };
	if (d.tMax >= 30) return { level: "info", icon: "🌡️", title: "Tratta solo al mattino presto", text: `Massima di ${d.tMax}°C: evita le ore calde per non stressare la chioma.` };
	return { level: "ok", icon: "✅", title: "Buona finestra per trattamenti", text: `Vento ${d.wind} km/h, pioggia ${d.precipProb}%: condizioni favorevoli.` };
}

/** Rischi agronomici principali per l'olivo calcolati sul meteo del giorno. */
export function agronomicRisks(d: DaySnapshot, month: number): AgroAlert[] {
	const alerts: AgroAlert[] = [];
	if (d.tMin <= 0) alerts.push({ level: "danger", icon: "🥶", title: "Rischio gelata", text: `Minima di ${d.tMin}°C: proteggi le piante giovani e rimanda le potature.` });
	else if (d.tMin <= 3) alerts.push({ level: "warning", icon: "❄️", title: "Possibili brinate", text: `Minima di ${d.tMin}°C nelle ore notturne.` });
	if (d.tMax >= 35) alerts.push({ level: "danger", icon: "🔥", title: "Stress da calore", text: `Massima di ${d.tMax}°C: stomi chiusi e fotosintesi ridotta, valuta un'irrigazione di soccorso.` });
	const humid = (d.humidityNow ?? 0) >= 85 || d.precip >= 1;
	if (humid && d.tMax >= 10 && d.tMax <= 25 && [10, 11, 12, 1, 2, 3, 4, 5].includes(month)) {
		alerts.push({ level: "warning", icon: "🍂", title: "Occhio di pavone", text: "Umidità elevata e temperature miti favoriscono la Spilocaea oleagina: valuta un trattamento rameico preventivo." });
	}
	if (d.tMax >= 20 && d.tMax <= 31 && [6, 7, 8, 9, 10].includes(month)) {
		alerts.push({ level: "info", icon: "🪰", title: "Mosca dell'olivo attiva", text: "Temperature favorevoli alla Bactrocera oleae: controlla le trappole e le punture sulle drupe." });
	}
	if (d.waterBalance <= -4 && [5, 6, 7, 8, 9].includes(month)) {
		alerts.push({ level: "warning", icon: "🏜️", title: "Deficit idrico", text: `Bilancio idrico di ${d.waterBalance} mm (pioggia − ET0): le piante consumano più acqua di quella che ricevono.` });
	}
	if (d.vpdMax !== null && d.vpdMax >= 2.5) alerts.push({ level: "info", icon: "💨", title: "Aria molto secca", text: `VPD massimo ${d.vpdMax} kPa: forte domanda evapotraspirativa.` });
	return alerts;
}

export interface SeasonPhase {
	phase: string;
	description: string;
	tasks: string[];
}

/** Calendario fenologico/operativo dell'olivo in clima mediterraneo. */
export function oliveSeasonPhase(month: number): SeasonPhase {
	const phases: Record<number, SeasonPhase> = {
		1: { phase: "Riposo vegetativo", description: "La pianta è a riposo: è il momento di pianificare e preparare.", tasks: ["Manutenzione attrezzi", "Concimazione organica di fondo", "Controllo danni da freddo"] },
		2: { phase: "Fine riposo", description: "Le gemme iniziano a risvegliarsi con le prime giornate miti.", tasks: ["Potatura di produzione", "Trattamento rameico dopo la potatura", "Trinciatura dei residui"] },
		3: { phase: "Ripresa vegetativa", description: "Ripartono i germogli: la pianta chiede azoto e attenzione alle malattie fungine.", tasks: ["Potatura (entro fine mese)", "Concimazione azotata", "Prevenzione occhio di pavone"] },
		4: { phase: "Mignolatura", description: "Si formano le infiorescenze (mignole).", tasks: ["Lavorazione superficiale del terreno", "Controllo margaronia e tignola", "Concimazione fogliare con boro"] },
		5: { phase: "Fioritura", description: "Fase delicatissima: evita trattamenti invasivi durante la fioritura.", tasks: ["Monitoraggio allegagione", "Sfalcio dell'inerbimento", "Irrigazione se il terreno è secco"] },
		6: { phase: "Allegagione", description: "I fiori diventano frutticini: la pianta seleziona il carico.", tasks: ["Irrigazione di soccorso", "Posizionamento trappole per la mosca", "Controllo cocciniglia"] },
		7: { phase: "Indurimento del nocciolo", description: "Il nocciolo si lignifica: lo stress idrico ora riduce la pezzatura.", tasks: ["Irrigazione regolare", "Monitoraggio mosca dell'olivo", "Spollonatura"] },
		8: { phase: "Accrescimento drupe", description: "Le olive crescono: acqua e difesa dalla mosca sono decisive.", tasks: ["Controllo punture di mosca", "Irrigazione nelle ore fresche", "Trattamenti larvicidi se superata la soglia"] },
		9: { phase: "Inizio invaiatura", description: "Le olive cambiano colore: inizia l'accumulo di olio.", tasks: ["Monitoraggio mosca e lebbra", "Preparazione reti e cassette", "Prenotazione frantoio"] },
		10: { phase: "Invaiatura e raccolta precoce", description: "Periodo ideale per oli fruttati e ricchi di polifenoli.", tasks: ["Raccolta delle varietà precoci", "Molitura entro 24-48 ore", "Trattamento rameico post-raccolta"] },
		11: { phase: "Raccolta", description: "Piena stagione di raccolta e molitura.", tasks: ["Raccolta e molitura rapida", "Trattamento rameico dopo la raccolta", "Registrazione rese"] },
		12: { phase: "Post-raccolta", description: "La pianta si prepara al riposo invernale.", tasks: ["Rame contro occhio di pavone", "Pulizia del terreno", "Bilancio della stagione"] }
	};
	return phases[month];
}

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}
