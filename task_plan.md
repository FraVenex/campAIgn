# Task: Implementazione Dashboard Slice 1

## Obiettivo
Implementare la dashboard iniziale di campAIgn con integrazione meteo, sommario terreno, calendario settimanale e card Arnaldo.

## Fasi
- [x] **Fase 1: Preparazione e Servizi**
    - [x] Creazione `WeatherService` per Open-Meteo
    - [x] Abilitazione `HttpClient` in `app.config.ts`
- [x] **Fase 2: Componenti Dashboard**
    - [x] Creazione `FarmSummaryComponent`
    - [x] Creazione `WeatherCardComponent` (oggi + forecast)
    - [x] Creazione `CalendarStripComponent`
    - [x] Creazione `ArnaldoCardComponent`
- [x] **Fase 3: Layout e Navigazione**
    - [x] Creazione `AppLayoutComponent` (Sidebar/Header)
    - [x] Integrazione dei componenti nella `DashboardComponent`
- [x] **Fase 4: Rifinitura e Test**
    - [x] Verifica compilazione TypeScript
    - [/] Verifica responsive (mobile-first)
    - [/] Test manuali finali

## Note
- Usare Open-Meteo (senza API key).
- Palette: beige, sage, olive, earth.
- Arnaldo card: rule-based placeholder per ora.
