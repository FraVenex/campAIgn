# Findings - Dashboard Slice 1

## Stato Iniziale
- Esiste già una `DashboardComponent` di base in `src/app/features/dashboard/`.
- La dashboard attuale mostra solo una lista di terreni (`farms`) e due card placeholder per Meteo e Arnaldo.
- `AuthService` e `LandService` sono operativi.
- Il sistema di guardie è a posto.

## Open-Meteo Integration
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Parametri richiesti:
    - `latitude`, `longitude` (da Supabase `farms`)
    - `current`: `temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`
    - `daily`: `temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`
    - `timezone`: `auto`

## Database Schema
- Tabella `farms`: `name`, `main_crop`, `latitude`, `longitude`, `plants_count`, `layout_type`.
- Tabella `profiles`: `onboarding_completed`.

## Design
- Palette camp/* definita in `tailwind.config.js`.
- Font: Playfair Display (serif) e Inter (sans).
