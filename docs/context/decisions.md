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

## 2026-10-23 - Architettura v2: sezioni operative e componenti condivisi
- **Decisione**: Riorganizzazione della web app in sezioni con sotto-menù: *Diario del contadino* (Home, Note), *Calendario*, *Terreno* (Mappa, Lista piante), *Manutenzioni e trattamenti* (Mappa, Registro interventi), *Raccolta* (Mappa, Archivio raccolta), *Contabilità*, *Meteo*, *Galleria*. La scheda pianta (`/land/plant/:id`) non è nel menù: si apre da popup mappa o lista piante.
- **Shell di routing**: tutte le pagine autenticate sono figlie di `AppShellComponent` (layout + `router-outlet`); le pagine non includono più `<app-layout>`. I vecchi percorsi `/dashboard` e `/archive` reindirizzano a `/journal/home` e `/operations/log`.
- **Mappa unica**: `app-farm-map` concentra gesture, modalità (visualizza/seleziona/sposta), selezione ad area, badge sui marker e gestione popup (ancorato su desktop, bottom sheet su mobile). Ogni pagina fornisce solo il contenuto del popup (`popupTemplate` + `app-plant-popup-card`).
- **Stato condiviso**: `FarmStore` (piante), `OperationsStore` (attività del calendario con stato operativo), `NotesService`, `HarvestService`, `ExpensesService`, `PhotosService` come store a signals: lista e mappe restano sincronizzate senza ricaricare.
- **Stato operativo degli interventi**: nuova colonna `events.work_status` (`todo`, `in_progress`, `done`, `skipped`); "in ritardo" è derivato (da svolgere con data passata). Il vecchio prefisso `[STATUS:completata]` nella descrizione viene letto come `done`.
- **Resilienza del database**: `TableRepository` usa Supabase e, se una tabella o colonna della migrazione v2 non esiste ancora, salva in locale (localStorage) senza bloccare l'utente. Lo stesso vale per le foto se lo Storage non è configurato.
- **Report**: il report di ogni raccolta è calcolato automaticamente (resa in olio, €/L, confronto 5 anni, voto) e salvato nella riga (`harvests.report`). I report (raccolta, contabilità, Arnaldo) si scaricano come HTML autonomo stampabile in PDF.
- **Arnaldo onnisciente**: il contesto inviato all'AI include pagina corrente (con descrizione), piante, interventi con stato, note, raccolte con report, contabilità, foto, meteo agronomico (ET0, VPD, suolo, finestre di trattamento, rischi) e fase stagionale; può restituire un `report` markdown scaricabile dalla chat.


## 2026-10-23 - UI kit unico e Arnaldo solo flottante
- **Decisione**: Introdotto un UI kit condiviso (classi in `src/styles.css`, regole in `docs/design/ui-kit.md`): pulsanti `btn` con tre gerarchie e testo in sentence case, `eyebrow`/`section-title` per le intestazioni, `kpi`, `filter-chip`, `segmented`, `camp-input-sm`, `dialog-footer`, `data-table`. Tutte le pagine e i componenti condivisi usano queste classi al posto di combinazioni Tailwind scritte a mano; solo palette `camp-*`.
- **Motivazione**: Le pagine nate in parallelo avevano pulsanti, titoli e colori diversi tra loro; serve coerenza visiva in tutta l'app.
- **Decisione**: Rimossi i pulsanti "Chiedi ad Arnaldo" dalle pagine: l'assistente è raggiungibile solo dal pulsante flottante, sempre presente e consapevole della pagina corrente.
- **Sicurezza**: la chiave Gemini vive solo nei secret della Edge Function `arnaldo`, che risponde unicamente a utenti autenticati.

## 2026-10-23 - Solo menù laterale, niente barra inferiore
- **Decisione**: Rimossa la bottom navigation mobile. Su telefono e tablet si naviga solo con il menù laterale a scomparsa (☰), che mostra sezioni e sotto-menù e si chiude da solo dopo la scelta o con Esc. Pannelli flottanti (popup mappa, barra selezione) e pulsante di Arnaldo ora poggiano sul fondo dello schermo.
- **Galleria**: contiene solo le foto generali dell'agricoltore; le foto delle piante vivono nella scheda pianta. Su dispositivi touch il caricamento offre "Scatta foto" (fotocamera) e "Dalla galleria" (selezione multipla) tramite `app-photo-picker`.
- **Reticolo mappa**: passo dimezzato (3% x 4%) per consentire file sfalsate; la distanza standard tra piante resta 6% x 8%.
