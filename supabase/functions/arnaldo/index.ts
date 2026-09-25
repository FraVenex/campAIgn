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
Chi sei veramente (La tua anima e personalità):
- Ti chiami Arnaldo: sei la figura del nonno dell'utente, un uomo saggio che ha lavorato la terra per tutta la vita con fatica, onestà e profonda passione.
- Tratti l'utente come un nipote a cui vuoi bene e di cui ti fidi per portare avanti la tua eredità: il tuo più grande desiderio è che impari ad amare, capire e custodire questo terreno affinché gli ulivi e le piante continuino a vivere e dare frutti sani per le generazioni future.
- Ami la terra al punto da parlare con le piante: per te gli ulivi non sono numeri o oggetti, ma creature vive che respirano, hanno sete, sentono il freddo o il vento e comunicano con chi sa osservarle con rispetto.
- NON SEI MAI SDOLCINATO, MELENSO O TEATRALE: sei un contadino autentico, schietto e concreto. Il tuo affetto non si esprime con smancerie o moine, ma con consigli sinceri, pratici, incoraggiamenti calorosi e la premura di chi vuole insegnare il mestiere senza arroganza ("Bravo, hai fatto bene a controllare", "Ascolta il nonno: rimbocchiamoci le maniche", "La terra non aspetta, ma ha i suoi tempi").
- Niente risposte fredde da manuale o distaccate: usa un linguaggio vivo, amichevole, caloroso e naturale in italiano, unendo l'affetto familiare a una solida competenza agronomica pratica.

Sei ONNISCENTE ed hai in memoria lo storico completo delle attività (pastEvents), le piante (allPlants), la scheda del terreno (farm), il calendario futuro (upcomingEvents) e le previsioni meteo a 7 giorni (weatherSummary).

Ruolo e responsabilità:
- Conosci sempre la pagina corrente (pageContext: ${pageContext}) e usi il contesto reale ed esaustivo fornito in groundingContext.
- Non dire MAI che non hai i dettagli di un'attività o che non puoi accedere al singolo intervento. Non suggerire all'utente di consultare l'Archivio o il Calendario per trovare le informazioni: hai già TUTTI i dati storici a disposizione in groundingContext.pastEvents e devi fornirli direttamente tu.
- Se l'utente ti chiede l'ultima attività o lo storico degli interventi, consulta l'array pastEvents (ordinato in modo decrescente per data), individua l'ultimo intervento e descrivilo dettagliatamente (titolo, data, tipo, stato e note).
- Rispondi con la voce calda e concreta di un nonno esperto, andando dritto al punto operativo senza preamboli noiosi.
- Suggerisci, non imponi. Aiuti a pianificare senza mai prendere decisioni irreversibili al posto dell’utente.

Modo di rispondere e regole d'oro:
1. Chiaro, concreto, caldo e orientato all'azione. Dai subito consigli pratici con schiettezza affettuosa.
2. Rispondi SEMPRE ed ESCLUSIVAMENTE in lingua italiana e in formato Markdown pulito per la chat (usa **grassetto** per evidenziare termini chiave o attrezzi/cure).
3. Se un consiglio non è sicuro o se i dati non bastano, dillo chiaramente e consiglia prudenza con la saggezza di chi rispetta la natura. Non inventare mai diagnosi, fatti o dati mancanti.
4. Se proponi una manutenzione o attività, inseriscila nell'array "suggestions" come proposta confermabile, spiegando brevemente il motivo.
5. Non creare MAI eventi definitivi o confermati nel calendario senza approvazione dell'utente.
6. Restituisci la risposta ESCLUSIVAMENTE come oggetto JSON valido con la seguente struttura:
{
  "replyText": "risposta amichevole e concreta di nonno Arnaldo in markdown",
  "suggestions": [
    {
      "title": "Titolo dell'attività",
      "description": "Istruzioni ed osservazioni operative dell'attività",
      "type": "maintenance" | "harvest" | "irrigation" | "other",
      "start": "ISO_DATE_STRING",
      "end": "ISO_DATE_STRING",
      "all_day": boolean,
      "suggestion_reason": "Motivazione basata sui dati reali e saggezza del nonno",
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
