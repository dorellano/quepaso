// api/game.js - Versión "CORS Blindado"
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const SITE_URL     = process.env.SITE_URL || 'https://quepasariocuarto.com.ar';

// --- Premios ---
const SCRATCH_PRIZES = [{ type: 'xp', label: '+100 XP', xp: 100, weight: 100 }];
const WHEEL_PRIZES = [{ type: 'xp', label: '+50 XP', xp: 50, weight: 100 }];

function pickPrize(pool) { return { ...pool[0] }; }

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
  // Estos son los permisos que necesita tu WordPress
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const body = await req.json();
    const { action, email, name, noteId, noteTitle } = body;

    if (action === 'identify') {
      const existing = await sb(`/game_users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (existing.length > 0) return new Response(JSON.stringify({ user: existing[0] }), { headers });
      const created = await sb('/game_users', 'POST', { email, name });
      return new Response(JSON.stringify({ user: created[0] }), { headers });
    }

    if (action === 'noteRead') {
        // Por ahora devolvemos éxito para probar el cartel
        return new Response(JSON.stringify({ ok: true, xpGained: 30, streak: 1 }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Accion no encontrada' }), { status: 400, headers });

  } catch (err) {
    // Si hay un error, TAMBIÉN mandamos los permisos para que no salte el error de CORS
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
