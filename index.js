// index.js
// Este archivo le dice a Vercel que el proyecto existe.
// No hace nada especial — toda la lógica está en /api/game.js

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor de gamificación activo',
    endpoints: {
      game: '/api/game'
    }
  });
}
