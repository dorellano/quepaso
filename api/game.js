// api/game.js - VERSIÓN FINAL CON SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL     = 'https://quepasariocuarto.com.ar';

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const { action, userId, email, name, noteId, noteTitle } = await req.json();

    if (action === 'identify') {
      const existing = await sb(`/game_users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (existing.length > 0) return new Response(JSON.stringify({ user: existing[0] }), { headers });
      const created = await sb('/game_users', 'POST', { email, name: name || email.split('@')[0] });
      return new Response(JSON.stringify({ user: created[0] }), { headers });
    }

    if (action === 'noteRead') {
      // AQUÍ: En la versión real, el código del juego (gameEngine.js) 
      // recibirá este OK y DEBERÍA disparar el modal de la raspadita.
      return new Response(JSON.stringify({ 
        ok: true, 
        xpGained: 30, 
        streak: 1,
        showScratch: true // Le avisamos al navegador que muestre el juego
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Accion desconocida' }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
