const supabaseUrl = 'https://rlixpechojwaxwazbxcq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsaXhwZWNob2p3YXh3YXpieGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzg3NTQsImV4cCI6MjA5MjM1NDc1NH0.HZmDXlzgeAyNXic5iO7paN98ffxjUAsRfPk8yjO8CZQ';

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
