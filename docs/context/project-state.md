# Stato del Progetto

## Data Ultimo Aggiornamento: 2026-05-14

## Stato Attuale
- **Design System**: Refactor completo. Rimozione DaisyUI, palette camp/ estesa con tokens semantici (ombre, radius, animazioni). Classi utility camp-* (input, btn, card, alert, glass).
- **Auth Flow**: Redesign completo Login/Register con glassmorphism, accessibilità (label+id, autocomplete, aria-label), redirect intelligente post-login basato su onboarding_completed.
- **Routing / State Machine**: Guard system riscritto — guestGuard (login/register), onboardingGuard, appGuard. Naming coerente, logica centralizzata senza ambiguità.
- **Onboarding**: Finalizzato con Step 3 per disposizione (Regolare/Irregolare), inserimento manuale piante e persistenza sulla tabella `farms`.
- **Dashboard**: Rinominata in `/dashboard`, aggiornata per visualizzare dati reali da `farms` con icone dinamiche e coordinate GPS.

## Cosa Esiste
- [x] Design system camp/ con Tailwind tokens e classi component-level
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
  - Modalità Modifica Layout con drag & drop reattivo e posizionamento libero (tra 5% e 95%).
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
- [ ] Diario delle attività agricole (miglioramento logica pianificazione interventi)
- [ ] Gestione profilo utente (impostazioni)

## Prossimo Step Consigliato
Raffinamento ed espansione del **Diario delle attività agricole** e storico interventi.
