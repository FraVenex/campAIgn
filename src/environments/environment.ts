// Valori pubblici: la chiave anon di Supabase è pensata per il browser ed è protetta dalle policy RLS.
// Non inserire qui chiavi segrete (es. Gemini): vanno nei secret della Edge Function `arnaldo`.
export const environment = {
	production: false,
	supabaseUrl: "https://rlixpechojwaxwazbxcq.supabase.co",
	supabaseKey:
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsaXhwZWNob2p3YXh3YXpieGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzg3NTQsImV4cCI6MjA5MjM1NDc1NH0.HZmDXlzgeAyNXic5iO7paN98ffxjUAsRfPk8yjO8CZQ"
};
