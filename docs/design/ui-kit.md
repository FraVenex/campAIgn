# UI kit campAIgn

Regole uniche per tutte le pagine. Le classi sono definite in `src/styles.css` (sezione "UI kit condiviso").
Obiettivo: ogni pagina deve sembrare parte della stessa app. Se un elemento esiste nel kit, **non si ricrea a mano con classi Tailwind**.

## Struttura di una pagina

```html
<div class="max-w-7xl mx-auto animate-fade-in space-y-6">
  <app-page-header section="Sezione" title="Titolo pagina" description="Una riga che spiega a cosa serve." [tabs]="tabs">
    <ng-container actions>
      <button class="btn btn-secondary">Azione secondaria</button>
      <button class="btn btn-primary">Azione principale</button>
    </ng-container>
  </app-page-header>

  <!-- 1. KPI (facoltativi) -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3"> <div class="kpi">…</div> </div>

  <!-- 2. Contenuto in card -->
  <section class="camp-card card-body">
    <div class="section-head">
      <div><p class="eyebrow">Etichetta</p><h2 class="section-title">Titolo sezione</h2></div>
      <!-- azioni della sezione: btn-sm -->
    </div>
    …
  </section>
</div>
```

- Spaziatura verticale tra blocchi: `space-y-6` sul contenitore (non `mb-*` sparsi).
- Griglie: `gap-3` per KPI, `gap-5` tra card.
- Ordine: header → KPI → filtri → contenuto principale → contenuti secondari.

## Tipografia

| Uso | Classe |
|---|---|
| Titolo pagina | gestito da `app-page-header` (serif 3xl/4xl) |
| Titolo sezione / card | `section-title` (serif xl) dentro `h2` |
| Etichetta sopra un titolo o un valore | `eyebrow` |
| Testo secondario | `text-muted` |
| Valore numerico KPI | `kpi-value` |

Serif (Playfair) **solo** per titoli e valori KPI; tutto il resto è Inter. Niente `uppercase` fuori da `eyebrow`, `kpi-label`, intestazioni di tabella e chip.

## Pulsanti

| Gerarchia | Classe | Quando |
|---|---|---|
| Primario | `btn btn-primary` | una sola azione principale per area (header, footer dialog) |
| Secondario | `btn btn-secondary` | azioni alternative (esporta, modifica, annulla) |
| Terziario | `btn btn-ghost` | azioni leggere dentro liste o card |
| Distruttivo | `btn btn-danger` (conferma) / `btn btn-danger-soft` (avvio eliminazione) | eliminazioni |
| Piccolo | aggiungere `btn-sm` | azioni dentro card, righe, popup |
| Solo icona | `btn btn-ghost btn-icon` + `aria-label` | azioni di riga (modifica, elimina) |

- Testo in *sentence case* ("Nuova spesa", non "NUOVA SPESA"), niente emoji nei pulsanti con testo.
- Footer dei dialog: `<div footer class="dialog-footer">` con `btn btn-secondary` (Annulla) + `btn btn-primary` (azione).

## Filtri e selettori

- Filtri a scelta: `filter-chip` (+ `is-active`).
- Scelta tra viste (es. Esplora / Seleziona): `segmented` con `segmented-item` (+ `is-active`).
- Ricerca e select nei filtri: `camp-input-sm`. Nei form dei dialog: `camp-label` + `camp-input`.

## Card, KPI, tabelle, stati

- Card: `camp-card card-body`. Card annidate/riquadri informativi: `rounded-xl bg-camp-cream/50 border border-camp-sand/40 p-3`.
- KPI: `kpi` > `kpi-label` + `kpi-value` + `kpi-hint`. Se il KPI filtra la lista usare `<button class="kpi">` con `is-active`.
- Tabelle desktop: `data-table`; su mobile card (`md:hidden`).
- Stati (pianta, intervento, categorie): sempre `app-chip` con il `tone` da `core/constants/domain.ts`.
- Stato vuoto: `empty-state` > `empty-state-icon` + testo `text-muted` + eventuale `btn btn-primary btn-sm`.

## Colori

Solo la palette `camp-*` di `tailwind.config.js`. Significati fissi:
- sage = azione/primario · earth = testo e selezione attiva · olive = testo secondario
- success / amber / error = stati (ok / attenzione / problema) · terracotta = manutenzione
- I colori dei tipi di attività e delle categorie di spesa vengono da `EVENT_TYPE_META` / `EXPENSE_CATEGORY_META`.

Niente colori Tailwind generici (`bg-red-50`, `text-blue-800`, `bg-amber-600`…) né esadecimali sparsi nei template.

## Arnaldo

Arnaldo è sempre disponibile dal pulsante flottante in basso a destra: le pagine **non** aggiungono pulsanti "Chiedi ad Arnaldo".
