// api/game.js
// Vercel Edge Function — el árbitro de todos los premios
// Deploy: subir a /api/game.js en tu repo de Vercel

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role, no anon
const RESEND_KEY   = process.env.RESEND_API_KEY;
const SITE_URL     = process.env.SITE_URL || 'https://quepasariocuarto.com.ar';

// ─── Probabilidades de premios (configuralas como quieras) ───────────────────
const SCRATCH_PRIZES = [
  { type: 'xp',     label: '+100 XP',        xp: 100, weight: 28 },
  { type: 'xp',     label: '+50 XP',         xp: 50,  weight: 22 },
  { type: 'xp',     label: '+25 XP',         xp: 25,  weight: 20 },
  { type: 'coupon', label: '10% OFF',         xp: 0,   weight: 15, code: () => 'LECTOR10' },
  { type: 'coupon', label: '20% OFF',         xp: 0,   weight: 10, code: () => 'LECTOR20' },
  { type: 'sorteo', label: 'Sorteo semanal',  xp: 0,   weight: 4  },
  { type: 'vip',    label: 'Acceso VIP 7d',   xp: 0,   weight: 1  },
];

const WHEEL_PRIZES = [
  { type: 'xp',     label: '+50 XP',         xp: 50,  weight: 25 },
  { type: 'xp',     label: '+100 XP',        xp: 100, weight: 18 },
  { type: 'xp',     label: '+200 XP',        xp: 200, weight: 8  },
  { type: 'coupon', label: '10% OFF',         xp: 0,   weight: 18, code: () => 'RUEDA10' },
  { type: 'coupon', label: '25% OFF',         xp: 0,   weight: 12, code: () => 'RUEDA25' },
  { type: 'coupon', label: '50% OFF',         xp: 0,   weight: 5,  code: () => 'RUEDA50' },
  { type: 'sorteo', label: 'Sorteo semanal',  xp: 0,   weight: 10 },
  { type: 'vip',    label: 'Acceso VIP 7d',   xp: 0,   weight: 4  },
];

// ─── Helper: elegir premio según pesos ──────────────────────────────────────
function pickPrize(pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return { ...p };
  }
  return { ...pool[0] };
}

// ─── Helper: llamar a Supabase ───────────────────────────────────────────────
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  return res.json();
}

