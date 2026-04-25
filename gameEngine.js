// gameEngine.js
// Copiá este archivo a tu web y llamá a las funciones desde tu CMS
//
// CONFIGURACIÓN: cambiá esta URL por la de tu Vercel
const API_URL = 'https://quepaso.vercel.app/api/game';

// ─── Estado local (caché entre llamadas) ────────────────────────────────────
let _user = null;

// ─── Llamar a la API ─────────────────────────────────────────────────────────
async function api(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// ─── FUNCIÓN 1: Identificar usuario ─────────────────────────────────────────
// Llamar al cargar la página si el usuario está logueado en tu web
// email: el email del usuario desde tu sistema de auth
// name: nombre visible (opcional)
export async function identifyUser(email, name) {
  const data = await api({ action: 'identify', email, name });
  _user = data.user;
  localStorage.setItem('gm_user', JSON.stringify(_user));
  return _user;
}

// Recuperar usuario del caché local sin llamar a la API
export function getCachedUser() {
  if (_user) return _user;
  try {
    const saved = localStorage.getItem('gm_user');
    if (saved) { _user = JSON.parse(saved); return _user; }
  } catch {}
  return null;
}

// ─── FUNCIÓN 2: Registrar que leyó una nota ──────────────────────────────────
// Llamar cuando el usuario scrolleó el 80% de un artículo
// noteId: ID único de la nota en tu CMS (ej: el slug)
// noteTitle: título visible
export async function onNoteRead(noteId, noteTitle) {
  const user = getCachedUser();
  if (!user) return null;

  const data = await api({
    action: 'noteRead',
    userId: user.id,
    noteId,
    noteTitle,
  });

  // Actualizar caché
  _user.xp += data.xpGained;
  _user.streak = data.streak;
  localStorage.setItem('gm_user', JSON.stringify(_user));

  return data; // { xpGained: 30, streak: N }
}

// ─── FUNCIÓN 3: Usar scratch card ────────────────────────────────────────────
// Llamar cuando el usuario confirma que quiere raspar
// noteId: la misma nota que activó la scratch card
export async function useScratchCard(noteId) {
  const user = getCachedUser();
  if (!user) return null;

  const data = await api({
    action: 'scratch',
    userId: user.id,
    noteId,
  });

  // data.prize = { type, label, code, xp }
  // El premio ya fue guardado en la DB y el email ya fue enviado
  return data.prize;
}

// ─── FUNCIÓN 4: Girar la ruleta ──────────────────────────────────────────────
// Llamar cuando el usuario presiona el botón de girar
export async function spinWheel() {
  const user = getCachedUser();
  if (!user) return null;

  const data = await api({ action: 'spin', userId: user.id });
  // data.prize = { type, label, code, xp }
  // data.segment = índice del segmento (0-7) donde debe "caer" la animación

  return data; // { prize, segment }
}

// ─── FUNCIÓN 5: Obtener estado completo ──────────────────────────────────────
// Llamar al iniciar la página del perfil / widget de juego
export async function getGameState() {
  const user = getCachedUser();
  if (!user) return null;

  const data = await api({ action: 'getState', userId: user.id });
  _user = data.user;
  localStorage.setItem('gm_user', JSON.stringify(_user));
  return data; // { user, prizes, readNotes, canSpin }
}

// ─── FUNCIÓN 6: Leaderboard ───────────────────────────────────────────────────
export async function getLeaderboard() {
  return api({ action: 'leaderboard' });
}

// ─── FUNCIÓN 7: Detectar scroll (pegar en tu template de notas) ─────────────
// Pegar esto en el <script> de cada página de nota:
//
//   import { initScrollTracker } from './gameEngine.js';
//   initScrollTracker('slug-de-la-nota', 'Título de la nota', (xpGained) => {
//     mostrarNotificacion(`¡+${xpGained} XP! Scratch card desbloqueada`);
//     mostrarScratchCard('slug-de-la-nota');
//   });
//
export function initScrollTracker(noteId, noteTitle, onComplete) {
  let fired = false;

  function checkScroll() {
    if (fired) return;
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const pct = scrolled / total;

    if (pct >= 0.8) {
      fired = true;
      window.removeEventListener('scroll', checkScroll);
      onNoteRead(noteId, noteTitle).then(result => {
        if (result) onComplete(result.xpGained, result.streak);
      });
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
}
