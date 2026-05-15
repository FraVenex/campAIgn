# Regole di Utilizzo per l'IA

## Come scrivere i prossimi prompt
Per massimizzare l'efficacia di Antigravity in questo progetto:
1. **Riferimento ai File**: Includere sempre riferimenti ai file di contesto (`@docs/context/project-state.md`, `@GEMINI.md`).
2. **Singolo Obiettivo**: Ogni prompt deve avere un unico obiettivo chiaro e misurabile.
3. **Richiesta di Aggiornamento**: Chiedere esplicitamente all'IA di aggiornare `project-state.md` e `decisions.md` al termine del task.
4. **Verifica**: Chiedere sempre una conferma di avvenuta verifica (lint/build) prima di dichiarare il task chiuso.

## Scelta delle Skills
- Usare `write_to_file` e `replace_file_content` per modifiche puntuali.
- Usare `run_command` per setup, installazioni e test.
- Usare `list_dir` e `view_file` per recuperare il contesto prima di agire.
- Usare `antigravity-workflows` per processi complessi che richiedono più passaggi coordinati.

## Conservazione del Contesto
Non rompere mai il contesto. Se un task richiede una deviazione dalle regole in `GEMINI.md`, questa deve essere discussa e documentata in `decisions.md` prima dell'esecuzione.
