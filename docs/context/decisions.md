# Registro delle Decisioni

## 2026-05-12 - Inizializzazione Documentale
- **Decisione**: Creare una struttura di memoria persistente basata su file Markdown prima di scrivere qualsiasi riga di codice.
- **Rapporto**: Antigravity necessita di un contesto solido e leggibile per evitare scope creep e allucinazioni su regole non scritte.
- **Scelta**: Suddivisione in cartelle tematiche (product, design, architecture, context, workflows).

## 2026-05-12 - Stack e Stile
- **Decisione**: Utilizzo di **Angular 17.3** (non Next.js come inizialmente ipotizzato) e Supabase.
- **Rapporto**: La scelta di Angular 17.3 permette di sfruttare Signals e Standalone Components per una migliore reattività e manutenibilità.
- **Decisione**: Design "Apple-like" con palette agricola (beige/salvia).
- **Decisione**: Naming del codice in English, documentazione e UI in Italiano.

## 2026-05-12 - Metodologia Task
- **Decisione**: Obbligo di piccoli step atomici. Non si accettano mega-implementazioni. Ogni task deve aggiornare il contesto.

## 2026-05-12 - Raffinamento Autenticazione e Profili
- **Decisione**: Implementazione della tabella `public.profiles` per estendere `auth.users` con dati applicativi (nome, stato onboarding).
- **Decisione**: Utilizzo di un trigger PostgreSQL (`handle_new_user`) per garantire l'integrità referenziale e la creazione automatica del profilo alla registrazione.
- **Decisione**: Raffinamento dell'estetica con stile "Premium Agricultural": uso di backdrop-blur, ombre morbide (`shadow-camp-sage/10`), palette HSL personalizzata e micro-animazioni Tailwind (`animate-in`).
- **Decisione**: Inclusione del campo `fullName` nei metadata di Supabase Auth durante il signUp per popolare automaticamente il profilo.
## 2026-05-12: Layout Dinamico basato sulla Densità
- **Decisione**: Il layout della dashboard sarà determinato dal numero di piante inserite nell'onboarding.
- **Motivazione**: Un utente con 10 piante ha esigenze diverse da uno con 500. La densità della griglia (`WIDE`, `BALANCED`, `DENSE`) permette di ottimizzare la leggibilità e l'interazione operativa.
- **Impatto**: LandService calcola il layout suggerito; la UI del componente AreaCanvas (futuro) dovrà rispettare questo parametro.

## 2026-09-25 - Redesign Chat Arnaldo Mobile (Dialog & Real Avatar)
- **Decisione**: La chat di Arnaldo su mobile non è più una pagina a schermo intero (`100dvh`), ma un vero e proprio **Dialog modale** fluttuante con backdrop semi-trasparente e sfocato (`backdrop-blur-xs`), bordi arrotondati morbidi (`rounded-3xl`), margini perimetrali e chiusura al clic esterno / Escape.
- **Motivazione**: L'apertura a tutto schermo dava la percezione scorretta di un redirect o di una vista isolata, togliendo il contesto operativo dell'app all'agricoltore. Il pattern Dialog mantiene la concentrazione e l'orientamento spaziale nel terreno/dashboard.
- **Avatar Ufficiale ad Alta Definizione**: Aggiornato con la nuova illustrazione di Arnaldo (berretto a spina di pesce, occhiali, camicia a quadri e gilet). È stato applicato un ritaglio quadrato 512x512 ad altissima definizione centrato su testa e spalle con campionamento bicubico, perfettamente proporzionato e d'impatto all'interno di tutti i contenitori circolari dell'applicazione.
- **Centratura Globale di Tutti i Dialog (`CampDialogComponent`)**: Rimossa l'impostazione `items-end p-0 rounded-t-2xl` che forzava i dialoghi su mobile a comportarsi da Bottom Sheet. Tutti i dialog dell'app (grafici meteo, azioni di gruppo su piante, aggiunta piante, calendario, logout) ora si aprono al centro dello schermo (`items-center p-3.5 rounded-2xl shadow-2xl`) con chiusura da Escape e backdrop.

## 2026-09-25 - Redesign Mobile Calendario (Pattern Apple Calendar / Fantastical)
- **Decisione**: Sostituzione della tabella mensile compressa e delle viste orarie su mobile con un layout a due livelli: **Mini-Mese interattivo** (giorni circolari touch-friendly con indicatori colorati per tipologia di evento) + **Agenda del giorno selezionato** posizionata immediatamente sotto.
- **Motivazione**: Una tabella a 7 colonne su viewport mobile (< 768px) comprime le celle a meno di 45px di larghezza, rendendo illeggibili i titoli delle attività e impossibile il tocco mirato. La vista settimana/giorno generava oltre 2000px di scroll vuoto. Il pattern Mini-Month + Day Agenda (benchmark iOS Calendar / Fantastical) offre navigazione ergonomica a una mano: selezionando una data, le attività del giorno compaiono subito in basso in card dettagliate con orario, badge di stato, note e pulsante rapido `+ Aggiungi`.
- **Filtri Vista Mobile**: Nei dispositivi mobili il selettore viste espone unicamente `Mese` e `Agenda`, nascondendo le viste `Settimana` e `Giorno` che sono ottimizzate per desktop/tablet.

