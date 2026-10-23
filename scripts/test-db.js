const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Imposta SUPABASE_URL e SUPABASE_ANON_KEY nelle variabili d'ambiente.");
  process.exit(1);
}

async function test() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/events?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('Status code:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
    if (res.status === 404 || text.includes('does not exist') || text.includes('relation "public.events" does not exist')) {
      console.log('RESULT: NOT_EXISTS');
    } else if (res.status >= 200 && res.status < 300) {
      console.log('RESULT: EXISTS');
    } else {
      console.log('RESULT: ERROR', res.status);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();
