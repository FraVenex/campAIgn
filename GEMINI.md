# campAIgn - Regole Globali di Progetto

## Descrizione del Progetto
**campAIgn** è una web application progettata per utenti non tecnici (piccoli proprietari terrieri, hobbisti dell'agricoltura) che gestiscono piccoli appezzamenti di terreno e piante, con un focus particolare sugli ulivi. L'app funge da assistente intelligente per la cura e la manutenzione del terreno.

## Obiettivo del Prodotto
Rendere la gestione di un piccolo uliveto semplice, data-driven e accessibile a chiunque, eliminando la complessità della pianificazione agricola manuale grazie all'intelligenza artificiale.

## Target Utenti
- Piccoli proprietari terrieri.
- Agricoltori amatoriali.
- Persone non tecniche che cercano una guida chiara e visiva.

## Stack Tecnologico (Ad alto livello)
- **Frontend**: Next.js (App Router), Tailwind CSS.
- **Design System**: shadcn/ui.
- **Backend/Database**: Supabase.
- **AI**: Google Gemini (tramite Antigravity/Arnaldo).

## Regole di Esecuzione per Antigravity
Per garantire la stabilità e la qualità del progetto, ogni interazione con Antigravity deve seguire queste regole:

1. **Step Piccoli e Atomici**: Ogni task deve essere eseguito in passaggi minimi. Mai generalizzare o implementare intere feature in un unico prompt.
2. **Creazione Diretta**: Creare file e cartelle non appena richiesto, senza attendere conferme multiple se lo scope è chiaro.
3. **Persistenza del Contesto**: Ogni decisione, cambiamento di stato o scoperta deve essere salvata nei file di documentazione in `./docs/context/`.
4. **Coerenza Visiva e Naming**: Rispettare rigorosamente il design system (beige/salvia/agricolo) e le convenzioni di naming (English per il codice, Italiano per la documentazione/UI).
5. **Nessun Mega Prompt**: Evitare prompt che richiedono implementazioni massive fuori scope. Se un task è complesso, dividerlo.
6. **Verifica Continua**: Ogni step deve essere verificato (linting, build, test) prima di essere considerato concluso.

## Arnaldo: L'Anima dell'App
Arnaldo non è solo un chatbot; è un assistente contestuale presente in ogni pagina, che conosce lo stato del terreno e fornisce consigli proattivi.
