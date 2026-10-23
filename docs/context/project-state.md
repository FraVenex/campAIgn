# Stato del Progetto

## Data Ultimo Aggiornamento: 2026-10-23

## Stato Attuale
- **Architettura v2 (2026-10-23)**: app riorganizzata in sezioni con sotto-menù (vedi `docs/architecture/frontend-v2.md`):
  - *Diario del contadino*: Home (punto del giorno da storico + pianificazione + stagione + meteo, meteo agronomico di oggi, promemoria note, attività del giorno) e Note (bacheca post-it).
  - *Calendario* invariato (aggiunto il tipo "Trattamento").
  - *Terreno*: Mappa (stato piante, spostamento con snap, popup con nota rapida e cambio stato) e Lista piante (anagrafica con varietà/anno d'impianto, modifica, eliminazione, aggiunta che appare subito anche in mappa in basso a destra).
  - *Manutenzioni e trattamenti*: Mappa con selezione multipla/ad area, badge e legenda; Registro interventi con stati Da svolgere / In corso / Svolta / Saltata / In ritardo.
  - *Raccolta*: Mappa per programmare la raccolta (va nel calendario) e Archivio raccolte con report automatico (resa, €/L, confronto 5 anni) scaricabile.
  - *Contabilità*, *Meteo* (5 giorni + grandezze agronomiche), *Galleria* foto con didascalie.
  - *Scheda pianta*: anagrafica, salute, grafici agronomici, storico interventi, note, foto multiple con didascalie.
  - Componente mappa unico `app-farm-map` e store condivisi a signals; Arnaldo sempre presente, consapevole della pagina, con memoria di tutti i dati e report scaricabili dalla chat.
- **Mappa Terreno Touch Premium**: Riprogettazione radicale del motore di interazione della Mappa del Terreno: eliminati reflow DOM e scroll container lenti; introdotto rendering hardware-accelerato (`transform: translate3d + scale`), pinch-to-zoom multi-touch simultaneo con pan integrato, doppio tap per zoom/reset rapido, toolbar fluttuante ergonomica (+, zoom %, −, ⛶ centra), drag & drop piante con feedback visivo magnetico SVG in tempo reale (anelli di aggancio verde/rosso e linea guida) ed edge auto-pan per spostare gli ulivi attraverso l'intero appezzamento senza interruzioni.
- **Arnaldo AI Assistant**: Riprogettazione completa UI/UX e personalizzazione della voce: ora risponde con l'anima di **nonno Arnaldo**, un uomo saggio che ha lavorato tutta la vita con le mani nella terra, parla con gli ulivi e vuole tramandare la sua eredità rurale con calore e schiettezza, senza mai essere sdolcinato. Dialog modale moderno per mobile, avatar illustrato 512x512 ad alta risoluzione (`assets/Arnaldo.jpg`), temperatura aumentata a 0.4 per risposte più fluide e naturali e suggerimenti rapidi contestuali.
- **Calendario Mobile (UX Apple Calendar)**: Riprogettazione radicale dell'esperienza mobile del Calendario. Eliminata la griglia mensile compressa illeggibile; introdotto il pattern Mini-Mese touch-friendly (giorni circolari ergonomici, dot indicatori di eventi) abbinato all'Agenda del giorno selezionato subito sotto con card dettagliate e pulsante rapido `+ Aggiungi`.
- **Design System**: Refactor completo. Rimozione DaisyUI, palette camp/ estesa con tokens semantici (ombre, radius, animazioni). Classi utility camp-* (input, btn, card, alert, glass).
- **Responsive Mobile & Ergonomia**: Ottimizzazione completa per smartphone (Portrait e Landscape) e tablet. Safe areas (`env(safe-area-inset)`), menù laterale a scomparsa, disattivazione auto-zoom iOS Safari su input (<16px), touch target minimi (36-44px), modali e dialoghi standardizzati al centro dello schermo con margini d'aria e backdrop.
- **Auth Flow**: Redesign completo Login/Register con glassmorphism, accessibilità (label+id, autocomplete, aria-label), redirect intelligente post-login basato su onboarding_completed.
- **Routing / State Machine**: Guard system riscritto — guestGuard (login/register), onboardingGuard, appGuard. Naming coerente, logica centralizzata senza ambiguità.
- **Onboarding**: Finalizzato con Step 3 per disposizione (Regolare/Irregolare), inserimento manuale piante e persistenza sulla tabella `farms`.
- **Dashboard**: Rinominata in `/dashboard`, aggiornata per visualizzare dati reali da `farms` con icone dinamiche e coordinate GPS.

## Cosa Esiste
- [x] Design system camp/ con Tailwind tokens e classi component-level
- [x] Responsive Design Multi-Device (Mobile Portrait, Mobile Landscape, Tablet, Desktop)
  - Navigazione mobile tramite menù laterale a scomparsa (pulsante ☰ nell'header), chiuso automaticamente a ogni cambio pagina; nessuna barra inferiore
  - Supporto Notch / Home bar con `viewport-fit=cover` e classi `.pt-safe`, `.pb-safe`
  - Vista Calendario Mobile ergonomica: Mini-Mese circolare + Agenda giorno selezionato (stile Apple Calendar / Fantastical)
  - Vista Agenda nel Calendario per smartphone con card informative e filtri vista
  - Bottom Sheet reattivo per la pianta selezionata nella Mappa del Terreno
  - Card view verticale per l'Archivio Attività su schermi piccoli (in sostituzione di tabelle orizzontali)
  - Modali e dialoghi centrati normalmente a schermo (`CampDialogComponent`) sia su mobile che su desktop
  - Strip orizzontale scorrevole per le previsioni meteo 5 giorni
  - Arnaldo Assistant mobile dialog moderno e raffinato con avatar fotografico reale (`assets/Arnaldo.jpg`)
- [x] Auth: Login e Register con design premium e UX coerente
- [x] Guard system robusto a 3 livelli (guest, onboarding, app)
- [x] Onboarding multi-step con card selection, geolocalizzazione, range slider
- [x] Dashboard operativa con terreni reali e loading states
- [x] Weather: Pagina di dettaglio con previsioni a 7 giorni e parametri agricoli (ET0)
- [x] Arnaldo AI: Supporto per consigli contestuali (mode weather)
- [x] AuthService con displayName, fetch profilo post-login, PKCE flow
- [x] LandService per persistenza terreno (migrato a tabella `farms`)
- [x] Schema database `profiles` + `farms`
- [x] **Mappa del Terreno**: Visualizzazione 2D interattiva delle piante con sfondo a parcelle, icone ad albero e tooltip intelligenti.
- [x] **Dettaglio Pianta**: Route dedicata `/land/plant/:id` con informazioni dettagliate e consigli di Arnaldo per singola pianta.
- [x] **Slice B - Gestione Layout e Piante**:
  - Modalità Modifica Layout con drag & drop reattivo e posizionamento libero (tra 5% e 95%) con snap geometrico e reticolo visibile durante l'editing.
  - Mutua esclusione rigorosa tra "Seleziona Piante", "Modifica Terreno" e "Aggiungi Piante" nella toolbar.
  - Rimozione pulsanti zoom fisici (+ e -) ridondanti a favore delle gesture native (pinch-to-zoom touch e rotella mouse).
  - Coordinamento visibilità FAB Arnaldo AI durante selezioni/modifiche per azzerare qualsiasi sovrapposizione visiva.
  - Barra azioni selezione mobile ancorata a filo fondo schermo (`bottom-0 z-40 pb-safe`) con Bottom Sheet dedicato per le azioni bulk, garantendo visuale totale e libera sul terreno.
  - Inserimento di nuove piante singole (con nome, specie e stato) o multiple (con generazione automatica e posizionamento).
  - Selezione singola e multipla reattiva (con anelli di selezione grafici).
  - Azioni di gruppo (bulk actions) per eliminazione bulk e pianificazione attività (trattamento, manutenzione) con persistenza sul calendario e tabelle relazionali Supabase (`event_plants`).
  - Stato di salute bulk integrato per modificare lo stato di salute di più piante contemporaneamente.
- [x] **Sviluppi Recenti**
  - **Meteo Detail**: Implementata la pagina `/meteo` con layout premium e glassmorphism.
    - Fetch dati agricoli (evapotraspirazione, temperatura suolo) da Open-Meteo.
    - Previsioni estese a 7 giorni con visualizzazione grafica.
    - Arnaldo contestuale che fornisce avvisi su pioggia e vento forte per l'agricoltura.
  - **Dashboard Refactoring**: Ottimizzato il layout per simmetria e densità informativa.
    - Card `Arnaldo` trasformata in banner intelligente superiore.
    - Card `Meteo` unificata (Oggi + Forecast 3 giorni) e centrata, con link al dettaglio.
    - Card `Terreno` e `Calendario` trasformate in entry points navigabili.
  - **Navigazione**: Implementata la logica di navigazione (`routerLink`) su tutte le card principali verso `/land`, `/meteo`, `/calendar`.

## Cosa Manca
- [ ] Applicare su Supabase la migrazione `20261023_architecture_v2.sql` (fino ad allora note, raccolte, spese e stato interventi sono salvati in locale sul dispositivo)
- [ ] Ridistribuire la Edge Function `arnaldo` (nuovo prompt con report e contesto esteso)
- [ ] Supabase Storage bucket `plant-photos` e tabella `plant_photos` in produzione (le foto restano in locale finché mancano)
- [ ] Gestione profilo utente (impostazioni)

## Prossimo Step Consigliato
Applicare la migrazione v2 e ridistribuire la Edge Function `arnaldo`, poi migrare i dati salvati in locale.