## 2026-09-25 - Personalità di Arnaldo: Il Nonno dell'Uliveto
- **Decisione**: Riprogettazione del system prompt e della voce di Arnaldo: non un assistente aziendale distaccato, ma la figura autentica di un nonno che ha lavorato tutta la vita con le mani nella terra, ama le piante al punto da parlarci e desidera profondamente che l'utente porti avanti la sua eredità rurale.
- **Motivazione**: Creare un legame emotivo caldo e genuino senza cadere nello sdolcinato o nel melenso. Arnaldo è asciutto, pratico, saggio e rassicurante, incoraggia con affetto contadino e offre consigli operativi concreti basati su decenni di esperienza sul campo.
- **Dettagli Implementativi**:
  - Aggiornato `systemInstruction` in `ArnaldoService` (frontend) e nella Edge Function Supabase `arnaldo`.
  - Temperatura di campionamento alzata a 0.4 per garantire naturalezza espressiva senza perdere fedeltà al grounding dati e allo schema JSON.
  - Testi di benvenuto, risposte di conferma/rifiuto attività e suggerimenti rapidi contestuali allineati al tono familiare e complice di nonno Arnaldo.

## 2026-09-25 - Fix Errore 400 su Apertura Popup Pianta (`getLastEventForPlant`)
- **Problema**: Cliccando su una pianta sulla mappa del terreno per aprire il popup/bottom sheet informativo, la console registrava `GET https://.../rest/v1/event_plants?... 400 (Bad Request)`.
- **Causa Radice**: In `CalendarService.getLastEventForPlant(plantId)`, la query Supabase includeva `.order('created_at', { ascending: false })` sulla tabella ponte `event_plants`. La tabella `event_plants` è una junction table pura composta unicamente da `(event_id, plant_id)` e priva della colonna `created_at`. Di conseguenza PostgREST falliva con Bad Request (`column created_at does not exist`).
- **Soluzione**: Rimosso l'ordinamento errato su `created_at` dalla query e applicato l'ordinamento decrescente in memoria sulla proprietà `start` degli eventi collegati (`events(*)`).

## 2026-09-28 - Motore Gesture Touch Premium per la Mappa del Terreno
- **Problema**: L'interazione touch su dispositivi mobili nella Mappa del Terreno risultava ingestibile:
  1. In modalità "Modifica Terreno", lo spostamento/pan della mappa a singolo tocco era disabilitato a livello logico (`interactionMode !== 'move'`), rendendo impossibile spostarsi nella mappa per raggiungere altre piante.
  2. Il pinch-to-zoom utilizzava il ridimensionamento DOM di `width` e `height` in percentuale e manipolava `scrollLeft`/`scrollTop`, provocando pesanti reflow e stuttering a ogni frame di tocco.
  3. Il pinch non supportava il pan simultaneo a due dita (se le dita traslavano insieme, la distanza non variava e il pan veniva scartato).
  4. Gli alberi avevano un touch target ridotto (20px), coperto dal pollice senza feedback visivo di sollevamento.
  5. Il drag & drop non forniva indicatore visivo preliminare di aggancio ai nodi del reticolo (snap feedback) né auto-pan ai bordi del viewport durante lo zoom.
- **Soluzione Implementata**:
  - **Accelerazione Hardware GPU**: Sostituito il layout basato su scroll e ridimensionamento DOM con `transform: translate3d(panX, panY, 0) scale(zoom)` con `will-change: transform`, azzerando i reflow durante i gesti touch.
  - **Pan e Zoom Simultanei e Multi-Touch**: Formula di coordinate esatta che gestisce simultaneamente variazione di scala e traslazione del centro focale tra due dita, con supporto completo per pan a singolo dito sul terreno in qualsiasi modalità operativa.
  - **Doppio Tocco (Double-Tap to Zoom)**: Supporto nativo al doppio tap (stile Google Maps / Apple Maps) per zoom rapido al 220% sul punto toccato o ripristino istantaneo al 100%.
  - **Controlli Fluttuanti Ergonomici**: Mini-toolbar verticale fluttuante in alto a destra sul canvas della mappa con pulsanti `+`, `% zoom live`, `−`, e `⛶ Adatta/Centra` con transizioni animate fluide (`cubic-bezier(0.2, 0, 0, 1)`).
  - **Drag & Drop Premium con Snap Indicator Magnetico**:
    - Touch target espanso (44-48px) con classe `touch-none`.
    - Badge visivo di presa attiva (`scale-125`, ombra profonda `shadow-2xl`, anello terracotta).
    - Guida visiva e cerchio bersaglio magnetico SVG in tempo reale sul nodo più vicino con distinzione di colore immediata (verde salvia per libero, rosso per occupato) e linea guida tratteggiata collegata.
    - **Edge Auto-Pan**: Se una pianta viene trascinata vicino al bordo del viewport mentre la mappa è ingrandita, la mappa scorre automaticamente in quella direzione consentendo lo spostamento libero attraverso l'intero terreno.
  - **Disambiguazione Pan vs Tap**: Prevenuta l'apertura accidentale di popup/bottom sheet o la selezione di piante durante le gesture di trascinamento e navigazione della mappa.



