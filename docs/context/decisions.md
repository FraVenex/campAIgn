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

## 2026-05-22 - Spazio Mappa e Generazione Foto Aerea
- **Decisione**: Riservare lo spazio del contenitore della mappa 2D e strutturarlo con coordinate percentuali relative.
- **Motivazione**: Questo schema a percentuali (0-100%) garantisce la compatibilità con la futura funzionalità di generazione automatica del layout e posizionamento delle piante a partire da una fotografia aerea o ortofoto (permettendo di mappare i pixel dell'immagine a coordinate relative stabili).
