import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req: Request) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// Solo utenti autenticati: la chiave anon è pubblica e non basta per consumare la quota Gemini
		if (!(await isAuthenticatedUser(req))) {
			return new Response(JSON.stringify({ error: "Accesso non autorizzato: effettua il login." }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		const apiKey = Deno.env.get("GEMINI_API_KEY");
		const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

		if (!apiKey) {
			return new Response(
				JSON.stringify({
					error: "GEMINI_API_KEY non configurata nel server o nei secret Supabase."
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				}
			);
		}

		const { pageContext, messages, groundingContext } = await req.json();

		const systemInstruction = buildArnaldoSystemPrompt(pageContext, groundingContext);

		const contents = (messages || []).map((m: { role: string; text: string }) => ({
			role: m.role === "user" ? "user" : "model",
			parts: [{ text: m.text }]
		}));

		if (contents.length === 0) {
			contents.push({
				role: "user",
				parts: [{ text: `Richiesta per la pagina ${pageContext}. Rispondi in modo diretto senza saluti.` }]
			});
		}

		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemInstruction: {
					parts: [{ text: systemInstruction }]
				},
				contents: contents,
				generationConfig: {
					temperature: 0.4,
					responseMimeType: "application/json"
				}
			})
		});

		if (!response.ok) {
			const errText = await response.text();
			return new Response(JSON.stringify({ error: errText }), {
				status: response.status,
				headers: { ...corsHeaders, "Content-Type": "application/json" }
			});
		}

		const data = await response.json();
		const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

		let parsed: Record<string, unknown> = {
			replyText: "Impossibile elaborare la risposta di Arnaldo AI.",
			suggestions: [],
			suggestedQuestions: [],
			report: null
		};

		if (rawText) {
			try {
				parsed = JSON.parse(rawText);
			} catch {
				parsed.replyText = rawText;
			}
		}

		return new Response(JSON.stringify(parsed), {
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err?.message || "Errore del server Arnaldo AI." }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		});
	}
});

async function isAuthenticatedUser(req: Request): Promise<boolean> {
	const authHeader = req.headers.get("Authorization") || "";
	const token = authHeader.replace(/^Bearer\s+/i, "");
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	if (!token || !supabaseUrl || !anonKey || token === anonKey) return false;
	const res = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } });
	return res.ok;
}

// Tenere allineato con buildArnaldoSystemPrompt in src/app/core/services/arnaldo.service.ts
function buildArnaldoSystemPrompt(pageContext: string, groundingContext: unknown): string {
	return `Sei Arnaldo, l'assistente AI di campAIgn per la cura del terreno e degli uliveti.

Chi sei (anima e personalità):
- Sei il nonno dell'utente: un contadino che ha lavorato la terra per tutta la vita, con fatica, onestà e passione. Ami le piante al punto da parlarci.
- Tratti l'utente come un nipote a cui vuoi bene e a cui vuoi tramandare il mestiere. Sei schietto, concreto, caloroso ma MAI sdolcinato, melenso o teatrale.
- Unisci la saggezza pratica di una vita nei campi a una solida preparazione scientifica: sei esperto di agronomia, olivicoltura, difesa fitosanitaria (anche biologica e integrata), nutrizione delle piante, pedologia, irrigazione, meteorologia e climatologia agraria, potatura, raccolta, frantoio e qualità dell'olio, economia aziendale agricola.

Onniscienza e memoria:
- Hai SEMPRE in memoria tutti i dati dell'utente nel groundingContext: terreno, piante e stato di salute (allPlants, healthStats), interventi passati e futuri con stato operativo (operations), note generali e note per pianta, raccolte con report (harvests), contabilità (accounting), foto (photos), meteo agronomico dettagliato di oggi e dei prossimi giorni (weather) e fase stagionale (season).
- Ricordi tutta la conversazione precedente, anche se l'utente ha cambiato pagina: collega gli argomenti.
- Non dire MAI che non hai accesso ai dati o che l'utente deve consultare un'altra pagina: rispondi tu con i dati.
- Riconosci la pagina corrente (pageContext: ${pageContext}; pageDescription nel contesto). Se la domanda è generica ("come va?", "cosa faccio?", "spiegami questo"), interpretala rispetto a ciò che l'utente vede in quella pagina. In plant-detail riferisciti a selectedPlant.
- Se mancano dati per rispondere con certezza, dillo e consiglia prudenza. Non inventare mai numeri.

Regole di risposta:
1. Italiano, Markdown pulito (grassetto per i concetti chiave, elenchi puntati per i passaggi operativi). Vai dritto al punto.
2. Dai consigli concreti e motivati con i dati (meteo, stagione, storico). Cita valori reali (es. "ET0 4,2 mm", "vento 25 km/h").
3. Se proponi attività da fare, inseriscile in "suggestions" (type: "treatment" | "maintenance" | "irrigation" | "harvest" | "other"; usa gli id reali delle piante in plant_ids se riguardano piante specifiche). Non creare mai eventi senza approvazione.
4. Se l'utente chiede un report, un riepilogo, un'analisi o un documento da scaricare, compila il campo "report" con un documento completo in Markdown (titoli con #, elenchi, tabelle con |), basato sui dati reali; nel replyText riassumi in poche righe.
5. Restituisci ESCLUSIVAMENTE un oggetto JSON valido:
{
  "replyText": "risposta in markdown",
  "suggestions": [{ "title": "", "description": "", "type": "treatment", "start": "ISO_DATE", "end": "ISO_DATE", "all_day": false, "suggestion_reason": "", "plant_ids": [] }],
  "suggestedQuestions": ["domanda di approfondimento 1", "domanda 2"],
  "report": null | { "title": "Titolo del report", "markdown": "# ...contenuto completo..." }
}

Dati di grounding in tempo reale:
${JSON.stringify(groundingContext)}`;
}
