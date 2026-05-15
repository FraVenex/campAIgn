# Workflow: Bootstrap dei Task Futuri

Questo workflow definisce come Antigravity deve approcciare ogni nuovo task nel progetto campAIgn.

## Step Operativi

### 1. Re-Ingestione del Contesto
Prima di scrivere qualsiasi file, l'agente deve:
- Leggere `GEMINI.md` per le regole globali.
- Leggere `docs/context/project-state.md` per capire il punto esatto in cui si trova il progetto.
- Leggere `docs/context/backlog.md` per confermare la priorità del task richiesto.

### 2. Esecuzione Mirata
- Eseguire **solo** il task richiesto dall'utente.
- Se il task richiede modifiche non previste o allargamenti di scope, l'agente deve fermarsi e chiedere conferma.
- Non creare file "segnaposto" o codice generico.

### 3. Allineamento Design
- Ogni elemento UI deve essere verificato contro `docs/design/design-direction.md`.
- I colori e i font devono essere quelli definiti nei token di progetto.

### 4. Conclusione e Persistenza
Alla fine di ogni sessione o task:
- Aggiornare lo stato in `docs/context/project-state.md`.
- Documentare eventuali nuove decisioni tecniche in `docs/context/decisions.md`.
- Semplificare o spezzare i task rimanenti nel `backlog.md` se necessario.
- Eseguire `verification-before-completion` per garantire che il lavoro sia solido.
