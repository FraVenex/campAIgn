# Architettura frontend v2

## Navigazione (route)

| Sezione | Route | Pagina |
|---|---|---|
| Diario del contadino | `/journal/home` | Home: punto del giorno, meteo agronomico, promemoria note, attività di oggi |
| | `/journal/notes` | Bacheca note (post-it) |
| Calendario | `/calendar` | Calendario attività (invariato) |
| Terreno | `/land/map` | Mappa: stato piante, spostamento, popup con nota rapida |
| | `/land/plants` | Lista piante: anagrafica, modifica, eliminazione, aggiunta |
| | `/land/plant/:id` | Scheda pianta (solo da popup mappa o lista) |
| Manutenzioni e trattamenti | `/operations/map` | Mappa con selezione multipla e assegnazione interventi |
| | `/operations/log` | Registro interventi con stato (da svolgere, in corso, svolta, saltata, in ritardo) |
| Raccolta | `/harvest/map` | Mappa per programmare la raccolta (finisce nel calendario) |
| | `/harvest/archive` | Archivio raccolte con report automatico scaricabile |
| Contabilità | `/accounting` | Spese |
| Meteo | `/meteo` | Previsioni 5 giorni e grandezze agronomiche |
| Galleria | `/gallery` | Foto generali dell'agricoltore con didascalie (le foto delle piante sono nella scheda pianta) |

Tutte le pagine autenticate sono figlie di `AppShellComponent` (layout + `<router-outlet>`), quindi **le pagine non usano più `<app-layout>`**.

## Stato condiviso (`src/app/core/services`)

- `FarmStore` – terreno e piante (signals). Unica fonte di verità per mappe e lista: `ensureLoaded()`, `plants()`, `farm()`, `healthStats()`, `getPlant(id)`, `addPlants()` (posiziona in basso a destra), `updatePlant()`, `updatePlants()`, `movePlant()`, `alignAll()`, `deletePlants()`.
- `OperationsStore` – attività del calendario (trattamenti, manutenzioni, irrigazioni, raccolte): `load()`, `events()`, `sorted()`, `today()`, `upcoming()`, `openByPlant()`, `effectiveStatus(e)` (calcola "in ritardo"), `forPlant(id, types?)`, `lastDoneForPlant()`, `create()`, `update()`, `setWorkStatus()`, `remove()`.
- `NotesService` – note generali e per pianta: `load()`, `generalNotes()`, `plantNotes()`, `reminders()`, `forPlant(id)`, `add()`, `update()`, `remove()`.
- `HarvestService` – raccolte con report (`computeReport`, `yearlyComparison`).
- `ExpensesService` – contabilità.
- `PhotosService` – foto di piante e galleria (Supabase Storage con fallback locale).
- `ToastService` – notifiche globali.
- `ReportExportService` – export HTML/PDF di report (`download`, `print`, `barChartSvg`, `markdownToHtml`).
- `ArnaldoService` – assistente AI (chat flottante sempre presente, consapevole della pagina).
- `TableRepository` – CRUD generico con fallback locale se la tabella/colonna non esiste ancora su Supabase.

## Componenti condivisi (`src/app/shared/components`)

- `app-farm-map` – **unico componente mappa**: gesture, modalità `view | select | move`, selezione ad area, badge sui marker, popup ancorato (desktop) o bottom sheet (mobile) con contenuto fornito dalla pagina via `popupTemplate`.
- `app-plant-popup-card` + `app-popup-row` – struttura comune del popup (intestazione, nota rapida, link alla scheda).
- `app-page-header` – titolo pagina + sotto-menù a tab della sezione.
- `app-selection-bar` – barra azioni per piante selezionate.
- `app-photo-picker` – "Scatta foto" (fotocamera) + "Dalla galleria" (multipla) su telefono/tablet, "Carica foto" su computer.
- `app-plant-form-dialog`, `app-operation-form-dialog`, `app-confirm-dialog`, `app-quick-note`, `app-chip`, `app-toast-host`.

## Costanti e utility (`src/app/core/constants`, `src/app/core/utils`)

- `domain.ts` – stati pianta, tipi attività, stati lavoro, categorie spese, colori note, formattazioni.
- `navigation.ts` – sezioni del menù e tab dei sotto-menù.
- `farm-grid.ts` – reticolo della mappa e posizionamento.
- `agronomy.ts` – lettura meteo agronomica (`daySnapshot`, `sprayWindow`, `agronomicRisks`, `oliveSeasonPhase`, `weatherCodeInfo`).
- `operation-details.ts` – prodotto/dose nella descrizione degli eventi, helper date.

## Database

Migrazione `supabase/migrations/20261023_architecture_v2.sql`: tabelle `notes`, `harvests`, `expenses`; colonne `plants.variety/planting_year/description`, `events.work_status`; `plant_photos.plant_id` opzionale. Finché non è applicata, i dati nuovi vengono salvati in locale (localStorage).
