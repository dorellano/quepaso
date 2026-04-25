// api/game.js - Versión "Asado Imperial"
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SCRATCH_PRIZES = [
  { type: 'try_again', label: '¡Casi! Seguí buscando puntos 🔍', puntos: 10, weight: 60 },
  { type: 'puntos', label: '¡Sumaste +50 Puntos! 🚀', puntos: 50, weight: 30 },
  { type: 'asado', label: '¡CHANCE PARA EL ASADO! 🥩', puntos: 500, weight: 10 }
];

function pickPrize(pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return { ...p };
  }
  return { ...pool[0] };
}

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
      await sb('/note_reads', 'POST', { user_id: userId, note_id: noteId, note_title: noteTitle });
      const user = await sb(`/game_users?id=eq.${userId}&select=xp`);
      
      const prize = pickPrize(SCRATCH_PRIZES);
      const nuevosPuntos = (user[0]?.xp || 0) + 30 + (prize.puntos || 0);
      
      await sb(`/game_users?id=eq.${userId}`, 'PATCH', { xp: nuevosPuntos });

      return new Response(JSON.stringify({ 
        ok: true, 
        puntosGanados: 30 + (prize.puntos || 0), 
        totalPuntos: nuevosPuntos,
        prize 
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Accion desconocida' }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
