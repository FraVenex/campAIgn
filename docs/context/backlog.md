# Backlog di Progetto

## Priorità 1: Fondamenta
- [x] Inizializzazione del progetto Angular 17.3.
- [x] Configurazione Tailwind CSS con palette campAIgn (Beige/Salvia/Terra).
- [x] Setup daisyUI con tema personalizzato.
- [x] Creazione ossatura routing e placeholder features.

## Priorità 2: Infrastruttura e Auth
- [x] Setup di Supabase (Project SDK, environment variables logic).
- [x] Implementazione pagine Auth (Login, Signup) con design premium e reattivo.
- [x] Raffinamento schema database: Profili utente (`public.profiles`) e trigger.
- [x] Protezione rotte tramite AuthGuard.

## Priorità 3: Onboarding e Core
- [x] Definizione schema database per Terreni (`public.farms`).
- [x] Sviluppo del flusso di onboarding multi-step finalizzato (Step 3: Disposizione).
- [x] Implementazione OnboardingGuard per il gating applicativo (redirect a `/dashboard`).
- [x] Dashboard operativa con sincronizzazione dati reali.
- [ ] Visualizzazione Terreno (Mappa interattiva / Grid View).
- [ ] Mappatura singola pianta (Posizionamento drag & drop).
- [ ] Integrazione Meteo (Open-Meteo API) basata su coordinate terreno.

## Priorità 4: Arnaldo AI
- [ ] Setup client Gemini.
- [ ] Implementazione assistente contestuale in Dashboard.
- [ ] Logica di prompt per consigli agronomici basati sul meteo.
