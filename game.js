export default async function handler(req) {
  // Respuesta ultra simple para probar conexión
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const body = await req.json();
    
    // Si el sitio pide identificarse, le decimos que OK (Davo de prueba)
    if (body.action === 'identify') {
      return new Response(JSON.stringify({ 
        user: { id: '123', name: 'Davo Prueba', email: 'davo@prueba.com' } 
      }), { headers });
    }

    // Si el sitio avisa que leyó la nota, le decimos que ganó 30 XP
    if (body.action === 'noteRead') {
      return new Response(JSON.stringify({ 
        ok: true, xpGained: 30, streak: 1 
      }), { headers });
    }

    return new Response(JSON.stringify({ status: 'conectado' }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
