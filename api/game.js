// api/game.js - Motor de Búsqueda del Tesoro para Qué Pasa Río Cuarto
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;

// ─── Probabilidades del Tesoro (Pesos/Weights) ───
const SCRATCH_PRIZES = [
  // 60% de probabilidad: No hay tesoro físico
  { type: 'try_again', label: '¡Casi! Seguí buscando el tesoro 🔍', xp: 10, weight: 60 },
  
  // 30% de probabilidad: Premio de consuelo (Solo puntos)
  { type: 'xp', label: '¡No hay tesoro, pero sumaste +50 XP! 🚀', xp: 50, weight: 30 },
  
  // 10% de probabilidad: TESOROS REALES
  { type: 'coupon', label: '¡ENCONTRASTE UN CUPÓN! 🎁', xp: 100, weight: 8, code: () => 'TESORO15' },
  { type: 'sorteo', label: '¡PASE AL SORTEO SEMANAL! 🎟️', xp: 200, weight: 2 }
];

// Función para elegir premio basado en peso
function pickPrize(pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return { ...p };
  }
  return { ...pool[0] };
}

// Conexión con la base de datos de Qué Pasa Río Cuarto
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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Lógica principal
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

    // 1. Identificar al vecino de Río Cuarto
    if (action === 'identify') {
      const existing = await sb(`/game_users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (existing.length > 0) return new Response(JSON.stringify({ user: existing[0] }), { headers });
      const created = await sb('/game_users', 'POST', { email, name: name || email.split('@')[0] });
      return new Response(JSON.stringify({ user: created[0] }), { headers });
    }

    // 2. Al llegar al final de la nota (80% scroll)
    if (action === 'noteRead') {
      // Siempre sumamos los 30 XP base por informarse
      await sb('/note_reads', 'POST', { user_id: userId, note_id: noteId, note_title: noteTitle });
      const user = await sb(`/game_users?id=eq.${userId}&select=xp`);
      await sb(`/game_users?id=eq.${userId}`, 'PATCH', { xp: (user[0]?.xp || 0) + 30 });
      
      // Tiramos los dados para la Búsqueda del Tesoro
      const prize = pickPrize(SCRATCH_PRIZES);
      if (prize.code) prize.code = prize.code();

      // Guardamos el resultado en la tabla de premios
      await sb('/prizes', 'POST', { 
        user_id: userId, 
        type: prize.type, 
        label: prize.label, 
        code: prize.code || null,
        source: 'scratch'
      });

      // Si el premio tiene XP extra, lo sumamos
      if (prize.xp > 0) {
        await sb(`/game_users?id=eq.${userId}`, 'PATCH', { xp: (user[0]?.xp || 0) + 30 + prize.xp });
      }

      return new Response(JSON.stringify({ ok: true, xpGained: 30 + (prize.xp || 0), prize }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Accion desconocida' }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
