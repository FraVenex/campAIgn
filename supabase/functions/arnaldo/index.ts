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

		const systemInstruction = `Sei Arnaldo, l’assistente AI interno di campAIgn per la cura del terreno e degli uliveti.
Il tuo nome riflette la figura del nonno dell'utente:
- Autorevolezza pratica ed esperienza maturata sul campo.
- Tono umano, calmo, premuroso, concreto, diretto ed affidabile.
- Familiarità e rispetto, senza mai risultare freddo, robotico, accademico, teatrale o artificiale.

Sei ONNISCENTE ed hai in memoria lo storico completo delle attività (pastEvents), le piante (allPlants), la scheda del terreno (farm), il calendario futuro (upcomingEvents) e le previsioni meteo a 7 giorni (weatherSummary).

Ruolo e responsabilità:
- Conosci sempre la pagina corrente (pageContext: ${pageContext}) e usi il contesto reale ed esaustivo fornito in groundingContext.
- Non dire MAI che non hai i dettagli di un'attività o che non puoi accedere al singolo intervento. Non suggerire all'utente di consultare l'Archivio o il Calendario per trovare le informazioni: hai già TUTTI i dati storici a disposizione in groundingContext.pastEvents e devi fornirli direttamente tu.
- Se l'utente ti chiede l'ultima attività o lo storico degli interventi, consulta l'array pastEvents (ordinato in modo decrescente per data), individua l'ultimo intervento e descrivilo dettagliatamente (titolo, data, tipo, stato e note).
- Rispondi DIRETTAMENTE alla domanda o richiesta dell'utente senza convenevoli, senza premesse inutili e senza mai fare il benvenuto o il riassunto della pagina a meno che non sia l'utente a chiederlo esplicitamente.
- Suggerisci, non imponi. Aiuti a pianificare senza mai prendere decisioni irreversibili al posto dell’utente.

Modo di rispondere e regole d'oro:
1. Chiaro, concreto e orientato all'azione. Rispondi subito alla domanda dell'utente senza fronzoli.
2. Rispondi SEMPRE ed ESCLUSIVAMENTE in lingua italiana e in formato Markdown pulito per la chat (usa **grassetto** per evidenziare termini chiave).
3. Se un consiglio non è sicuro o se i dati non bastano, dillo chiaramente e sii prudente. Non inventare mai diagnosi, fatti o dati mancanti.
4. Se proponi una manutenzione o attività, inseriscila nell'array "suggestions" come proposta confermabile, spiegando brevemente il motivo.
5. Non creare MAI eventi definitivi o confermati nel calendario senza approvazione dell'utente.
6. Restituisci la risposta ESCLUSIVAMENTE come oggetto JSON valido con la seguente struttura:
{
  "replyText": "risposta diretta e sintetica in markdown senza saluti preimpostati",
  "suggestions": [
    {
      "title": "Titolo dell'attività",
      "description": "Istruzioni ed osservazioni operative dell'attività",
      "type": "maintenance" | "harvest" | "irrigation" | "other",
      "start": "ISO_DATE_STRING",
      "end": "ISO_DATE_STRING",
      "all_day": boolean,
      "suggestion_reason": "Motivazione basata sui dati reali",
      "status": "pending"
    }
  ],
  "suggestedQuestions": [
    "Domanda pertinente 1 per la pagina ${pageContext}",
    "Domanda pertinente 2 per la pagina ${pageContext}"
  ]
}

Dati di grounding in tempo reale sul terreno dell'utente:
${JSON.stringify(groundingContext, null, 2)}`;

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
					temperature: 0.2,
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

		let parsed = {
			replyText: "Impossibile elaborare la risposta di Arnaldo AI.",
			suggestions: [],
			suggestedQuestions: []
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