// ─── Helper: mandar email con Resend ────────────────────────────────────────
async function sendPrizeEmail(email, name, prize) {
  if (!RESEND_KEY) return; 

  const subjects = {
    coupon: `¡Ganaste ${prize.label} en ${SITE_URL}!`,
    vip:    `¡Activaste tu acceso VIP!`,
    sorteo: `¡Entraste al sorteo semanal!`,
    xp:     `¡Ganaste ${prize.label}!`,
  };

  const bodies = {
    coupon: `
      <h2>¡Felicitaciones ${name}!</h2>
      <p>Ganaste un descuento de <strong>${prize.label}</strong>.</p>
      <p style="font-size:24px;font-weight:bold;background:#f0f0f0;padding:16px;text-align:center;border-radius:8px">
        ${prize.code}
      </p>
      <p>Usalo en tu próxima compra en <a href="${SITE_URL}">${SITE_URL}</a></p>
    `,
    vip: `
      <h2>¡Acceso VIP activado, ${name}!</h2>
      <p>Tenés 7 días de contenido premium desbloqueado.</p>
    `,
    sorteo: `
      <h2>¡${name}, entraste al sorteo!</h2>
      <p>Participás del sorteo semanal. El ganador se anuncia el viernes.</p>
    `,
    xp: `
      <h2>¡${name}, ganaste ${prize.label}!</h2>
      <p>Tus puntos fueron sumados a tu perfil automáticamente.</p>
    `,
  };

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Qué Pasa Río Cuarto <premios@quepasariocuarto.com.ar>`,
      to: email,
      subject: subjects[prize.type] || '¡Ganaste un premio!',
      html: bodies[prize.type] || `<p>Ganaste: ${prize.label}</p>`,
    }),
  });
}

// ─── Handler principal ───────────────────────────────────────────────────────
export default async function handler(req) {
  // CONFIGURACIÓN DE CORS PARA QUE TU WORDPRESS PUEDA ENTRAR
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { action, userId, email, name, noteId, noteTitle } = await req.json();

    if (action === 'identify') {
      const existing = await sb(`/game_users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (existing.length > 0) {
        return new Response(JSON.stringify({ user: existing[0] }), { headers });
      }
      const created = await sb('/game_users', 'POST', { email, name: name || email.split('@')[0] });
      return new Response(JSON.stringify({ user: created[0] }), { headers });
    }

    if (action === 'noteRead') {
      await sb('/note_reads', 'POST', {
        user_id: userId,
        note_id: noteId,
        note_title: noteTitle,
      });

      const user = await sb(`/game_users?id=eq.${userId}&select=*`);
      const u = user[0];
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = u.streak || 0;
      if (u.last_active === yesterday) newStreak += 1;
      else if (u.last_active !== today) newStreak = 1;

      await sb(`/game_users?id=eq.${userId}`, 'PATCH', {
        last_active: today,
        streak: newStreak,
        xp: (u.xp || 0) + 30,
      });

      return new Response(JSON.stringify({ ok: true, xpGained: 30, streak: newStreak }), { headers });
    }

    if (action === 'scratch') {
      const reads = await sb(`/note_reads?user_id=eq.${userId}&note_id=eq.${noteId}&select=*`);
      if (reads.length === 0 || reads[0].scratch_used) {
        return new Response(JSON.stringify({ error: 'No permitido' }), { status: 400, headers });
      }

      const prize = pickPrize(SCRATCH_PRIZES);
      if (prize.code) prize.code = prize.code();

      const saved = await sb('/prizes', 'POST', {
        user_id: userId,
        type: prize.type,
        label: prize.label,
        code: prize.code || null,
        source: 'scratch',
      });

      await sb(`/note_reads?user_id=eq.${userId}&note_id=eq.${noteId}`, 'PATCH', { scratch_used: true });

      if (prize.xp > 0) {
        const user = await sb(`/game_users?id=eq.${userId}&select=xp`);
        await sb(`/game_users?id=eq.${userId}`, 'PATCH', { xp: (user[0]?.xp || 0) + prize.xp });
      }

      const userInfo = await sb(`/game_users?id=eq.${userId}&select=email,name`);
      await sendPrizeEmail(userInfo[0].email, userInfo[0].name, prize);

      return new Response(JSON.stringify({ prize }), { headers });
    }

    if (action === 'spin') {
      const today = new Date().toISOString().split('T')[0];
      const spins = await sb(`/wheel_spins?user_id=eq.${userId}&spin_date=eq.${today}&select=*`);
      if (spins.length > 0) {
        return new Response(JSON.stringify({ error: 'Ya giraste hoy' }), { status: 400, headers });
      }

      const prize = pickPrize(WHEEL_PRIZES);
      if (prize.code) prize.code = prize.code();

      const saved = await sb('/prizes', 'POST', {
        user_id: userId,
        type: prize.type,
        label: prize.label,
        code: prize.code || null,
        source: 'wheel',
      });

      await sb('/wheel_spins', 'POST', { user_id: userId, spin_date: today, prize_id: saved[0].id });

      const userInfo = await sb(`/game_users?id=eq.${userId}&select=email,name`);
      await sendPrizeEmail(userInfo[0].email, userInfo[0].name, prize);

      const segmentMap = { '+50 XP': 0, 'Sorteo semanal': 1, '25% OFF': 2, '+100 XP': 3, 'Acceso VIP 7d': 4, '+200 XP': 5, 'Sorteo semanal+': 6, '50% OFF': 7 };
      const segment = segmentMap[prize.label] ?? Math.floor(Math.random() * 8);

      return new Response(JSON.stringify({ prize, segment }), { headers });
    }

    if (action === 'getState') {
      const [user, prizes, reads, spins] = await Promise.all([
        sb(`/game_users?id=eq.${userId}&select=*`),
        sb(`/prizes?user_id=eq.${userId}&select=*&order=created_at.desc&limit=20`),
        sb(`/note_reads?user_id=eq.${userId}&select=note_id,scratch_used`),
        sb(`/wheel_spins?user_id=eq.${userId}&spin_date=eq.${new Date().toISOString().split('T')[0]}&select=id`),
      ]);
      return new Response(JSON.stringify({ user: user[0], prizes, readNotes: reads, canSpin: spins.length === 0 }), { headers });
    }

    if (action === 'leaderboard') {
      const rows = await sb('/leaderboard_weekly?select=*&limit=10');
      return new Response(JSON.stringify({ rows }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Acción desconocida' }), { status: 400, headers });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
